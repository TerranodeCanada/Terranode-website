# Terranode technical SEO review

Reviewed 2026-10-19 against the current site source and live `https://terranode.ca/`.

## Search signals

- Each of the nine HTML pages has one descriptive title, one search description, one H1 and a self-referencing canonical URL. The homepage canonical is `https://terranode.ca/`; `/index.html` points to it.
- Project search descriptions identify the work as prior experience completed under LifeBuild Canada. Their on-page descriptions already make that attribution. No new credentials or service areas were added.
- The three public intake pages have distinct search descriptions. The existing-project change request is marked `noindex, follow` because it is a utility route for current clients. It remains available via the website's links. The public project enquiry and trade partner pages remain indexable.
- `robots.txt` permits crawling and names the sitemap. The live version blocked `/team.html` while that page also specified `noindex`; the current source removes the block so crawlers can read the tag. `sitemap.xml` lists the seven indexable pages and omits the client change request and team gateway.
- The homepage includes JSON-LD Organization and WebSite data using the verified name, site, email address and existing logo asset. No LocalBusiness address, rating or review data is claimed.
- Existing Open Graph and Twitter metadata is unchanged.

## Validation completed

- The current live `robots.txt` and `sitemap.xml` loaded in the browser. The former contained `Disallow: /team.html`; the latter listed the seven indexable URLs. The team page source includes `noindex, follow`.
- The site checker passes for all nine pages, internal links, assets, canonical URLs, sitemap coverage, indexing directives, brand assets and JavaScript syntax. The current source adds a regression assertion for the robot rule.
- This maintenance change is saved in source; check the published `robots.txt` again after deployment.

## After publication

- Confirm `/robots.txt` and `/sitemap.xml` return 200 and canonical/robots tags appear in the delivered HTML without JavaScript.
- Search Console opened as `info@terranode.ca` on 19 October but showed the welcome screen with no Terranode property. A verified property is needed to inspect coverage, submit the sitemap or measure clicks and impressions. Do not infer search performance from source checks.
- Run Google's Rich Results Test or URL Inspection on the published homepage to confirm that the structured data is accessible to its crawler. Valid markup does not guarantee a particular search feature or ranking.
