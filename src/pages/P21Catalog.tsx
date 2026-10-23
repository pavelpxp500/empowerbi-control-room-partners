import { Link } from 'react-router'
import { PageBody, PageHead } from '@/components/layout/AppLayout'
import AdvancedDataGrid, {
  type AdvancedDataGridColumn,
  type AdvancedDataGridFacet,
} from '@/components/AdvancedDataGrid'
import BarList from '@/components/BarList'
import Card from '@/components/Card'
import Chip, { Ledger } from '@/components/Chip'
import Kpi from '@/components/Kpi'
import { BenchmarkSourceNotice, SourceStageBadge } from '@/components/BenchmarkSourceNotice'
import { ComplexityStageScatter, type BenchmarkCatalogAnalyticsRow } from '@/components/charts/BenchmarkCharts'
import { n0, useDataset } from '@/lib/data'

type CatalogRow = BenchmarkCatalogAnalyticsRow & {
  aka: string | null
  audience: string | null
  question: string | null
  grain: string | null
  dimensions: string[]
  measures: string[]
  filters: string[]
  acceptance: string[]
  dimension_count: number
  measure_count: number
  filter_count: number
  effort_band: string
  selgros_route: string
  selgros_route_label: string
  selgros_implementation_status: string
  selgros_status: string
  validation_status: string
  mapping_kind: string
}

const TYPE_LABEL: Record<string, string> = {
  report: 'Report', dataset: 'Dataset', mapping: 'Mapping', pipeline: 'Pipeline',
  navigation: 'Navigation', method: 'Method', governance: 'Governance',
}

const CATALOG_COLUMNS: readonly AdvancedDataGridColumn<CatalogRow>[] = [
  { id: 'id', header: 'Card', value: (r) => r.id, hideable: false, minWidth: 78 },
  { id: 'name', header: 'Solution / capability', value: (r) => r.name, minWidth: 270 },
  { id: 'domain', header: 'Domain', value: (r) => r.domain, minWidth: 150 },
  { id: 'artifact', header: 'Object type', value: (r) => TYPE_LABEL[r.artifact_type ?? ''] ?? r.artifact_type ?? '—', minWidth: 110 },
  { id: 'stage', header: 'Source stage', value: (r) => r.source_stage_raw, minWidth: 120,
    render: (r) => <SourceStageBadge stage={r.source_stage_raw} /> },
  { id: 'complexity', header: 'Complexity', value: (r) => r.complexity_score, align: 'right', minWidth: 100 },
  { id: 'dimensions', header: 'Dimensions', value: (r) => r.dimension_count, align: 'right', minWidth: 90, defaultHidden: true },
  { id: 'measures', header: 'Measures', value: (r) => r.measure_count, align: 'right', minWidth: 78 },
  { id: 'acceptance', header: 'Criteria', value: (r) => r.acceptance_count, align: 'right', minWidth: 78 },
  { id: 'route', header: 'Proposed route', value: (r) => r.selgros_route_label, minWidth: 160,
    render: (r) => <Link className="text-accent underline decoration-dotted underline-offset-2" to={r.selgros_route}>{r.selgros_route_label}</Link> },
  { id: 'status', header: 'Selgros status', value: (r) => r.selgros_status, minWidth: 110,
    render: (r) => <span className="font-mono text-[9px] tracking-[0.06em] text-ink3">{r.selgros_status}</span> },
]

const CATALOG_FACETS: readonly AdvancedDataGridFacet<CatalogRow>[] = [
  { id: 'domain', label: 'Domain', value: (r) => r.domain },
  { id: 'stage', label: 'Source stage', value: (r) => r.source_stage_raw },
  { id: 'artifact', label: 'Object type', value: (r) => TYPE_LABEL[r.artifact_type ?? ''] ?? r.artifact_type },
  { id: 'effort', label: 'Derived effort', value: (r) => r.effort_band },
  { id: 'route', label: 'Proposed route', value: (r) => r.selgros_route_label },
]

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <b className="block font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink3 mb-1.5">{title}</b>
      {items.length ? <ul className="list-disc pl-4 space-y-1 text-[11.5px] text-ink2">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <span className="text-ink3">Not declared</span>}
    </div>
  )
}

function CatalogDetail({ row }: { row: CatalogRow }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center"><SourceStageBadge stage={row.source_stage_raw} /><span className="font-mono text-[9px] uppercase text-ink3">Selgros: {row.selgros_status}</span><span className="text-[11px] text-ink3">{row.validation_status}</span></div>
      <div className="grid gap-4 lg:grid-cols-3 text-[12px]">
        <div><b className="block mb-1">Business question</b><p className="text-ink2 leading-relaxed">{row.question ?? 'Not declared'}</p></div>
        <div><b className="block mb-1">Grain</b><p className="text-ink2 leading-relaxed">{row.grain ?? 'Not declared'}</p></div>
        <div><b className="block mb-1">Source audience</b><p className="text-ink2 leading-relaxed">{row.audience ?? 'Not declared'}</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3"><DetailList title="Source dimensions" items={row.dimensions} /><DetailList title="Source measures" items={row.measures} /><DetailList title="Source filters" items={row.filters} /></div>
      <div className="border-t border-line pt-3">
        <b className="block mb-1 text-[12px]">Source acceptance targets — not passed results</b>
        <ul className="list-disc pl-4 columns-1 lg:columns-2 gap-8 text-[11.5px] text-ink2">{row.acceptance.map((item) => <li key={item} className="mb-1 break-inside-avoid">{item}</li>)}</ul>
      </div>
    </div>
  )
}

export default function P21Catalog() {
  const catalogD = useDataset<CatalogRow>('benchmark_catalog')
  const domainD = useDataset('benchmark_domain_stage')
  const domains = new Set(catalogD.data.map((r) => r.domain)).size
  const stages = new Set(catalogD.data.map((r) => r.source_stage_raw)).size
  const acceptance = catalogD.data.reduce((sum, r) => sum + r.acceptance_count, 0)
  const sourceProd = catalogD.data.filter((r) => r.source_stage_raw === 'PROD').length
  const grainGroups = new Map<string, CatalogRow[]>()
  catalogD.data.forEach((row) => {
    if (!row.grain) return
    grainGroups.set(row.grain, [...(grainGroups.get(row.grain) ?? []), row])
  })
  const overlaps = [...grainGroups.entries()].filter(([, rows]) => rows.length > 1)
  const artifactMix = [...new Set(catalogD.data.map((r) => r.artifact_type ?? 'other'))]
    .map((type) => ({ artifact: TYPE_LABEL[type] ?? type, count: catalogD.data.filter((r) => r.artifact_type === type).length }))
    .sort((a, b) => b.count - a.count)

  return (
    <>
      <PageHead title="Solution catalog · 74 analysable cards"
        dek="A dynamic library of questions, grains, measures and acceptance criteria, with source stage kept strictly separate from Selgros status."
        chips={<><Chip meta={catalogD._meta} /><Chip meta={domainD._meta} /></>} />
      <PageBody>
        <BenchmarkSourceNotice>Reconstruction prompts and numerical histories from the documents were neither imported nor executed.</BenchmarkSourceNotice>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(175px,1fr))]">
          <Kpi k="Unique cards" v={n0(catalogD.data.length)} d={<span>all IDs reconciled</span>} />
          <Kpi k="Domains" v={n0(domains)} d={<span>raw source taxonomy</span>} />
          <Kpi k="Raw stages" v={n0(stages)} d={<span>mixed vocabulary without one definition</span>} />
          <Kpi k="Labelled PROD in the source" v={n0(sourceProd)} status="yellow" d={<span>does not mean Selgros PROD</span>} />
          <Kpi k="Acceptance targets" v={n0(acceptance)} d={<span>checklists, not passed tests</span>} />
          <Kpi k="Overlapping grains" v={n0(overlaps.length)} status="yellow" d={<span>reconcile, do not duplicate</span>} />
        </div>

        <div className="grid gap-3.5 grid-cols-1 xl:grid-cols-[1.35fr_0.65fr]">
          <Card title="Evaluation matrix" sub="derived complexity × source ordinal" chips={<Chip meta={catalogD._meta} />}>
            <ComplexityStageScatter rows={catalogD.data} height={350} />
          </Card>
          <Card title="Actual object types" sub="the catalog contains more than reports" chips={<Chip meta={catalogD._meta} />}>
            <BarList rows={artifactMix} label="artifact" value="count" fmt={n0} head={['Type', 'Cards', '']} />
            <p className="mt-3 text-[11.5px] text-ink3">Separating report / dataset / mapping / pipeline / navigation / method / governance avoids overstating the number of independent analytics products.</p>
          </Card>
        </div>

        {overlaps.length ? (
          <Card title="Overlapping grains" sub="cross-link recommended; do not duplicate modules" chips={<Chip meta={catalogD._meta} />}>
            <div className="grid gap-2 md:grid-cols-2">
              {overlaps.map(([grain, rows]) => <div key={grain} className="rounded border border-line bg-surface2 px-3 py-2"><b className="text-[12px]">{rows.map((r) => r.id).join(' ↔ ')}</b><p className="text-[11px] text-ink3 mt-1">{grain}</p></div>)}
            </div>
          </Card>
        ) : null}

        <Card title="Dynamic catalog explorer" sub="74 cards · 5 filters · full details · CSV export" chips={<Chip meta={catalogD._meta} />}>
          <AdvancedDataGrid rows={catalogD.data} columns={CATALOG_COLUMNS} facets={CATALOG_FACETS}
            getRowId={(row) => row.id} caption="Dynamic solution catalog from the external benchmark"
            renderDetail={(row) => <CatalogDetail row={row} />} initialSort={{ columnId: 'domain', direction: 'asc' }}
            initialPageSize={25} searchPlaceholder="Search ID, solution, question, measure or route…"
            csvFileName="solution-catalog-sanitised.csv" maxHeight={680} />
        </Card>

        <Ledger metas={[catalogD._meta, domainD._meta]} />
      </PageBody>
    </>
  )
}
