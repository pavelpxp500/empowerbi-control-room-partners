import { Link } from 'react-router'
import { PageBody, PageHead } from '@/components/layout/AppLayout'
import AdvancedDataGrid, {
  type AdvancedDataGridColumn,
  type AdvancedDataGridFacet,
} from '@/components/AdvancedDataGrid'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import { BenchmarkSourceNotice } from '@/components/BenchmarkSourceNotice'
import {
  DomainStageTreemap,
  RouteCoverageHeatmap,
  SourcePortfolioFunnel,
  SprintSwimlaneTimeline,
  type BenchmarkDomainStageRow,
  type BenchmarkPortfolioRow,
  type BenchmarkRouteCoverageRow,
  type BenchmarkSprintRow,
} from '@/components/charts/BenchmarkCharts'
import { n0, pct, useDataset } from '@/lib/data'

type PortfolioRow = BenchmarkPortfolioRow & {
  category: string
  future_needed: string
  required_by: string
  report_state: string
  estimate_person_days: number | null
  relative_estimate: string
  has_replacement: boolean
  selgros_route: string
  selgros_route_label: string
  mapping_kind: string
}

const PORTFOLIO_COLUMNS: readonly AdvancedDataGridColumn<PortfolioRow>[] = [
  { id: 'id', header: 'ID', value: (r) => r.id, hideable: false, minWidth: 72 },
  { id: 'name', header: 'Report / dashboard', value: (r) => r.name, minWidth: 260 },
  { id: 'category', header: 'Category', value: (r) => r.category, minWidth: 120 },
  { id: 'baseline', header: 'Source baseline', value: (r) => r.baseline, minWidth: 170 },
  { id: 'critical', header: 'Go-live critical', value: (r) => r.critical_go_live, align: 'center', minWidth: 105,
    render: (r) => <span className={`pill ${r.critical_go_live ? 'pill-red' : 'pill-green'}`}>{r.critical_go_live ? 'Yes' : 'No'}</span> },
  { id: 'priority', header: 'Priority', value: (r) => r.priority, align: 'center', minWidth: 95 },
  { id: 'design', header: 'Design', value: (r) => r.design_sprint, minWidth: 110 },
  { id: 'build', header: 'Build', value: (r) => r.build_sprint, minWidth: 110 },
  { id: 'required', header: 'Requesting flow', value: (r) => r.required_by, minWidth: 140 },
  { id: 'state', header: 'Register status', value: (r) => r.report_state, minWidth: 155, defaultHidden: true },
  { id: 'days', header: 'Person-days', value: (r) => r.estimate_person_days, align: 'right', minWidth: 78, defaultHidden: true },
  { id: 'route', header: 'Proposed Selgros route', value: (r) => r.selgros_route_label, minWidth: 160,
    render: (r) => <Link className="text-accent underline decoration-dotted underline-offset-2" to={r.selgros_route}>{r.selgros_route_label}</Link> },
]

const PORTFOLIO_FACETS: readonly AdvancedDataGridFacet<PortfolioRow>[] = [
  { id: 'category', label: 'Category', value: (r) => r.category },
  { id: 'priority', label: 'Priority', value: (r) => r.priority },
  { id: 'design', label: 'Design sprint', value: (r) => r.design_sprint },
  { id: 'baseline', label: 'Baseline', value: (r) => r.baseline },
  { id: 'route', label: 'Proposed route', value: (r) => r.selgros_route_label },
]

function PortfolioDetail({ row }: { row: PortfolioRow }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 text-[12px]">
      <div><b className="block mb-1">Source decision</b><span>Future needed: {row.future_needed}</span><br /><span>Declared replacement: {row.has_replacement ? 'yes' : 'no'}</span></div>
      <div><b className="block mb-1">Planning</b><span>Design: {row.design_sprint}</span><br /><span>Build: {row.build_sprint}</span><br /><span>Estimate: {row.estimate_person_days == null ? 'not declared' : `${n0(row.estimate_person_days)} person-days`} · {row.relative_estimate}</span></div>
      <div><b className="block mb-1">Independent interpretation</b><span>{row.mapping_kind}; the proposed route does not confirm Selgros equivalence or implementation.</span></div>
    </div>
  )
}

export default function P20Benchmark() {
  const catalogD = useDataset('benchmark_catalog')
  const portfolioD = useDataset<PortfolioRow>('benchmark_portfolio')
  const sprintD = useDataset<BenchmarkSprintRow>('benchmark_sprints')
  const coverageD = useDataset<BenchmarkRouteCoverageRow>('benchmark_coverage')
  const domainD = useDataset<BenchmarkDomainStageRow>('benchmark_domain_stage')
  const deScopedBaseline = portfolioD.data.filter((r) => r.baseline.toLocaleLowerCase('en-GB').includes('de-scope')).length
  const deScopedPriority = portfolioD.data.filter((r) => r.priority === 'De-scope').length
  const critical = portfolioD.data.filter((r) => r.critical_go_live).length
  const contradictions = portfolioD.data.filter((r) => r.critical_go_live && r.priority === 'De-scope').length
  const direct = coverageD.data.filter((r) => r.coverage === 'Direct').length
  const uncovered = coverageD.data.filter((r) => r.coverage === 'Not covered').length

  return (
    <>
      <PageHead title="External benchmark · portfolio & coverage"
        dek="Requirements cockpit: 172 inventoried reports, a three-sprint P1 roadmap and 74 solution cards mapped to the Selgros application."
        chips={<><Chip meta={portfolioD._meta} /><Chip meta={catalogD._meta} /></>} />
      <PageBody>
        <BenchmarkSourceNotice />

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(175px,1fr))]">
          <Kpi k="Reports inventoried" v={n0(portfolioD.data.length)} d={<span>sanitised register</span>} />
          <Kpi k="De-scope · baseline" v={n0(deScopedBaseline)} d={<span>{pct(100 * deScopedBaseline / Math.max(portfolioD.data.length, 1))} of inventory</span>} />
          <Kpi k="Go-live critical" v={n0(critical)} status="yellow" d={<span>raw register label</span>} />
          <Kpi k="P1 roadmap" v={n0(sprintD.data.length)} d={<span>3 sprints in the source sheet</span>} />
          <Kpi k="Solution cards" v={n0(catalogD.data.length)} d={<span>8 domains · 6 raw stages</span>} />
          <Kpi k="Directly mapped routes" v={`${direct}/21`} d={<span>{uncovered} without a primary card</span>} />
        </div>

        <div className="bg-surface2 border-l-[3px] border-warn rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">Register consistency check.</b> The baseline marks {n0(deScopedBaseline)} items as De-scope, while the priority field marks {n0(deScopedPriority)}; {n0(contradictions)} go-live-critical item is also De-scope. The discrepancy remains visible and has not been artificially “corrected”.
        </div>

        <div className="grid gap-3.5 grid-cols-1 xl:grid-cols-2">
          <Card title="Portfolio → candidates → critical" sub="requirements funnel" chips={<Chip meta={portfolioD._meta} />}>
            <SourcePortfolioFunnel rows={portfolioD.data} />
          </Card>
          <Card title="Catalog structure" sub="area = number of cards" chips={<Chip meta={domainD._meta} />}>
            <DomainStageTreemap rows={domainD.data} />
          </Card>
        </div>

        <Card title="Application functional coverage" sub="21 routes · independent inference" chips={<Chip meta={coverageD._meta} />}>
          <RouteCoverageHeatmap rows={coverageD.data} />
        </Card>

        <Card title="P1 roadmap from the source register" sub="36 items · 3 sprints" chips={<Chip meta={sprintD._meta} />}>
          <SprintSwimlaneTimeline rows={sprintD.data} />
        </Card>

        <Card title="Dynamic report register" sub="172 rows · filters, sorting, columns, details and CSV" chips={<Chip meta={portfolioD._meta} />}>
          <AdvancedDataGrid rows={portfolioD.data} columns={PORTFOLIO_COLUMNS} facets={PORTFOLIO_FACETS}
            getRowId={(row) => row.id} caption="Dynamic reports and dashboards register"
            renderDetail={(row) => <PortfolioDetail row={row} />} initialSort={{ columnId: 'priority', direction: 'asc' }}
            initialPageSize={25} searchPlaceholder="Search report, category, status or route…"
            csvFileName="external-benchmark-portfolio.csv" maxHeight={650} />
        </Card>

        <Ledger metas={[portfolioD._meta, sprintD._meta, catalogD._meta, coverageD._meta, domainD._meta]} />
      </PageBody>
    </>
  )
}
