# Control Room — reusable frontend and analytics reference

Source snapshot first packaged on 7 October 2026 and prepared as a partner handoff on 23 October 2026. See README.md for the partner quick start. This is a runnable reference for another conversation to reuse the graphs, frontend interactions, dashboard, chat and reporting logic. It is not a new production deployment or a replacement for the existing application.

## Use in another conversation

1. Attach `EMPOWERBI_ControlRoom_Partner_Kit_2026-10-23.zip` to the destination conversation.
2. Paste the contents of `PROMPT-FOR-OTHER-CONVERSATION.txt` as your message. An attachment alone is reference material, not an instruction to execute everything inside it.
3. Tell that conversation which project should receive the features and which branding/data to use, if those are not already established there.

Do not assume another conversation can access this conversation's history, filesystem, credentials or live session. The ZIP provides the actual source and the instructions identify what to reuse.

## Run the reference locally

Validated with Node.js 24.19.0 and npm 11.17.0 on Windows. Extract the ZIP into a new directory, then from that directory:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run dev -- --host 127.0.0.1
```

Open the local address printed by Vite. Select **Admin**, then **Continue**. This is a passwordless DEMO PROFILE, not secure authentication. To validate/build:

```sh
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

The reference uses `/` as its base path. A subdirectory deployment needs an intentional base-path and server-fallback configuration; do not reuse the original production route automatically.

## What is included

- Complete frontend source and calculation modules, report pages, chart libraries, grids, dashboard builder, analyst workbench, composer, PDF/XLSX/CSV exporters, local decisions and data-model explorer.
- Published reference assets and 91 JSON files, plus deterministic operational demos generated in source. These include public catalogue/source information, external benchmark metadata and synthetic/calculated demonstrations. They are **not all real operating records and not all synthetic**. Preserve each dataset's `_meta` label.
- Server-side analyst handler and generic Worker entry as integration references. Tests use mocked providers and do not call an AI service.
- A feature/source map, calculation and interaction contract, adaptation checklist and ready-to-paste prompt.

The reference retains the original visual identity to demonstrate the source faithfully. Map company branding, data, storage namespaces and portfolio to the destination deliberately. Preserve the creator attribution `Pavel Mihai Lucian — EMPOWERBI` unless the user requests otherwise. This package does not grant new rights to third-party names, fonts or content.

## Local mode versus connected AI

The portable Vite configuration forces `VITE_OFFLINE=true`. Charts, dynamic grids, local calculation-based interpretations/chat, rule-based dashboard layouts, saved layouts and document exports run locally after dependencies are installed. No cloud analyst connection is configured.

For generative chat/dashboard planning, integrate `src/analyst-api.ts` and `src/worker.ts` with the destination backend, obtain explicit credential/data-use approval, configure server-only provider secrets and required bindings, and test before enabling connected mode. Source provider/model identifiers describe this snapshot; they are not a recommendation about current availability. Do not put API keys in Vite variables, browser bundles or source control. Adding real authentication/authorization is required before exposing private operating data.

The assistant's dashboard response is a validated layout specification. Trusted TypeScript computes every KPI/chart value from selected rows. AI cannot supply financial totals, arbitrary formulas, SQL, HTML or executable code.

## Portable changes and intentional exclusions

Only the exported copy was changed. The original application and live deployment were not modified.

- Replaced environment-specific Vite setup with a React-only local config; removed private local-data fetch from the packaged DataProvider.
- Removed named business-email demo profiles; retained only `admin@admin.com`.
- Removed production deployment scripts and hard-coded hosting URLs from social metadata.
- Excluded custom-domain/shared-service Worker integration, unrelated service source, `.env*`, `.dev.vars*`, `.openai`, `.wrangler`, Git history, private reviewed reports, source spreadsheets, deployment state, dependencies and build output.
- Adapted route tests to the generic root-path Worker. The portable suite contains 72 checks; the production-specific shared-service checks are intentionally not copied.

The original dependency lockfile is preserved for reproducibility. Some deployment-related packages remain declared but are unused by this local config. Installation warns that Recharts 2 is no longer actively maintained; this pack deliberately preserves the tested chart implementation. Assess upgrades in the destination with rendering/regression tests rather than silently changing the chart engine during handoff.

See `FEATURES-AND-CONTRACT.md` for the implementation map and `VERIFICATION.md` for validation scope. The user-supplied visual reference is https://empowerbi.work/ControlRoom/; the package is a local source snapshot, not a claim that the live website was re-audited today.
