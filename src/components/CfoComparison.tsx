import { useCallback, useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from './Card'
import AdvancedDataGrid, { type AdvancedDataGridColumn, type AdvancedDataGridProjection } from './AdvancedDataGrid'
import { Waterfall } from './ReportVisuals'
import { CFO_METRICS, compareGroups, comparisonRow, finite, marginBridge, metricValue, monthKeys, monthlyComparison, selectMonths, type CfoMetric, type CfoRow, type ComparisonRow } from '@/lib/cfo-comparison'
import { referenceRange, type ReportContext } from '@/lib/reporting'
import { humaniseField } from '@/lib/analytics'
import { exportExcel, exportPdf, type ReportExport, type ReportTable } from '@/lib/exporters'

const MONEY = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const num = (v: unknown, digits = 1) => finite(v) ? v.toLocaleString('en-GB', { maximumFractionDigits: digits }) : 'Unavailable'
const signed = (v: unknown, suffix = '') => finite(v) ? `${v > 0 ? '+' : ''}${num(v, suffix.trim() === 'pp' ? 2 : 1)}${suffix}` : 'Unavailable'
const shortMonth = (v: string) => new Date(`${v}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const fingerprint = (value: string) => { let hash = 2166136261; for (const c of value) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619); return `cfo-${(hash >>> 0).toString(16).padStart(8,'0')}` }
const BREAKDOWNS = ['total', 'category', 'region', 'store', 'segment', 'customer', 'item', 'brand_type']
const comparisonRowKey = (row: ComparisonRow) => row.key

function MonthPicker({ label, months, excluded, onChange }: { label: string; months: string[]; excluded: string[]; onChange: (value: string[]) => void }) {
  const count = months.filter(m => !excluded.includes(m)).length
  return <details className="cfo-month-picker"><summary>{label}<strong>{count === months.length ? `All ${count} months` : `${count} of ${months.length} months`}</strong></summary>
    <div><button type="button" onClick={() => onChange([])}>Select all</button><button type="button" onClick={() => onChange(months)}>Clear</button>
      {months.map(m => <label key={m}><input type="checkbox" checked={!excluded.includes(m)} onChange={e => onChange(e.target.checked ? excluded.filter(v => v !== m) : [...excluded, m])}/>{shortMonth(m)}</label>)}
    </div>
  </details>
}

export type CfoScope={inputRows:CfoRow[];inputReference:CfoRow[];current:CfoRow[];metric:CfoMetric;dimension:string;summary:string;selection:string;dataset:string}
export default function CfoComparison({ rows, referenceRows, sourceRows, context, risk, dataset, sourceLabel, scope, onFilter, onScopeChange }: {
  rows: CfoRow[]; referenceRows: CfoRow[]; sourceRows: CfoRow[]; context: ReportContext; risk: boolean; dataset: string; sourceLabel: string; scope: string; onFilter: (key: string, value: string) => void;onScopeChange?:(scope:CfoScope)=>void
}) {
  const [metricChoice, setMetric] = useState<CfoMetric>('net_sales'), [breakdown, setBreakdown] = useState('category')
  const [currentScenario, setCurrentScenario] = useState(''), [referenceScenario, setReferenceScenario] = useState('')
  const [currentExcluded, setCurrentExcluded] = useState<string[]>([]), [referenceExcluded, setReferenceExcluded] = useState<string[]>([])
  const [exportState, setExportState] = useState(''), [exporting, setExporting] = useState(false)
  const [projectionState, setProjection] = useState<{ key: string; projection: AdvancedDataGridProjection<ComparisonRow> } | null>(null)
  const metric: CfoMetric = risk ? 'gross_profit' : metricChoice
  const metricInfo = CFO_METRICS.find(m => m.id === metric)!
  const ref = referenceRange(context)
  const currentMonths = useMemo(() => monthKeys(context.start, context.end), [context.start, context.end])
  const referenceMonths = useMemo(() => monthKeys(ref.start, ref.end), [ref.start, ref.end])
  const selectedCurrentMonths = useMemo(() => currentMonths.filter(m => !currentExcluded.includes(m)), [currentMonths, currentExcluded])
  const selectedReferenceMonths = useMemo(() => referenceMonths.filter(m => !referenceExcluded.includes(m)), [referenceMonths, referenceExcluded])
  const scenarios = useMemo(() => [...new Set(sourceRows.flatMap(r => typeof r.scenario === 'string' && r.scenario.trim() ? [r.scenario] : []))].sort(), [sourceRows])
  const cScenario = scenarios.includes(currentScenario) ? currentScenario : scenarios[0] ?? ''
  const rScenario = scenarios.includes(referenceScenario) ? referenceScenario : scenarios[0] ?? ''
  const current = useMemo(() => selectMonths(rows, selectedCurrentMonths).filter(r => !scenarios.length || r.scenario === cScenario), [rows, selectedCurrentMonths, scenarios, cScenario])
  const reference = useMemo(() => selectMonths(referenceRows, selectedReferenceMonths).filter(r => !scenarios.length || r.scenario === rScenario), [referenceRows, selectedReferenceMonths, scenarios, rScenario])
  const dimensions = useMemo(() => BREAKDOWNS.filter(k => k === 'total' || sourceRows.some(r => r[k] != null)), [sourceRows])
  const dimension = dimensions.includes(breakdown) ? breakdown : dimensions[0]
  const details = useMemo(() => compareGroups(current, reference, dimension, metric), [current, reference, dimension, metric])
  const total = useMemo(() => comparisonRow('Total', current, reference, metric), [current, reference, metric])
  const monthly = useMemo(() => monthlyComparison(current, reference, selectedCurrentMonths, selectedReferenceMonths, metric), [current, reference, selectedCurrentMonths, selectedReferenceMonths, metric])
  const bridge = useMemo(() => marginBridge(current, reference), [current, reference])
  const losses = useMemo(() => details.filter(r => r.gpDelta !== null).sort((a, b) => a.gpDelta! - b.gpDelta!).slice(0, 12), [details])
  const unpaired = details.filter(r => r.coverage !== 'Both periods').length
  const worst = losses.find(r => r.gpDelta! < 0)
  const missingCurrent = monthly.filter(r => r.currentMonth && r.Current === null).map(r => r.currentMonth)
  const missingReference = monthly.filter(r => r.referenceMonth && r.Reference === null).map(r => r.referenceMonth)
  const coverageNote = `${missingCurrent.length ? `Current months without a complete ${metricInfo.label.toLowerCase()} observation: ${missingCurrent.join(', ')}. ` : ''}${missingReference.length ? `Reference months without a complete ${metricInfo.label.toLowerCase()} observation: ${missingReference.join(', ')}. ` : ''}${selectedCurrentMonths.length !== selectedReferenceMonths.length ? 'The selections contain unequal numbers of months; absolute changes are not duration-adjusted.' : ''}`
  const performanceSummary = total.gpDelta === null ? 'A gross-profit comparison needs populated net sales and matched cost values in both selected periods.' : `Net sales changed by ${signed(total.salesDelta)} RON (${signed(total.salesDeltaPct, '%')}); gross profit changed by ${signed(total.gpDelta)} RON and gross margin by ${signed(total.marginGap, ' pp')}.${worst ? ` ${worst.key} has the largest matched-group gross-profit decline (${signed(worst.gpDelta)} RON).` : ' No matched group has a gross-profit decline.'}`
  const summary = coverageNote ? `Incomplete comparison. ${coverageNote} These totals are not a complete like-for-like performance comparison. ${performanceSummary}` : performanceSummary
  const viewKey = JSON.stringify({ context, dataset, scope, dimension, metric, cScenario, rScenario, selectedCurrentMonths, selectedReferenceMonths })
  useEffect(()=>onScopeChange?.({inputRows:rows,inputReference:referenceRows,current,metric,dimension,summary,selection:viewKey,dataset}),[onScopeChange,rows,referenceRows,current,metric,dimension,summary,viewKey,dataset])
  const onProjection = useCallback((projection: AdvancedDataGridProjection<ComparisonRow>) => setProjection({ key: viewKey, projection }), [viewKey])
  const columns = useMemo<AdvancedDataGridColumn<ComparisonRow>[]>(() => {
    const amount = (id: keyof ComparisonRow, header: string, percent = false, sign = false): AdvancedDataGridColumn<ComparisonRow> => ({ id: String(id), header, value: r => r[id], align: 'right', minWidth: 128, defaultHidden: metric === 'net_sales' && ['currentMetric','referenceMetric','metricDelta','metricDeltaPct'].includes(String(id)), render: r => <span className={sign && finite(r[id]) ? (r[id] as number) < 0 ? 'cfo-negative' : (r[id] as number) > 0 ? 'cfo-positive' : '' : ''}>{sign ? signed(r[id], percent ? (id === 'marginGap' || metric === 'margin_pct' && id === 'metricDelta' ? ' pp' : '%') : '') : `${num(r[id],percent ? 2 : 1)}${percent && finite(r[id]) ? '%' : ''}`}</span> })
    const out: AdvancedDataGridColumn<ComparisonRow>[] = [
      { id: 'key', header: dimension === 'total' ? 'Scope' : humaniseField(dimension), value: r => r.key, minWidth: 165, render: r => dimension === 'total' ? r.key : <button className="cfo-drill" onClick={() => onFilter(dimension, r.key)}>{r.key}</button> },
      amount('currentSales', 'Current sales · RON'), amount('referenceSales', 'Reference sales · RON'), amount('salesDelta', 'Sales Δ · RON', false, true), amount('salesDeltaPct', 'Sales Δ %', true, true),
      amount('currentMetric', `Current ${metricInfo.label} · ${metricInfo.unit}`, metric === 'margin_pct'), amount('referenceMetric', `Reference ${metricInfo.label} · ${metricInfo.unit}`, metric === 'margin_pct'), amount('metricDelta', `${metricInfo.label} Δ · ${metric === 'margin_pct' ? 'pp' : metricInfo.unit}`, metric === 'margin_pct', true),
      ...(metric === 'margin_pct' ? [] : [amount('metricDeltaPct', `${metricInfo.label} Δ %`, true, true)]),
      amount('currentMargin', 'Current gross margin %', true), amount('referenceMargin', 'Reference gross margin %', true), amount('marginGap', 'Margin gap · pp', true, true),
      { id: 'coverage', header: 'Coverage', value: r => r.coverage },
    ]
    if (risk) out.push({ id: 'assessment', header: 'Attention', value: r => r.assessment }, { id: 'suggestedOwner', header: 'Suggested reviewer', value: r => r.suggestedOwner }, { id: 'nextCheck', header: 'Next evidence check', value: r => r.nextCheck, minWidth: 280 })
    return out
  }, [dimension, metric, metricInfo, risk, onFilter])
  const exportView = async (kind: 'excel' | 'pdf') => {
    if (!projectionState || projectionState.key !== viewKey) { setExportState('The grid is updating. Please try again.'); return }
    setExporting(true); setExportState('')
    try {
      const p = projectionState.projection, limit = kind === 'pdf' ? 500 : 10000
      const metadata = JSON.stringify({ ...JSON.parse(viewKey), grid: { query: p.query, sort: p.sort, facets: p.facets }, periodAlignment: 'Ordered selected calendar-month slots; missing observations remain unavailable', currency: 'RON', sourceLabel })
      const contextHash = fingerprint(viewKey), viewFingerprint = fingerprint(metadata)
      const viewState = `Current ${context.start} to ${context.end}; reference ${ref.start} to ${ref.end}; ${dimension}; ${metricInfo.label}; ${selectedCurrentMonths.length}/${selectedReferenceMonths.length} months. Full selections in Context table.`
      const section = (id: string, title: string, headers: string[], data: unknown[][], grain: string, sourceRowCount = data.length): ReportTable => ({ id, title, headers, rows: data, dataset, contextHash, viewFingerprint, viewState, grain, source: sourceLabel, sourceRowCount })
      const title = risk ? 'Revenue Quality & Margin Risk' : 'Current vs Reference Comparison'
      const payload: ReportExport = { reportTitle: title, route: risk ? '/revenue-quality' : '/current-reference', brief: { route: risk ? '/revenue-quality' : '/current-reference', title, question: 'What changed, and which commercial evidence needs review?', contextHash, generatedAt: new Date().toISOString(), summary: `${viewState} ${summary} ${coverageNote} ${sourceLabel}. Gross profit = net sales minus matched COGS. VAT and refundable deposits are excluded. Completeness refers only to populated financial comparison inputs, not source-period coverage. Grid-only search/sort/columns do not change the page KPIs.`, findings: [], datasets: [dataset], rowCount: current.length + reference.length, completeness: total.gpDelta === null || total.currentSales === null || total.referenceSales === null ? 0 : 100, sourceLabels: [sourceLabel] }, sections: [
        section('context', 'Context · exact selections', ['Selection', 'Value'], [['Current date range',`${context.start} to ${context.end}`],['Reference date range',`${ref.start} to ${ref.end}`],['Current months',selectedCurrentMonths.join(', ') || 'None'],['Reference months',selectedReferenceMonths.join(', ') || 'None'],['Current scenario',cScenario || 'Observed sales · demonstration'],['Reference scenario',rScenario || 'Observed sales · demonstration'],['Breakdown',dimension],['Metric',metricInfo.label],['Page filters',scope],['Grid search',p.query || 'None'],['Grid sort',JSON.stringify(p.sort)],['Grid facets',JSON.stringify(p.facets)],['Month coverage',coverageNote || 'Each selected month has complete inputs for the selected metric; daily coverage not certified.'],['Currency','RON'],['Source',sourceLabel]], 'Context fields'),
        section('variance', `${title} · visible grid (${Math.min(p.rows.length, limit)} of ${p.rows.length} rows)`, p.columns.map(c => c.header), p.rows.slice(0, limit).map(r => p.columns.map(c => c.value(r))), dimension, p.rows.length),
        section('monthly', `Monthly ${metricInfo.label} · ${metricInfo.unit}`, ['Current month', 'Reference month', 'Current', 'Reference'], monthly.map(r => [r.currentMonth, r.referenceMonth, r.Current, r.Reference]), 'Selected calendar-month slot'),
        section('bridge', 'Gross-profit bridge · RON · full selected page scope', ['Step', 'Value', 'Endpoint'], bridge.map(r => [r.name, r.value, r.total ? 'Yes' : 'No']), 'Reconciled page total'),
      ] }
      if (kind === 'pdf') await exportPdf(payload); else await exportExcel(payload)
      setExportState(`${kind === 'pdf' ? 'PDF' : 'Excel'} prepared and download requested with selected periods, scope and visible variance columns.${p.rows.length > limit ? ` Limited to ${limit} of ${p.rows.length} grid rows.` : ''}`)
    } catch { setExportState('The export could not be created. Please retry. No report data was sent to an external service.') }
    finally { setExporting(false) }
  }
  const scenarioSelect = (label: string, value: string, set: (s: string) => void) => <label>{label}<select value={value} onChange={e => set(e.target.value)}>{scenarios.length ? scenarios.map(s => <option key={s}>{s}</option>) : <option value="">Observed sales · demonstration</option>}<option disabled>Budget / forecast · valued sales and costs required</option></select></label>
  return <section className="cfo-workspace" aria-label={risk ? 'Gross-profit risk comparison' : 'Commercial period comparison'}>
    <div className="cfo-context-grid">
      <div className="cfo-period current">{scenarioSelect('Current scenario', cScenario, setCurrentScenario)}<p>{context.start} → {context.end}</p><MonthPicker label="Current months" months={currentMonths} excluded={currentExcluded} onChange={setCurrentExcluded}/></div>
      <div className="cfo-period reference">{scenarioSelect('Reference scenario', rScenario, setReferenceScenario)}<p>{ref.start || 'Choose reference start'} → {ref.end || 'Choose reference end'}</p><MonthPicker label="Reference months" months={referenceMonths} excluded={referenceExcluded} onChange={setReferenceExcluded}/></div>
    </div>
    <p className="cfo-context-note">Date selectors above define the comparison; the paired bars retain a monthly view. Scenarios use separate valued observations when supplied; unit forecasts are not monetary budgets. Currency: RON. All figures exclude VAT and refundable deposits.</p>
    <div className="cfo-selectors">
      {!risk && <fieldset><legend>Metric</legend>{CFO_METRICS.map(m => <button key={m.id} aria-pressed={metric === m.id} disabled={metricValue(current, m.id) === null && metricValue(reference, m.id) === null} onClick={() => setMetric(m.id)}>{m.label}</button>)}</fieldset>}
      <fieldset><legend>{risk ? 'Watchlist breakdown' : 'Breakdown'}</legend>{dimensions.map(d => <button key={d} aria-pressed={dimension === d} onClick={() => setBreakdown(d)}>{humaniseField(d)}</button>)}</fieldset>
    </div>
    <div className="cfo-kpis">
      <div><span>Current net sales</span><strong>{num(total.currentSales, 0)} <small>RON</small></strong><p className={total.salesDelta !== null && total.salesDelta < 0 ? 'cfo-negative' : ''}>{signed(total.salesDelta)} RON · {signed(total.salesDeltaPct, '%')}</p><small>Reference: {num(total.referenceSales, 0)} RON</small></div>
      <div><span>Current gross margin</span><strong>{num(total.currentMargin, 2)}{total.currentMargin !== null ? '%' : ''}</strong><p>Reference: {num(total.referenceMargin, 2)}{total.referenceMargin !== null ? '%' : ''}</p><small>Weighted gross profit / net sales</small></div>
      <div><span>Gross margin gap</span><strong className={total.marginGap !== null && total.marginGap < 0 ? 'cfo-negative' : 'cfo-positive'}>{signed(total.marginGap, ' pp')}</strong><p>Current − reference</p><small>Percentage points, not percent growth</small></div>
      <div><span>Gross-profit variance</span><strong className={total.gpDelta !== null && total.gpDelta < 0 ? 'cfo-negative' : 'cfo-positive'}>{signed(total.gpDelta)} <small>RON</small></strong><p>Current GP: {num(total.currentGP, 0)} RON</p><small>Reference GP: {num(total.referenceGP, 0)} RON</small></div>
    </div>
    <aside className="cfo-reading" aria-live="polite"><b>CFO reading</b><p>{summary}</p>{coverageNote && <p>{coverageNote}</p>}{unpaired > 0 && <p>{unpaired} groups occur in only one period. Their missing counterpart is not assumed to be zero; investigate coverage before interpreting growth.</p>}</aside>
    {!risk ? <Card title={`Monthly ${metricInfo.label.toLowerCase()} · current vs reference`} sub={`${metricInfo.unit} · paired selected calendar months`}>
      <ResponsiveContainer width="100%" height={365}><BarChart data={monthly} margin={{ top: 12, right: 18, bottom: 15, left: 8 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4"/><XAxis dataKey="slot" tickFormatter={v => { const r = monthly[Number(v) - 1]; return r ? `${r.currentMonth ? shortMonth(r.currentMonth) : '—'} / ${r.referenceMonth ? shortMonth(r.referenceMonth) : '—'}` : '' }} tick={{fontSize: 12}} interval="preserveStartEnd"/><YAxis tickFormatter={v => MONEY.format(Number(v))}/><Tooltip content={({ active, payload, label }) => { const r = monthly[Number(label) - 1]; return active && r ? <div className="report-tooltip"><p>Current · {r.currentMonth ?? 'No selected month'}: {num(r.Current)} {metricInfo.unit}</p><p>Reference · {r.referenceMonth ?? 'No selected month'}: {num(r.Reference)} {metricInfo.unit}</p>{!payload?.length && <p>No observations in this slot.</p>}</div> : null }}/><Legend/><Bar dataKey="Current" fill="#173d65" maxBarSize={38} radius={[3,3,0,0]}/><Bar dataKey="Reference" fill="#e20026" maxBarSize={38} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>
      <p className="cfo-context-note">Selected months are paired in chronological order. Empty months retain their position; they are not zero. Partial date ranges remain partial and are not extrapolated.</p>
    </Card> : <div className="report-visual-grid">
      <Waterfall title="Gross-profit bridge · reference to current" entries={bridge} note="RON · reference + sales-value effect + margin-rate effect = current"/>
      <Card title="Gross-profit variance · losses first" sub={`RON · ${humaniseField(dimension)} · up to 12 matched groups`}>
        {losses.length ? <ResponsiveContainer width="100%" height={350}><BarChart data={losses} layout="vertical" margin={{right:25,left:4}}><CartesianGrid horizontal={false} stroke="var(--line)"/><XAxis type="number" tickFormatter={v=>MONEY.format(Number(v))}/><YAxis type="category" dataKey="key" width={125} tick={{fontSize:12}}/><Tooltip formatter={v=>`${signed(v)} RON`}/><Bar dataKey="gpDelta" name="Gross-profit variance" onClick={r=>dimension !== 'total' && onFilter(dimension,String(r.key))} cursor={dimension === 'total' ? 'default' : 'pointer'}>{losses.map(r=><Cell key={r.key} fill={r.gpDelta! < 0 ? '#b52b3c' : '#173d65'}/>)}</Bar></BarChart></ResponsiveContainer> : <p className="cr-empty">Comparable gross-profit observations are required in both periods.</p>}
      </Card>
    </div>}
    {risk && <details className="cfo-method"><summary>Bridge reconciliation and business interpretation</summary><p>Gross profit = net sales − matched cost of goods sold. Reference gross profit + (current sales − reference sales) × reference gross margin rate + the remaining margin-rate effect = current gross profit.</p><p>The sales-value effect includes quantity, realised price and mix; it is not an isolated volume effect. The second effect is a mathematical residual, not proof of a supplier-cost, promotion or shrink cause. No extra total is added after current gross profit.</p><p>Supply and fulfilment costs are reviewed separately in <Link to="/margin">Margin &amp; Supply</Link>. Supplier rebates, shrink and accounting adjustments require governed source definitions before being included.</p></details>}
    <section id="cfo-comparison-grid" className="cfo-grid-section"><header><div><h3>{risk ? 'Action watchlist' : 'Detailed variance grid'}</h3><p>Same page context · use search, sort and columns to build your view. Grid-only controls do not change the charts or KPI totals.</p></div><div className="cfo-export"><button disabled={exporting || !projectionState || projectionState.key !== viewKey} onClick={()=>void exportView('excel')}>Export comparison · Excel</button><button disabled={exporting || !projectionState || projectionState.key !== viewKey} onClick={()=>void exportView('pdf')}>Export comparison · PDF</button></div></header>
      <AdvancedDataGrid key={`${dataset}:${risk}:${dimension}:${metric}`} rows={details} columns={columns} getRowId={comparisonRowKey} caption={risk ? 'Gross-profit action watchlist' : 'Current and reference variance'} initialSort={{columnId:risk ? 'metricDelta' : 'currentSales',direction:risk ? 'asc' : 'desc'}} initialPageSize={25} csvFileName={risk ? 'gross-profit-watchlist.csv' : 'current-reference.csv'} onProjectionChange={onProjection} renderDetail={r=><div className="cfo-row-detail"><strong>{r.assessment}</strong><p>{r.nextCheck}</p><p>Suggested reviewer: {r.suggestedOwner}. This is a recommendation, not an assigned task or verified root cause.</p><Link to="/firefighting">Open the investigation register</Link></div>}/>
      <p role="status" className="cfo-export-status">{exportState}</p>
    </section>
  </section>
}
