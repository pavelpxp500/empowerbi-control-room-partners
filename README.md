# EMPOWERBI Control Room — Partner Edition

An English-language, runnable reference of the Control Room analytics application, prepared for our New Jersey partners on **October 23, 2026**.

**Creator:** Pavel Mihai Lucian — EMPOWERBI  
**Existing hosted application:** [Control Room](https://empowerbi.work/ControlRoom/)

This repository contains the reusable frontend, graphs and calculation logic—not just screenshots. It preserves the Selgros reference design and source-data labels so partners can inspect and adapt the working implementation. It is a private partner handoff, not an open-source release or a new production deployment.

## What you can explore

- Responsive reporting workspace with English navigation, KPI cards and a shared reporting-period selector.
- Interactive bars, trends, area charts, treemaps, donuts, heatmaps, scatter/bubble charts, waterfalls and current/reference comparisons where appropriate to each report.
- Dynamic grids with search, filters, sorting, configurable columns, details, grouping/pivot through the workbench and CSV export.
- An analyst workbench with evidence-backed interpretation, local chat and a **Build dashboard** experience.
- Dashboard filters, drilldowns, supporting-data grids and reusable saved layouts. All figures are computed from selected records by the application.
- A report composer with PDF and Excel exports of captured tables and analyst answers.
- CFO comparison logic, a local decision register and an interactive logical data-model explorer.

For the complete source map and calculation rules, see [FEATURES-AND-CONTRACT.md](FEATURES-AND-CONTRACT.md).

## Download or clone

The repository's **Releases** section contains `EMPOWERBI_ControlRoom_Partner_Kit_2026-10-23.zip`. GitHub access to this private repository is required for that download; the same ZIP can also be forwarded directly by the owner.

```sh
git clone https://github.com/pavelpxp500/empowerbi-control-room-partners.git
cd empowerbi-control-room-partners
```

Alternatively, extract the supplied ZIP and open a terminal in its extracted root folder.

## Quick start

Use Node.js 24 and npm. From the project folder:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run dev -- --host 127.0.0.1
```

Open the local address printed in the terminal. Select **Admin**, then **Continue**. The `admin@admin.com` profile is a passwordless demonstration entry, **not production authentication**.

To run the regression checks and create a local production build:

```sh
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Dependency installation requires internet access. Once installed, this edition's analysis and dashboard-building features run locally without cloud AI calls. Serve the application through Vite; do not double-click `index.html`.

## AI: what is connected and what is not

This partner edition starts in **local/offline mode**. Its chat uses calculation-based interpretations and its dashboard planner is rule-based. The server-side generative AI integration is included as reference source, but no provider keys, active cloud connection or deployment configuration are included.

To enable generative AI in a destination application, configure its own server-side provider, secure authentication and data-use permissions. Never place secrets in browser code or public Vite environment variables. AI may select a validated layout; it must not invent the dashboard's financial figures or execute arbitrary formulas.

## Important data and sharing notes

- The code snapshot was first packaged on October 7 and checked against the current local application on October 23. The partner build preserves that implementation with portable configuration and partner documentation.
- The supplied data is a mixture of published reference/catalogue information and clearly labelled generated/calculated demonstrations. It is not a confidential production operating-data extract. Preserve each dataset's source, date, grain and demonstration labels.
- Original source currency and time conventions remain in place, including RON where applicable. No conversion to USD or US operating data is implied by the New Jersey handoff.
- Saved layouts, decisions and chat are browser-local—not shared collaboration storage. Use new storage namespaces when adapting this under the same origin.
- Private reviewed exports, business-user demo profiles, API credentials, deployment state, original Git history and unrelated shared-service code are excluded.
- Retained company branding and third-party assets remain reference material. This handoff does not grant additional rights in third-party content. Confirm intended branding and commercial licensing before redistribution.

## Documentation

- [Start here](START-HERE.md): source-package details, local/cloud boundary and exclusions.
- [Feature map and calculation contract](FEATURES-AND-CONTRACT.md): what to reuse and what must remain mathematically correct.
- [Prompt for another AI coding conversation](PROMPT-FOR-OTHER-CONVERSATION.txt): attach this source package and paste the prompt to adapt the implementation in another project.
- [Verification](VERIFICATION.md): executed checks, warnings and verification limits.
- [Release notes](RELEASE_NOTES.md): this partner delivery's scope.
- [SHA-256 manifest](MANIFEST.sha256): integrity hashes of the distributed source files.

The original live Control Room application is unchanged by this handoff.
