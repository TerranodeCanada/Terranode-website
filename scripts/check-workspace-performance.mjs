import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=new URL('../workspace-app/',import.meta.url);
const source=name=>readFileSync(new URL(name,app),'utf8');
const config={owner:'info@terranode.ca',...Object.fromEntries(['hub','projects','intake','sourceParent','contactSheet','sourceSheet','companySheet','clientResponses','vendorResponses','clientForm','vendorForm'].map(key=>[key,'isolated-test']))};
let visitor=config.owner,clock=0,serial=0,builds=0;
const properties=new Map([['TERRANODE_CONFIG',JSON.stringify(config)]]),cache=new Map();
const server=vm.createContext({
  Session:{getEffectiveUser:()=>({getEmail:()=>config.owner}),getActiveUser:()=>({getEmail:()=>visitor}),getScriptTimeZone:()=> 'America/Toronto'},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key),setProperty:(key,value)=>properties.set(key,value)})},
  CacheService:{getScriptCache:()=>({get:key=>{const hit=cache.get(key);return hit&&hit.expires>clock?hit.value:null;},put:(key,value,seconds)=>cache.set(key,{value,expires:clock+seconds*1000}),remove:key=>cache.delete(key)})},
  Utilities:{getUuid:()=>String(++serial),newBlob:value=>({getBytes:()=>Buffer.from(value)}),formatDate:()=> '2026-10-18'},
});
new vm.Script(source('Code.gs')).runInContext(server);
new vm.Script(source('Expenses.gs')).runInContext(server);
const fixture=()=>({records:[],activity:[],options:{},projectDirectory:[],mediaDirectory:[],hubUrl:'https://example.test'});
server.buildOperationsSnapshot_=()=>{builds++;return fixture();};
const run=code=>vm.runInContext(code,server);
run('getOperationsState({},0)');run("getOperationsState({query:'different'},0)");
assert.equal(builds,1,'searches reuse the underlying snapshot');
run('getOperationsState({},0,true)');assert.equal(builds,2,'explicit Refresh bypasses the cache');
run('invalidateWorkspaceSnapshots_()');run('getOperationsState({},0)');assert.equal(builds,3,'saved writes invalidate snapshots');
clock+=31000;run('getOperationsState({},0)');assert.equal(builds,4,'external changes become eligible after the short TTL');
for(const account of ['','dp@terranode.ca','ms@terranode.ca','someone@example.test']){
  visitor=account;
  for(const endpoint of ['getOperationsState({},0)','getWorkspaceDirectory()','getState()','getExpenseFilingState()'])assert.throws(()=>run(endpoint),/limited to info/,'even cached endpoints enforce owner access');
}
visitor=config.owner;
let raced=false;
server.buildOperationsSnapshot_=()=>{builds++;if(!raced){raced=true;run('invalidateWorkspaceSnapshots_()');}return fixture();};
run('invalidateWorkspaceSnapshots_()');const before=builds;run('getOperationsState({},0)');run('getOperationsState({},0)');
assert.equal(builds,before+2,'a read racing a save cannot repopulate the new revision');
server.CacheService={getScriptCache:()=>{throw new Error('cache unavailable');}};
assert.doesNotThrow(()=>run('getOperationsState({},0)'),'cache failure falls back to a normal read');
server.sheets_=()=>({contacts:{},sources:{},companies:{}});server.rows_=()=>[];server.companyProjects_=()=>({});
server.DriveApp=new Proxy({},{get(){throw new Error('startup must not access Drive');}});
assert.equal(run('getState().directoryLoaded'),false,'initial Contacts has no Drive dependency');
// The Contacts read is reused by Operations without repeating the three contact-register reads.
server.CacheService={getScriptCache:()=>({get:key=>cache.get(key)?.value,put:(key,value)=>cache.set(key,{value})})};
let contactReads=0;
server.rows_=()=>{contactReads++;return [];};
run('invalidateWorkspaceSnapshots_();getState(true)');const initialReads=contactReads;
run('contactSnapshot_()');assert.equal(contactReads,initialReads,'Operations reuses freshly loaded contact data');
run('contactSnapshot_(true)');assert.equal(contactReads,initialReads*2,'forced Operations Refresh also refreshes contacts');


const requests=[],elements=new Map(),timers=[];
const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:false,setAttribute(){},classList:{toggle(){}},focus(){}});return elements.get(id);};
const client=vm.createContext({
  console,Promise,Date,Set,Map,
  setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
  document:{getElementById:element,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},
  window:{crypto:{randomUUID:()=> 'test-request'}},
  google:{script:{get run(){let ok,fail;return new Proxy({withSuccessHandler(fn){ok=fn;return this;},withFailureHandler(fn){fail=fn;return this;}},{get(target,key){return key in target?target[key]:(...args)=>requests.push({name:key,args,ok,fail});}});}}},
});
for(const name of ['WorkspaceClient1.html','WorkspaceClient11.html','WorkspaceExpenses.html'])new vm.Script(source(name).replace(/^<script>\s*/,'').replace(/\s*<\/script>\s*$/,''),{filename:name}).runInContext(client);
const ui=code=>vm.runInContext(code,client);
assert.equal((source('Index.html').match(/refresh\(false\)/g)||[]).length,1,'only the shell starts the initial cached read');
const p1=ui('loadOperations(true)');ui("opsFilters.query='first';loadOperations(true)");ui("opsFilters.query='latest';loadOperations(true)");
assert.equal(requests.length,1,'rapid searches do not create parallel server work');
requests[0].ok({...fixture(),updatedAt:new Date().toISOString()});await new Promise(setImmediate);
assert.equal(requests.length,2);assert.equal(requests[1].args[0].query,'latest','only the latest queued query is sent');
requests[1].ok({...fixture(),updatedAt:new Date().toISOString()});await p1;
const beforeRender=element('app').innerHTML;ui("toast('Saved')");timers.at(-1)();assert.equal(element('app').innerHTML,beforeRender,'toast expiry never redraws a form');
const refresh1=ui('refresh()'),refresh2=ui('refresh()');assert.equal(requests.filter(r=>r.name==='getState').length,1,'initial refresh is single flight');
requests.at(-1).ok({contacts:[],projects:[],companies:{},duplicates:[],directoryLoaded:false});await refresh1;await refresh2;
assert.equal(requests.filter(r=>r.name==='getWorkspaceDirectory').length,0,'Contacts does not preload secondary folder data');
const dir1=ui('ensureDirectory()'),dir2=ui('ensureDirectory()');assert.equal(requests.filter(r=>r.name==='getWorkspaceDirectory').length,1,'project choices are loaded once on demand');
requests.at(-1).ok({projects:[],intakeBatches:[],directoryLoaded:true});await dir1;await dir2;
assert.equal(ui('data.directoryLoaded'),true);
const save=ui("call('saveContact',{})");requests.at(-1).ok({saved:true});await save;
assert.equal(ui('opsState'),null,'a save invalidates the current browser dashboard');
assert.equal(ui('data.directoryLoaded'),false,'a save refreshes project associations on next use');
// Preserving the receipt form during Refresh must not preserve its disabled Saving state after success.
element('expenseFile').files=[{name:'isolated.pdf',size:10,type:'application/pdf'}];
let resets=0;element('expenseUploadForm').reset=()=>resets++;
for(const id of ['expenseDestination','expenseProject','expenseCategory','expenseDate','expenseVendor','expenseAmount','expenseCurrency','expenseNotes'])element(id).value='';
client.crypto=client.window.crypto;
client.FileReader=class {readAsDataURL(){this.result='data:application/pdf;base64,dGVzdA==';this.onload();}};
ui('loadExpenseFiling=async()=>{};submitExpenseReceipt({preventDefault(){}})');
assert.equal(element('expenseUploadButton').disabled,true);
const submittingCount=requests.length;ui('submitExpenseReceipt({preventDefault(){}})');assert.equal(requests.length,submittingCount,'a pending receipt save cannot be submitted twice');
requests.at(-1).ok({record:{destination:'Company expense'},notification:'Sent'});await new Promise(setImmediate);
assert.equal(ui('expenseSaving'),false);assert.equal(resets,1);assert.equal(element('expenseUploadButton').disabled,false,'successful receipt save enables the next upload');
assert.equal(element('expenseUploadFeedback').textContent,'','completed save clears the old busy message');
console.log('PASS: cache reuse, expiry, forced refresh, write races, info-only reads, lazy folders, coalesced searches, and non-destructive confirmations.');
