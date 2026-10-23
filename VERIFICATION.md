# Portable handoff verification

Validation date: 23 October 2026 (partner edition; original source-pack checks were run on 7 October). This document covers the exported reference copy, not a new full audit of the live website.

## Executed successfully

- Rechecked source against the current local application: all differences are the intentional portable configuration/sanitization changes. Verified all 186 original manifest entries against the source ZIP before extraction.
- Fresh dependency install from the copied lockfile: `npm ci --ignore-scripts --no-audit --no-fund` (200 packages).
- `npm run build`: TypeScript project checks and production frontend compilation passed; 867 modules transformed.
- `npm test`: **72 dashboard calculation, schema, route and API-boundary checks passed**. Providers are mocked; no credentials or AI calls are used.

A targeted archive/source scan found no credential patterns, private reviewed-data paths or named business-user login profiles. This is a packaging check, not a full security certification.

The tests cover weighted margins, null/zero/incomplete inputs, custom CFO evaluation, currency/snapshot/stock-state guards, filtering, series order, layout/manifest validation, available report registries, rejected extra data and cross-origin requests, mocked provider responses and generic Worker routing.

## Warnings and limits

- The copied Recharts 2 dependency emits a maintenance/deprecation warning. It remains pinned by the original lockfile for rendering compatibility; evaluate a separate migration with regression tests in the destination.
- Vite emits a chunk-size warning (main client chunk approximately 1.12 MB uncompressed / 287 KB gzip). Build succeeds; further splitting/performance work is a destination improvement, not claimed as completed here.
- No security/dependency audit, new browser end-to-end pass, rendered PDF/XLSX audit or live provider/deployment test was performed for this packaging request. The supplied code includes those features, but this handoff validation is not a claim of full feature certification.
- The package starts in offline/local mode. The server integration is source reference only until the target configures its own backend, credentials, authorization and data-use policy.
- No original source application files or live deployment settings were changed by this handoff task.

The archive is assembled from an explicit file allowlist. `MANIFEST.sha256` records the included files (excluding the manifest itself), so extracted contents can be checked for accidental changes.
