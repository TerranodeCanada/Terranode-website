# Workspace performance and usability — 18 October 2026

## Deployment and source reconciliation

Work was performed in the verified **Terranode Inc. — Company Buildout** folder using the signed-in Workspace owner, `info@terranode.ca`. The existing Apps Script deployment was updated in place, preserving its URL, execute-as owner, and **Only myself** audience. No Script Properties, OAuth scopes, Drive permissions, production records, or original files were changed by this release.

The initial live version was 28. Its receipt-filing and search-suggestion additions were missing from GitHub; GitHub contained newer six-form routing and alert logic absent from the live project. Both sets of working features were reconciled. Receipt server/client logic now lives in `Expenses.gs` and `WorkspaceExpenses.html`. The checked-in manifest mirrors the existing live manifest. Deployment exports were compared against all 17 source files; private Script Properties are not exported or committed.

The public site remains at https://terranode.ca/ and its private-app gateway at https://terranode.ca/team.html. Both existing Render static services follow `main` and publish `dist`; this release does not change the public assets or the Team Login destination. Apps Script releases remain versioned separately from Render.

## Confirmed bottlenecks and focused changes

- Two client modules started the same initial request. Startup now runs once from the shell, and concurrent refreshes share one request.
- Contacts previously waited for Drive project and intake-folder scans. It now loads contact data first; folder choices load on demand for editing and Project Media.
- Contacts and Operations repeated contact, source, and company-register reads. A shared 30-second server snapshot reuses those reads. Spreadsheet handles and project lists are also reused within each execution.
- Operations previously rebuilt its data on every search and tab visit. A 30-second snapshot supports filtering and pagination; browser data is reused on recent revisits. Search is debounced and coalesced so only one request runs at a time and the newest query wins.
- Register headers and rows are read together. Media batch discovery uses grouped parent-folder searches instead of opening every project folder separately. Original media contents and filenames are unchanged.
- Successful writes invalidate the server snapshot revision and browser data. A read racing a save cannot repopulate the new revision. Explicit Refresh bypasses snapshots; checked times are displayed. External Sheet/Drive changes are eligible for reread after 30 seconds on the next load/search/revisit, or immediately with Refresh. Open views do not continuously poll.
- Cache failures fall back to ordinary reads. Snapshots exceeding the conservative 95 KB UTF-8 limit are not cached. Large-dataset performance remains unmeasured.

## Performance observations

Same signed-in Chrome profile, machine, connection, and production dataset. Timed from a reload/navigation action until the UI visibly displayed useful records using accessibility observations; each reload was confirmed to reset before recording completion. These are user-visible timings, including automation overhead, not server instrumentation or a controlled lab benchmark. No network throttling was applied. The dataset had one contact and 12 Operations results. Google service latency varied substantially.

| Measurement | Baseline version 28 | Optimized loading code |
| --- | --- | --- |
| Contacts: three successive page loads | 5.696 / 4.508 / 4.526 s | 4.269 / 2.940 / 2.613 s |
| Contacts median useful-data time | 4.526 s | 2.940 s (35% lower) |
| Contacts shell median | 1.535 s | 1.794 s |
| First Operations opening, fresh snapshot | 9.351 s | 7.468 s |
| Forced Operations Refresh | 5.974 s | 8.774 s |
| Return to recently loaded Operations | Previously reread data on every visit | 0.991 s |

The optimized samples were taken on version 32. The intended version 33 changes only the contact checked-time label and receipt save-button state; its loading and server code are identical. Earlier intermediate Contacts samples had medians of 3.386 s and 4.612 s, illustrating the variability. Do not interpret the three-run median as a guaranteed speedup on every visit.

**Remaining performance limitation:** an uncached Operations read still takes roughly 7–9 seconds in these checks. Forced Refresh did not improve in the measured comparison. Short-lived reuse improves repeated navigation and searching; this work does not claim that all Google service reads are fast. The app avoids preloading Operations before it is opened.

## Interface changes and references

The existing public site and the approved `01 — Brand & Sales/Brand/Terranode — Brand and Website.md` supplied the visual reference: the Terranode reverse logo, Basalt/Chalk/Sandstone palette, restrained Terracotta accents, and concise service-oriented wording. The backend uses the same visual language with a smaller administrative heading scale, consistent spacing, clear labels, and touch-friendly controls.

Operations shows three primary filters and a clearly labelled **More filters** section with active counts. Rows emphasize readable record names; internal IDs remain in details. Recent Activity uses the contact/file name and keeps the actual email-delivery status. Search suggestions, linked filters, record details, and existing relationships remain available.

Loading/error/empty states have readable next steps. Status messages no longer redraw the full screen when they expire. Receipt refresh preserves the unfinished form and selected file; saving clears the busy state and blocks repeated clicks while a save is pending. Navigation, skip link, keyboard focus, dialog dismissal, and phone layouts were checked.

## Verification and limits

All repository checks passed:

- `scripts/check-site.mjs`: nine public pages, links/assets, form routes, brand checks, and JavaScript syntax.
- `scripts/check-workspace.mjs`: server/client syntax, owner-only access, CRM filters/relationships, alert retry behavior, six form mappings, routing and duplicate-safe email handling.
- `scripts/check-business-card-ocr.mjs`: reusable OCR worker/retry behavior, reviewable extraction, camera/photo/file choices.
- `scripts/check-workspace-performance.mjs`: cache hits/expiry/forced reads/cache failure, authorization before cached reads, concurrent-save invalidation, shared contact reads, request coalescing, lazy folder loading, toast preservation, receipt save state, and duplicate-click prevention.
- `git diff --check`.

Live read-only checks covered Contacts, Operations records, combined search/filter empty states, native dropdown suggestions, Recent Activity, receipt data and existing email-filing status, project/intake folder navigation, and desktop/390×844 phone layouts. The card import dialog retained all three image choices and the vCard entry point. Tab focus and Escape dismissal returned focus to the opener. The existing Gmail filing status was **on**; it was not reconfigured. The existing Activity entry showed **Sent**. Six source/destination form-header mappings were inspected against the actual Hub headers.

An isolated local fixture verified empty-name validation, company/project receipt selection, form-draft preservation during Refresh, and responsive overflow. No fictitious inquiry, production contact save, merge, receipt upload, media upload/move, Gmail import, or test email was performed. OCR and submission/alert tests use isolated mocks, so they are not proof of successful production end-to-end processing. No physical phone camera capture or screen-reader session was performed.

The live console showed the Google Apps Script iframe sandbox warning. No application exception was observed in the checked flows. Broader automated accessibility certification and large-volume load testing remain outside this verification.

## Final publication correction

The continuation source check found that version 33 had incorrectly saved transfer-page URLs into two client templates. Both templates were restored from the reviewed local commit. A fresh export matched all 17 files before publishing **version 34**, preserving the existing URL, owner-only audience, and OAuth scopes. Version 34 contains the reviewed implementation described above; its server/loading logic is unchanged from the measured version 32.
