# Feature map and reuse contract

Paths below are relative to the extracted reference source. Start with `src/App.tsx` to distinguish mounted pages from available legacy components. The governed portfolio declares 25 core reports and 6 annexes; older analytical routes also remain.

## Source map

| Capability | Principal files under `src/` | Reuse notes |
|---|---|---|
| Shell, navigation, intro, attribution | `App.tsx`, `index.css`, `components/layout/AppLayout.tsx`, `components/layout/AppIntro.tsx` | White/red responsive reference; lazy routes; demo access, not security. |
| Report definition and orchestration | `components/ControlRoomPanel.tsx`, `lib/control-room-model.ts`, `lib/report-portfolio.ts` | Evidence layers, page filters, measures, dimensions, scoped rows, workflow definitions. |
| Time/comparisons | `components/ReportingTimeBar.tsx`, `lib/ReportingContext.tsx`, `lib/reporting.ts` | Calendar/fiscal periods; daily/weekly/ISO/month/quarter/year; current/reference context; snapshots. |
| Graph library | `components/ReportVisuals.tsx`, `components/SourceSchemaVisuals.tsx`, `components/charts/Charts.tsx` | Bars, lines, treemaps, heatmaps, waterfall, donuts, scatter/bubbles, combinations, stacked columns and gauges. |
| CFO interpretation and bridge | `components/CfoComparison.tsx`, `lib/cfo-comparison.ts` | Weighted KPIs, matched months, scenarios, variance/watchlist, GP bridge, scoped exports. |
| Grid | `components/AdvancedDataGrid.tsx`, `components/useSurfaceWidth.ts`, `lib/grid-layout.ts`, `lib/grid-semantics.ts` | Search/facets, column visibility/order, responsive column pages, sort, pagination, details, full filtered projection and CSV. |
| Workbench and analyst | `components/AnalystWorkbench.tsx`, `lib/analytics.ts`, `lib/analyst-presentation.ts` | Group/pivot, findings, questions, local or configured cloud chat, dashboard tab, capture/composer. |
| Dashboard builder | `components/DashboardBuilder.tsx`, `components/DashboardBuilder.css`, `lib/dashboard-plan.ts`, `lib/dashboard-data.ts` | 1–4 cards, up to four bar/line/area charts, filters, drilldown, evidence, layouts and export capture. |
| Export | `lib/exporters.ts` | Native XLSX plus jsPDF/autotable; local font assets. CSV in grid. Tables with context/provenance rather than chart screenshots. |
| Backend integration reference | `analyst-api.ts`, `worker.ts`, `worker-configuration.d.ts` | Status/chat/dashboard routes; server-only providers, origin/size/rate/schema checks. No credentials or deployment configuration included. |
| Local decisions | `components/DecisionRegister.tsx` | Evidence, owner/date/status/action/reviewer, revision tracking, verified closure checks. Browser-local; no posting/notification service. |
| Data-model explorer | `components/DataModelExplorer.tsx` | Logical star schema with member selection and actual demo-row filtering; not a warehouse connection. |
| Overview presentation | `pages/PPresentation.tsx` and CSS | Navigable in-app presentation and linked workflows; not a PowerPoint generator. |
| Data/provenance | `lib/data.tsx`, `lib/source-schema.ts`, `lib/coverage-data.ts`, `public/data/` | Published assets plus generated demonstrations, metadata and load errors. Private local-data connection removed. |

Some reusable chart-library components are legacy-only. For example, `BenchmarkCharts.tsx` provides funnel, stage/complexity scatter, coverage heatmap and sprint swimlane, but its legacy `P20Benchmark.tsx` page is not routed by the current App. Do not advertise every file as a feature mounted in the reference UI.

## Essential data flow

```text
DataProvider (rows + source metadata)
  → ReportingContext (period/reference/snapshot scope)
  → ControlRoomPanel (page filters + governed measure)
  → AnalystWorkbench (detail grid projection / explicit grouping or pivot)
      ├─ computed analyst evidence → local chat or approved backend
      ├─ DashboardBuilder → validated layout → trusted calculations
      │    └─ dashboard filters/drilldown → supporting-data inspection
      └─ capture exact views/answers/value tables → composer → PDF/XLSX
```

Filter semantics are part of the product contract: workbench grid projection changes assistant/dashboard scope; dashboard filters recalculate its values; searching the dashboard supporting-data grid affects that inspection only. CFO detail-grid controls do not change CFO cards/charts. Original static exhibits can retain their published source period even when a separate shared workbench uses the selected reporting period.

## Calculation contract

1. `Measure` and trusted custom evaluators are authoritative. The dashboard schema permits IDs and visual configuration only, not values, formulas, SQL or code.
2. Use ratio of paired sums. CFO margin is total GP / total net sales and requires a complete compatible financial population. GP uses complete reported GP or matched sales minus COGS. Missing/incomplete inputs return null, not zero.
3. Margin differences use percentage points; growth with a nonpositive reference denominator is unavailable. Do not average percentages or add pivot ratios/subtotals.
4. Calendar/month records stay at their real grain. A monthly observation cannot become fabricated daily/weekly evidence. Stock uses the latest snapshot on/before the period end, not a sum of dates.
5. Current/reference CFO comparisons align requested month slots. Missing months remain missing; do not slide remaining observations into another month.
6. The reconciled GP bridge is reference GP + sales-value effect + margin-rate/mix residual = current GP. These are mathematical effects, not verified business causes.
7. Preserve operational definitions: OTIF is the eligible-line on-time/in-full intersection; forecast accuracy uses paired forecast/actual observations; forecasts are not budgets; stock age, expiry and no movement differ; case/pallet conversion is item-specific.
8. Guard mixed currencies, multiple stock snapshots and overlapping stock states. Do not silently convert units or imply exchange rates.
9. Recompute pivot totals from source detail. Pivot >20 columns is explicitly blocked. Dashboard building requires detail rows, not grouped/pivot aggregates.
10. Use the target's valid schema adapter and governed measures. Do not match unknown columns loosely then apply reference financial semantics to them.

## Dashboard and assistant contract

- Validate both manifest and plan; reject unknown/extra fields and measure/dimension IDs. Line/area charts need a temporal dimension. Preserve dimensional types and known measure definitions.
- Every card, chart, tooltip and drilldown derives from the same current source scope. Stable `getRowId` and projection callbacks avoid state loops.
- The retained Recharts 2 implementation inspects direct children. Do not wrap chart axes/tooltips in a Fragment; charts may silently fail to render as intended.
- Save up to eight layout configurations per route/dataset/source signature. Saved layouts contain no rows, numeric values or filters; reload recalculates against the current scope.
- Dashboard colour identifies measures, not performance versus an invented target.
- Dashboard planning sends only question and field manifest. Connected chat has a different contract: bounded eligible demonstration findings/sample evidence and recent conversation. Private reviewed exports and local cases stay out of that flow.
- Offline local answers and local layout planning are deterministic/rule-based, not generative AI. Provider credentials and server bindings are a separate deployment prerequisite.

## Export and adaptation limits

- PDF is bounded to 500 rows/view. XLSX is bounded to 10,000 rows and 500,000 cells/view. Grid CSV covers the complete filtered view. Preserve visible truncation notices and scope fingerprints.
- Dashboard capture exports cards/chart value tables, not raster chart images. Test the files themselves, not only a success toast.
- LocalStorage/sessionStorage are not an organization-wide database. Use target-specific namespaces to avoid cross-app collisions; provide migration rules if necessary.
- Login is a demo selector. Logical model UI is illustrative. Journal preparation is a review-only balanced draft. Pricing scenarios assume unchanged volumes/costs and do not model elasticity.
- Rebrand intentionally, select appropriate report portfolio, replace source data via adapters, map dates/units/currency, and select target deployment/authentication separately. Do not copy original hosting IDs or credentials.

## Destination acceptance checklist

- [ ] Baseline reference builds and its 72 checks pass; target build/types/tests also pass.
- [ ] Representative executive, sales, inventory, comparison and assistant views render with no blank charts or console errors.
- [ ] Weighted ratio, null/zero/missing data, mixed currencies, multiple snapshots and overlapping stock states are covered.
- [ ] Date boundaries, missing reference months, complete-month and fiscal/ISO handling reconcile with evidence rows.
- [ ] Grid search/facets/sort/columns, grouping/pivot, filter scope and chart drilldowns behave as labelled.
- [ ] Dashboard plan validation rejects invented measures/code; layouts save/reload against fresh filtered data.
- [ ] Actual PDF/XLSX/CSV files match captured data and explain truncation/provenance.
- [ ] Keyboard interaction, narrow/mobile layout, empty/error/loading states and reduced motion are checked.
- [ ] Real authentication, backend credentials, data-transfer permissions and hosting decisions are explicit before production.
