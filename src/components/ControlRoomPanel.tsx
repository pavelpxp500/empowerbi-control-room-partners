import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend, ScatterChart, Scatter, ZAxis } from 'recharts'
import { CONTROL_ROOMS, CONTROL_COVERAGE } from '@/lib/control-room-model'
import { useDatasetStore, type DatasetName, type DatasetStore } from '@/lib/data'
import { useReporting, useReportStore } from '@/lib/ReportingContext'
import { aggregate, dayCount, filterPeriod, lastSnapshot, measureValue, parseDay, periodKey, periodOutsideCoverage, referenceRange, rowInterval, sum, type Measure } from '@/lib/reporting'
import { humaniseField, type DataRow, type RouteAnalytics } from '@/lib/analytics'
import AnalystWorkbench from './AnalystWorkbench'
import DecisionRegister, { readDecisions } from './DecisionRegister'
import Card from './Card'
import ReportVisuals from './ReportVisuals'
import CfoComparison, { type CfoScope } from './CfoComparison'
import DataModelExplorer from './DataModelExplorer'
import SourceSchemaVisuals from './SourceSchemaVisuals'
import SourceCoverage from './SourceCoverage'
import { REPORT_BY_PATH } from '@/lib/report-portfolio'
import { schemaFor, schemasForRoute, schemaMeasures } from '@/lib/source-schema'
import { cfoMeasure } from '@/lib/cfo-comparison'

const format = (v: number | null, unit = '') => v === null ? 'Unavailable' : `${v.toLocaleString('en-GB', { maximumFractionDigits: unit === '%' ? 2 : 1 })}${unit ? ` ${unit}` : ''}`
const RECORD_COUNT: Measure = { label: 'Records', mode: 'count', unit: '', definition: 'Exported records at the specified grain. Repeated order keys remain separate rows.' }
const referenceMeasures: Record<string, Measure[]> = {
  ref_audit: [RECORD_COUNT],
  ref_forecast: [{ label: 'Forecast volume', field: 'forecast_pcs', unit: 'pcs', definition: 'Populated source forecast cells. Missing cells are unknown, not zero.' }],
  ref_stock: ['available_pcs', 'non_allocated_pcs', 'blocked_pcs', 'purchase_order_pcs'].map(field => ({ label: humaniseField(field), field, unit: 'pcs', definition: 'One stock state only. These states may overlap and must not be added together.' })),
  ref_stock_item: ['on_stock_pcs', 'on_stock_eur', 'on_purchase_order_pcs', 'on_purchase_order_eur'].map(field => ({ label: humaniseField(field), field, unit: field.endsWith('eur') ? 'EUR' : 'pcs', definition: 'Source item export, reporting snapshot date not supplied. Relative month fields remain unanchored.' })),
  ref_stock_department: [RECORD_COUNT],
  ref_customers: [{ label: 'Net sales', field: 'net_ron', unit: 'RON', definition: 'Scorecard net sales, reporting period unspecified.' }, { label: 'Estimated gross profit', field: 'estimated_gross_profit', unit: 'RON', definition: 'Customer net sales × rounded source GM%. An estimate, not matched cost accounting.' }, RECORD_COUNT],
  ref_firefighting: [RECORD_COUNT, { label: 'Largest source delay', field: 'source_delay_days', mode: 'max', unit: 'days', definition: 'Maximum recorded delay. Date chronology anomalies require validation. Not an OTIF rate.' }],
  ref_pallets: [{ label: 'Stock pieces', field: 'stock_pcs', unit: 'pcs', definition: 'Pieces on exported pallet rows. Standard-fill difference is not proof of an ERP/LSP mismatch.' }, RECORD_COUNT],
  ref_ledger: [RECORD_COUNT],
}
const refDimensions: Record<string, string[]> = {
  ref_audit: ['domain', 'severity', 'status', 'owner'],
  ref_forecast: ['department', 'customer_id', 'item_name', 'period'], ref_stock: ['warehouse_id', 'department', 'customer_id', 'item_name'], ref_stock_item: ['department', 'food_nonfood', 'item_name'], ref_stock_department: ['department', 'food_nonfood'], ref_customers: ['segment', 'home_store_id', 'tier', 'customer_name'], ref_firefighting: ['delivery_status', 'order_status', 'warehouse_id', 'order_id'], ref_pallets: ['item_name', 'pallet_id', 'batch_id'], ref_ledger: ['document_type', 'warehouse_id', 'item_name'],
}
function normalizedRows(name: string, rows: DataRow[]): DataRow[] {
  if (name === 'ref_customers') return rows.map(r => ({ ...r, estimated_gross_profit: typeof r.net_ron === 'number' && typeof r.gross_margin_pct === 'number' ? r.net_ron * r.gross_margin_pct / 100 : null }))
  return rows
}
export default function ControlRoomPanel({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation(), room = CONTROL_ROOMS[pathname]
  const isCfoRoute = pathname === '/current-reference' || pathname === '/revenue-quality'
  const raw = useDatasetStore(), reportStore = useReportStore(), { context, setContext } = useReporting()
  const [selected, setSelected] = useState<DatasetName>(pathname==='/stock-analysis'&&raw.cr_schema_stock_item?'cr_schema_stock_item':room.dataset), [filters, setFilters] = useState<Record<string, string>>({}), [dimensionChoice, setDimension] = useState(''), [metricIndex, setMetric] = useState(0)
  const [decisions, setDecisions] = useState(readDecisions), [priceChange, setPriceChange] = useState(3), [palletThreshold, setPalletThreshold] = useState(2), [journal, setJournal] = useState(false)
  const [cfoScope,setCfoScope]=useState<CfoScope|null>(null)
  const schema=schemaFor(selected), isSchema=Boolean(schema), isCfoComparison=isCfoRoute&&!isSchema
  const isReference = selected.startsWith('ref_'), dimensions = schema ? schema.headers.filter(c=>c.type!=='number'&&!/email|gtin|remarks/i.test(c.key)).map(c=>c.key) : selected === 'cr_actions' ? ['domain', 'status', 'severity', 'owner', 'store'] : refDimensions[selected] ?? room.dimensions, dimension = dimensions.includes(dimensionChoice) ? dimensionChoice : dimensions[0]
  const measures = schema ? schemaMeasures(selected).length?schemaMeasures(selected):[RECORD_COUNT] : selected === 'cr_actions' ? [RECORD_COUNT] : isReference ? referenceMeasures[selected] ?? [RECORD_COUNT] : room.measures, measure = measures[metricIndex] ?? measures[0]
  const available = [...new Set([room.dataset, ...schemasForRoute(pathname).map(s=>s.id).filter(n=>raw[n]), ...room.references.filter(n => raw[n]), ...(['audit','firefighting','pos-form'].includes(room.kind) ? ['cr_actions' as DatasetName] : [])])]
  const original = raw[selected]
  const scopeRow = (r: DataRow) => Object.entries(filters).every(([k, v]) => k==='_period'?!!rowInterval(r)&&periodKey(rowInterval(r)!.start,context.grain,context.fiscalStart)===v:String(r[k] ?? 'Not supplied') === v) && (!['inbound', 'outbound'].includes(room.kind) || !selected.endsWith('service') || r.direction === room.kind) && (room.kind !== 'own-brand' || r.brand_type === 'Own brand')
  const sourceRows = useMemo(() => normalizedRows(selected, (original?.data ?? []) as DataRow[]), [original, selected])
  const rows: DataRow[] = useMemo(() => (selected === 'cr_actions' ? decisions : normalizedRows(selected, (reportStore[selected]?.data ?? []) as DataRow[])).filter(scopeRow), [reportStore, selected, decisions, filters, room.kind,context.grain,context.fiscalStart])
  const ref = referenceRange(context)
  const coverage = parseDay(original?._meta.coverage_start) && parseDay(original?._meta.coverage_end) ? { start: String(original!._meta.coverage_start), end: String(original!._meta.coverage_end) } : null
  const incompletePeriods = coverage ? [periodOutsideCoverage(context.start, context.end, coverage) ? 'Current' : '', periodOutsideCoverage(ref.start, ref.end, coverage) ? 'Reference' : ''].filter(Boolean) : []
  const dated = sourceRows.some(r => rowInterval(r) !== null)
  const refRows = useMemo(() => dated && dayCount(ref.start, ref.end) > 0 ? (original?._meta.time_kind === 'snapshot' ? lastSnapshot(sourceRows, ref.end) : filterPeriod(sourceRows, ref.start, ref.end)).filter(scopeRow) : [], [sourceRows, ref.start, ref.end, filters, dated, original, room.kind,context.grain,context.fiscalStart,selected])
  useEffect(() => { setJournal(false) }, [rows])
  const chartRows = useMemo(() => aggregate(rows, [dimension], measure).sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0)), [rows, dimension, measure])
  const trend = useMemo(() => {
    if (!dated) return []
    const monthly = sourceRows.some(r => rowInterval(r)?.monthly)
    if (monthly && ['day', 'week', 'iso-week'].includes(context.grain)) return []
    return aggregate(rows.map(r => ({ ...r, period: periodKey(rowInterval(r)?.start ?? '', context.grain, context.fiscalStart) })), ['period'], measure).sort((a, b) => String(a.period).localeCompare(String(b.period)))
  }, [rows, dated, sourceRows, context.grain, context.fiscalStart, measure])
  const currentValue = measureValue(rows, measure), referenceValue = dated ? measureValue(refRows, measure) : null
  const palletExceptions = useMemo(() => {
    if (selected === 'ref_pallets') {
      const byItem = new Map<string, Set<string>>()
      for (const r of rows) {
        if (typeof r.stock_pcs !== 'number' || typeof r.source_expected_pcs_per_pallet !== 'number' || r.stock_pcs === r.source_expected_pcs_per_pallet || !r.item_id || !r.pallet_id) continue
        const item = String(r.item_id)
        if (!byItem.has(item)) byItem.set(item, new Set())
        byItem.get(item)!.add(String(r.pallet_id))
      }
      return [...byItem.values()].filter(pallets => pallets.size >= palletThreshold).length
    }
    return isReference||isSchema ? null : rows.filter(r => typeof r.pallet_variance === 'number' && r.pallet_variance >= palletThreshold).length
  }, [selected, rows, isReference, isSchema, palletThreshold])
  const differences = currentValue !== null && referenceValue !== null ? currentValue - referenceValue : null
  const activeCfo=isCfoComparison&&cfoScope?.dataset===selected&&cfoScope.inputRows===rows&&cfoScope.inputReference===refRows?cfoScope:null
  const analystMeasure:Measure=activeCfo?cfoMeasure(activeCfo.metric):measure
  const analysisStore: DatasetStore = useMemo(() => ({ ...reportStore, cr_actions: { _meta: { data_label: 'LOCAL CASE REGISTER', grain: 'saved investigation', source: 'User-entered, this browser only' }, data: decisions }, [selected]: { _meta: { ...original?._meta, data_label: original?._meta.data_label ?? 'LOCAL CASE REGISTER', scope: JSON.stringify(filters), report_context: JSON.stringify(context),comparison_selection:activeCfo?.selection,comparison_summary:activeCfo?.summary }, data: activeCfo?.current??rows } }), [reportStore, selected, original, rows, filters, context, decisions,activeCfo])
  const config: RouteAnalytics = useMemo(() => ({ title: room.title, question: room.question, defaultDataset: selected, datasets: available, dimension:activeCfo?.dimension??dimension, metric: analystMeasure.field ?? analystMeasure.numerator ?? 'id', measure:analystMeasure, impact: `${room.required}${activeCfo?' Comparison: '+activeCfo.summary:''}`, action: 'Inspect the contributing records, assign an owner and record the evidence needed to confirm recovery.', prompts: ['Summarise this filtered view', 'What cannot this data prove?', 'Which records need attention?', 'Explain the metric and next check'] }), [room, selected, dimension, analystMeasure, available.join('|'),activeCfo])
  const switchDataset = (name: DatasetName) => { setSelected(name); setFilters({}); setDimension(''); setMetric(0);setJournal(false) }
  const sourcePeriod = () => {
    if (coverage) { setContext({ ...context, ...coverage }); return }
    const intervals = sourceRows.map(rowInterval).filter(v => v !== null)
    if (intervals.length) setContext({ ...context, start: intervals.reduce((a, b) => a < b.start ? a : b.start, intervals[0].start), end: intervals.reduce((a, b) => a > b.end ? a : b.end, intervals[0].end) })
  }
  const drill = (value: unknown) => {
    if (value === null || value === undefined) return
    setFilters(f => ({ ...f, [dimension]: String(value) }))
    setDimension(dimensions[(dimensions.indexOf(dimension) + 1) % dimensions.length])
  }
  const seriesLabel = measure.label.length > 26 ? `${measure.label.slice(0, 26)}…` : measure.label
  return <>
    {pathname === '/ai-copilot' && <DataModelExplorer/>}
    <section className="cr-workspace">
      <header className="cr-workspace-head"><div><h2>Analysis & decisions</h2><p>{room.question}</p></div><Link to="/audit">Coverage & data controls</Link></header>
      <div className="cr-controls">
        <label>Evidence layer<select value={selected} onChange={e => switchDataset(e.target.value as DatasetName)}>{available.map(n => <option key={n} value={n}>{schemaFor(n)?`Source columns · ${schemaFor(n)!.publicLabel} · DEMO`:n === room.dataset ? 'Workflow demonstration' : n === 'cr_actions' ? 'Local investigation register' : `Reviewed export · ${humaniseField(n.replace('ref_', ''))}`}</option>)}</select></label>
        {!isCfoComparison && <label>Explore by<select value={dimension} onChange={e => setDimension(e.target.value)}>{dimensions.map(d => <option key={d} value={d}>{humaniseField(d)}</option>)}</select></label>}
        {!isCfoComparison && <label>Measure<select value={metricIndex} onChange={e => setMetric(Number(e.target.value))}>{measures.map((m, i) => <option key={i} value={i}>{m.label}</option>)}</select></label>}
        {dated && <button onClick={sourcePeriod}>Use source date range</button>}
      </div>
      <div className={`cr-source-note ${isReference ? 'is-reference' : ''}`} role="note"><b>{isSchema ? 'Source-column demonstration · generated values, not actual operations' : isReference ? 'Reviewed reference export · not Selgros actuals' : selected === 'cr_actions' ? 'Local user-entered register' : 'Fictitious workflow demonstration · six stores, eight items'}</b><p>{isSchema ? `${original?._meta.caveat} ${original?._meta.synthetic_time_scope}` : isReference ? original?._meta.caveat : 'The dated workflow model demonstrates drilldowns and calculations. It is separate from both the reviewed exports and the original calibrated business history.'}</p><p>{measure.definition}</p>{!dated && <p>Reporting date is not supplied. Time filtering and current/reference comparison are unavailable for this source.</p>}{original?._meta.time_kind === 'snapshot' && <p>Complete snapshot as of {String(rows[0]?.snapshot_date ?? 'unavailable')} on or before the selected end date. Stock is not summed across dates.</p>}</div>
      {coverage && <p className="cr-pivot-note">Workflow reporting coverage: {coverage.start} to {coverage.end}. Representative dated observations; stock balances are month-end snapshots.</p>}
      {incompletePeriods.length > 0 && <div className="cr-coverage-warning" role="note"><b>{incompletePeriods.join(' and ')} period extends beyond available workflow history.</b> Observations outside {coverage!.start}–{coverage!.end} are unavailable, not zero. Current/reference totals do not represent complete comparable periods; do not interpret their difference as like-for-like performance. Select 2025 versus 2024 or January–August 2026 versus 2025 for full calendar coverage.</div>}
      <div className="cr-breadcrumbs"><button onClick={() => setFilters({})}>All records</button>{Object.entries(filters).map(([k, v]) => <button key={k} onClick={() => setFilters(f => { const n = { ...f }; delete n[k]; return n })}>{humaniseField(k)}: {v} ×</button>)}<span>{rows.length.toLocaleString('en-GB')} scoped rows</span></div>
      <details className="report-facet-disclosure"><summary>Report filters · {dimensions.length} dimensions{Object.keys(filters).length ? ` · ${Object.keys(filters).length} active` : ''}</summary><div className="cr-controls report-facets">{dimensions.filter(d => sourceRows.some(r=>r[d]!=null)).map(d => <label key={d}>{humaniseField(d)}<select value={filters[d] ?? ''} onChange={e=>setFilters(f=>{const next={...f};if(e.target.value)next[d]=e.target.value;else delete next[d];return next})}><option value="">All</option>{[...new Set(sourceRows.map(r=>String(r[d]??'Not supplied')))].sort().map(v=><option key={v}>{v}</option>)}</select></label>)}</div></details>
      {isCfoComparison && <CfoComparison key={selected} rows={rows} referenceRows={refRows} sourceRows={sourceRows} context={context} risk={pathname === '/revenue-quality'} dataset={selected} sourceLabel={original?._meta.data_label ?? 'Source unavailable'} scope={JSON.stringify(filters)} onFilter={(k,v)=>setFilters(f=>({...f,[k]:v}))} onScopeChange={setCfoScope}/>}
      {!isCfoComparison && <><div className="cr-kpis">
        <div><span>{measure.label}</span><strong>{format(currentValue, measure.unit)}</strong><small>{isReference ? 'Reviewed source population' : isSchema?'Source-column synthetic demonstration':'Workflow model population'}</small></div>
        <div><span>Reference value</span><strong>{format(referenceValue, measure.unit)}</strong><small>{dated ? `${ref.start} to ${ref.end}` : 'Reporting period required'}</small></div>
        <div><span>Current − reference</span><strong>{format(differences, measure.unit === '%' ? 'pp' : measure.unit)}</strong><small>{refRows.length.toLocaleString('en-GB')} reference records. {rows.length !== refRows.length && dated ? 'Population differs; check scope.' : ''}</small></div>
        <div><span>{measure.numerator || (measure.mode && !['sum','count'].includes(measure.mode)) ? 'Non-additive measure' : 'Per requested day'}</span><strong>{format(measure.numerator || (measure.mode && !['sum','count'].includes(measure.mode)) || !dated || original?._meta.time_kind === 'snapshot' || !dayCount(context.start, context.end) ? null : currentValue === null ? null : currentValue / dayCount(context.start, context.end), measure.unit)}</strong><small>Per-day values apply only to additive flows. Coverage may be incomplete.</small></div>
      </div>
      {rows.length === 0 ? <div className="cr-empty"><h3>No records in this context</h3><p>Adjust dates or clear the drilldown. Missing observations are not zero performance.</p>{dated && <button onClick={sourcePeriod}>Use source date range</button>}</div> : <div className="cr-chart-grid">
        <Card title={`${measure.label} by ${humaniseField(dimension).toLowerCase()}`} sub="Top 15 · select a bar to drill down">
          <ResponsiveContainer width="100%" height={330}><BarChart data={chartRows.slice(0, 15)} layout="vertical" margin={{ left: 4, right: 25, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" /><XAxis type="number" tick={{ fontSize: 12 }} /><YAxis dataKey={dimension} type="category" width={125} tick={{ fontSize: 12 }} tickFormatter={v => String(v).slice(0, 22)} /><Tooltip formatter={v => format(typeof v === 'number' ? v : null, measure.unit)} /><Bar dataKey="value" name={seriesLabel} fill="var(--accent)" radius={[0, 4, 4, 0]} onClick={r => drill(r[dimension])} cursor="pointer" /></BarChart></ResponsiveContainer>
          <div className="cr-drill-options" aria-label="Accessible drilldown">{chartRows.slice(0, 8).map((r, i) => <button key={i} onClick={() => drill(r[dimension])}>{String(r[dimension])}</button>)}</div>
        </Card>
        <Card title="Current-period trend" sub={`${humaniseField(context.grain)} · ${measure.unit}`}>
          {trend.length ? <ResponsiveContainer width="100%" height={330}><LineChart data={trend} margin={{ left: 10, right: 18, bottom: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="period" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={v => format(typeof v === 'number' ? v : null, measure.unit)} /><Line dataKey="value" name={seriesLabel} stroke="var(--accent)" strokeWidth={2.5} dot={trend.length < 30} connectNulls={false} /></LineChart></ResponsiveContainer> : <div className="cr-empty"><h3>{dated ? 'This source cannot support that time grain' : 'No dated time series'}</h3><p>{dated ? 'Choose month or a coarser dimension for monthly exports.' : 'A source snapshot date or transaction date is required. Download dates are not reporting dates.'}</p></div>}
        </Card>
      </div>}
      </>}
      {!isReference && !isSchema && room.kind === 'forecast' && <Card title="Demand plan reconciliation" sub="Demo actuals, frozen forecast and demo budget scenario">
        <ResponsiveContainer width="100%" height={300}><LineChart data={[...new Set(rows.map(r => String(r.month)))].sort().map(month => { const subset = rows.filter(r => r.month === month); return { month, Actual: sum(subset, 'actual_units'), Forecast: sum(subset, 'forecast_units'), 'Demo budget': sum(subset, 'budget_units') } })}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line dataKey="Actual" stroke="#172a46" /><Line dataKey="Forecast" stroke="#e20026" /><Line dataKey="Demo budget" stroke="#007f88" strokeDasharray="4 4" /></LineChart></ResponsiveContainer>
        <p>WAPE: {format(measureValue(rows, room.measures[2]), '%')}. Bias: {format(measureValue(rows, room.measures[3]), '%')}. The demonstration budget is a scenario, not an approved source budget.</p>
      </Card>}
      {selected === 'ref_stock_item' && <Card title="Historical sales and forward demand" sub="Relative months · pieces · snapshot anchor unavailable">
        <ResponsiveContainer width="100%" height={310}><BarChart data={[-6,-5,-4,-3,-2,-1,1,2,3,4,5,6].map(offset => {
          const field = offset < 0 ? `sales_minus_${-offset}_month_pcs` : offset < 3 ? `fc_plus_${offset}_month_pcs` : `fc_plus_${offset}month_pcs`
          const value = measureValue(rows, { label: field, field, unit: 'pcs', definition: 'Sum populated source cells' })
          return { offset: `M${offset > 0 ? '+' : ''}${offset}`, Sales: offset < 0 ? value : null, Forecast: offset > 0 ? value : null }
        })}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="offset" /><YAxis /><Tooltip /><Legend /><Bar dataKey="Sales" fill="#183963" /><Bar dataKey="Forecast" fill="#e20026" /></BarChart></ResponsiveContainer><p>Past sales and future forecast are different periods, not matched actual/forecast pairs. This chart cannot establish forecast accuracy or a calendar-month comparison.</p>
      </Card>}
      {selected === 'ref_customers' && <Card title="Customer value and gross margin" sub="Source customer observations · rounded margin percentages">
        <ResponsiveContainer width="100%" height={290}><ScatterChart><CartesianGrid stroke="var(--line)" /><XAxis dataKey="net_ron" name="Net sales" unit=" RON" type="number" /><YAxis dataKey="gross_margin_pct" name="Gross margin" unit="%" type="number" /><Tooltip /><Scatter name="Customer" data={rows} fill="#e20026" /></ScatterChart></ResponsiveContainer><p>HoReCa, resellers, other businesses and individuals have different order patterns and service needs. Sales and service require separate denominators; customer OTIF percentages must not be averaged into a network OTIF. Credit risk cannot be inferred from revenue alone.</p>
      </Card>}
      {selected === 'ref_firefighting' && <Card title="Date and promise exceptions" sub="Reference source · symptoms, not proven causes"><p>{rows.filter(r => r.customer_eta && r.order_date && String(r.customer_eta) < String(r.order_date)).length.toLocaleString('en-GB')} scoped rows have customer ETA before order date. {rows.filter(r => !r.actual_arrival).length.toLocaleString('en-GB')} have no actual arrival recorded. Use these evidence gaps to start an investigation; do not convert them into an OTIF score or monetary loss.</p></Card>}
      {!isReference && !isSchema && room.kind === 'stock' && <Card title="Cover and age risk" sub="Size = stock value · demo month-end snapshot">
        <ResponsiveContainer width="100%" height={300}><ScatterChart><CartesianGrid stroke="var(--line)" /><XAxis dataKey="cover_days" name="Cover" unit=" days" type="number" /><YAxis dataKey="age_days" name="Age" unit=" days" type="number" /><ZAxis dataKey="stock_value" range={[35, 250]} /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter name="Item/store" data={rows.slice(0, 300)} fill="#e20026" /></ScatterChart></ResponsiveContainer><p>{rows.filter(r => r.shelf_life_status === 'Expiry not supplied').length} rows have unknown expiry. {rows.filter(r => Number(r.shrink_units) > 0).length} have physical stock below the book balance. Validate counts and movements before attributing shrink.</p>
      </Card>}
      {rows.length > 0 && !isReference && !isSchema && !isCfoComparison && ['margin', 'promotion'].includes(room.kind) && <Card title="Revenue-to-contribution bridge" sub="Same scoped transaction population · RON">
        <div className="cr-bridge">{[['List value', 'list_value'], ['− Discounts', 'discount_value'], ['− Returns', 'returns_value'], ['= Net sales', 'net_sales'], ['− Actual COGS', 'cogs'], ['= Gross profit', 'gross_margin'], ['− Supply cost', 'supply_cost'], ['= Contribution', 'contribution']].map(([label, field]) => <div key={field}><span>{label}</span><b>{format(sum(rows, field))}</b></div>)}</div><p>Theoretical gross profit: {format(sum(rows, 'theoretical_margin'), 'RON')}. Cost-basis variance to realised gross profit: {format(sum(rows, 'gross_margin') - sum(rows, 'theoretical_margin'), 'RON')}. No causal promotion claim is inferred from this bridge.</p>
      </Card>}
      {rows.length > 0 && !isReference && !isSchema && room.kind === 'assortment' && <Card title="Next-price scenario" sub="Constant units and costs · not an approved price change">
        <label className="cr-inline-label">Change to realised net price (%)<input type="number" min={-90} max={100} step={0.5} value={priceChange} onChange={e => setPriceChange(Math.min(100, Math.max(-90, Number(e.target.value))))} /></label>
        <p>Scenario sales: <b>{format(sum(rows, 'net_sales') * (1 + priceChange / 100), 'RON')}</b>. Scenario gross profit: <b>{format(sum(rows, 'net_sales') * (1 + priceChange / 100) - sum(rows, 'cogs'), 'RON')}</b>. No demand elasticity, tax, agreement override or approval is assumed. Current price, next-price date and per-box conversion are available in the grid.</p>
      </Card>}
      {room.kind === 'logistics' && <Card title="Pallet exception threshold" sub="Review rule · not proof of an inventory error">
        <label className="cr-inline-label">{isReference ? 'Minimum deviating physical pallets per item' : 'Pallet-equivalent variance threshold'}<input type="number" min={1} max={100} value={palletThreshold} onChange={e => setPalletThreshold(Math.max(1, Number(e.target.value)))} /></label>
        <p>{palletExceptions === null ? 'Unavailable for this export. Paired physical pallet data is required.' : `${palletExceptions} ${isReference ? 'items meet the distinct-pallet review threshold. Partial pallets can be legitimate; matching ERP and LSP actual quantities are not supplied.' : 'demo item/store rows meet the pallet-equivalent variance threshold.'}`}</p>
      </Card>}
      {room.kind === 'finance' && <Card title="Prepare inventory-cost journal" sub="Review-only local draft · no ERP posting">
        <p>{isReference||isSchema ? 'This ledger schema does not contain paired GL entries or posting status. A balanced journal cannot be inferred from it.' : !rows.length ? 'Unposted inventory costs are unavailable: no records in this context.' : `${format(sum(rows, 'unposted_cost'), 'RON')} of demo inventory costs remain unposted.`}</p><button disabled={isReference || isSchema || !rows.length || sum(rows, 'unposted_cost') === 0} onClick={() => setJournal(true)}>Prepare balanced demo journal</button>
        {journal && !isReference && !isSchema && <div className="cr-journal"><p>Debit Inventory control: {format(sum(rows, 'unposted_cost'), 'RON')}</p><p>Credit Accrued inventory costs: {format(sum(rows, 'unposted_cost'), 'RON')}</p><b>Balance: 0 RON. Draft only. Finance approval and governed GL mapping remain required.</b></div>}
      </Card>}
      {REPORT_BY_PATH[pathname] && !isReference && !isSchema && selected === room.dataset && !isCfoComparison && <ReportVisuals report={REPORT_BY_PATH[pathname]} rows={rows} referenceRows={refRows} store={Object.fromEntries(Object.entries(reportStore).map(([key,d])=>[key,{...d,data:d.data.filter(r=>Object.entries(filters).every(([k,v])=>!(k in r)||String(r[k])===v))}]))} context={context} dataset={selected} onFilter={(k,v)=>setFilters(f=>({...f,[k]:v}))} />}
      {isSchema && <SourceSchemaVisuals dataset={selected} rows={rows} onFilter={(k,v)=>setFilters(f=>({...f,[k]:v}))}/>}
      {['firefighting', 'audit', 'pos-form'].includes(room.kind) && <DecisionRegister rows={decisions} onChange={setDecisions} domain={room.kind === 'audit' ? 'Audit' : 'POS performance'} />}
      {room.kind === 'audit' && <Card title="Requirements coverage" sub="25 separate report pages + 6 separate annex pages"><div className="cr-coverage">{CONTROL_COVERAGE.map(([id, title, path]) => <Link key={id} to={path}><span>{id}</span>{title}</Link>)}</div><p>Report availability is separate from data sufficiency and connection status. Open the dedicated copilot page to check the AI connection.</p></Card>}
      {room.kind === 'executive' && <nav className="cr-priorities" aria-label="Management workflow"><Link to="/sales">Commercial result and drilldown</Link><Link to="/stock-age">Working capital and expiry</Link><Link to="/service-level">Customer and supplier promises</Link><Link to="/firefighting">Investigations and owners</Link></nav>}
      <details className="cr-requirements"><summary>Required evidence and business definitions</summary><p>{room.required}</p><p>Do not join different item, customer or stock populations without a governed mapping. Missing records and invalid dates remain unavailable. Reference and demonstration layers never combine into one KPI.</p></details>
      {REPORT_BY_PATH[pathname]&&<SourceCoverage reportId={REPORT_BY_PATH[pathname].id}/>}
    </section>
    {children && <details className="cr-legacy"><summary>Original diagnostics · fixed source scope</summary><p>These original exhibits retain their original periods and definitions. The time controls and drilldown above do not recompute these fixed diagnostics.</p><div className="app-page-body">{children}</div></details>}
    {isCfoComparison && <p className="cr-pivot-note">The workbench and assistant follow the selected current comparison months, scenario and dimension filters. The comparison grid above retains both current and reference values.</p>}
    <AnalystWorkbench dataStore={analysisStore} configOverride={config} onDatasetChange={switchDataset}/>
  </>
}
