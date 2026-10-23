import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AdvancedDataGrid, { type AdvancedDataGridColumn } from './AdvancedDataGrid'
import { dashboardRegistry, dashboardSeries, dashboardValue, dimensionValue, filterDashboardRows, formatDashboardValue } from '@/lib/dashboard-data'
import { localDashboardPlan, validateDashboardPlan, type DashboardPlan } from '@/lib/dashboard-plan'
import { type DataRow, type RouteAnalytics, humaniseField } from '@/lib/analytics'
import type { Meta } from '@/lib/data'
import type { ReportTable } from '@/lib/exporters'
import './DashboardBuilder.css'

type Props = {
  route: string; dataset: string; rows: readonly DataRow[]; schemaRows: readonly DataRow[]; meta: Meta; config: RouteAnalytics
  contextHash: string; scope: string; mode: 'local' | 'openai' | 'cloudflare'; ready: boolean; safeForCloud: boolean
  grouped: boolean; onDetail: () => void; onCapture: (tables: ReportTable[]) => boolean
}
type SavedLayout = { id: string; plan: DashboardPlan; signature: string; savedAt: string }
const COLOURS = { blue: '#2463c7', teal: '#007c78', violet: '#7850b5', amber: '#a86b0d' }
const rowId = (_: DataRow, index: number) => index
const compact = (n: number) => new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export default function DashboardBuilder(props: Props) {
  const { route, dataset, rows, schemaRows, meta, config, contextHash, scope, mode, ready, safeForCloud, grouped, onDetail, onCapture } = props
  const registry = useMemo(() => dashboardRegistry(route, dataset, schemaRows, meta, config), [route, dataset, schemaRows, meta, config])
  const manifest = registry.manifest, signature = JSON.stringify(manifest)
  const storageKey = `controlroom-dashboard-v1:${route}:${dataset}:${meta.data_label}`
  const [question, setQuestion] = useState('Show the main KPIs, a breakdown and a trend for this view')
  const [plan, setPlan] = useState<DashboardPlan | null>(null), [planSignature, setPlanSignature] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<SavedLayout[]>([]), [selectedSaved, setSelectedSaved] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [origin, setOrigin] = useState('')
  const pending = useRef<AbortController | null>(null)
  const scopeKey = `${storageKey}|${contextHash}|${signature}|${mode}|${grouped}`
  const latest = useRef(scopeKey); latest.current = scopeKey
  const activePlan = !grouped && planSignature === signature ? plan : null
  useEffect(() => {
    pending.current?.abort(); pending.current = null; setBusy(false); setError(''); setFilters({})
  }, [scopeKey])
  useEffect(() => () => pending.current?.abort(), [])
  useEffect(() => {
    setPlan(null); setSelectedSaved(''); setNotice(''); setOrigin('')
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
      const layouts: SavedLayout[] = []
      if (Array.isArray(raw)) for (const item of raw.slice(0, 8)) {
        if (item && typeof item.id === 'string' && typeof item.savedAt === 'string' && item.signature === signature) {
          try { layouts.push({ id: item.id, savedAt: item.savedAt, signature, plan: validateDashboardPlan(item.plan, manifest) }) } catch { /* Ignore incompatible saved layouts. */ }
        }
      }
      setSaved(layouts)
    } catch { setSaved([]) }
  }, [storageKey, signature])
  const filteredRows = useMemo(() => filterDashboardRows(rows, filters), [rows, filters])
  const points = useMemo(() => activePlan?.charts.map(chart => {
    const measure = registry.measures.find(m => m.id === chart.measure)!
    const dimension = manifest.dimensions.find(d => d.id === chart.dimension)!
    return { chart, measure, dimension, series: dashboardSeries(filteredRows, chart.dimension, measure, dimension.temporal) }
  }) ?? [], [activePlan, filteredRows, registry, manifest])
  const columns = useMemo<AdvancedDataGridColumn<DataRow>[]>(() => [...new Set(schemaRows.flatMap(r => Object.keys(r)))].map((key, i) => ({ id: key, header: humaniseField(key), value: r => r[key], defaultHidden: i >= 10 })), [schemaRows])
  const generate = async (local = false) => {
    if (busy || pending.current || grouped || !question.trim() || !rows.length) return
    setError(''); setNotice('')
    if (local || mode === 'local' || !safeForCloud) {
      setPlan(localDashboardPlan(question, manifest)); setPlanSignature(signature); setOrigin('Local rule-based layout · no generative AI or external transfer'); setFilters({}); return
    }
    if (!ready) { setError('This AI service is not connected. Choose the local layout builder or refresh the assistant connection.'); return }
    const controller = new AbortController(); pending.current = controller; setBusy(true)
    const timer = window.setTimeout(() => controller.abort(), 45000)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/analyst/dashboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route, question: question.trim().slice(0, 500), manifest, provider: mode, classification: 'demonstration' }), signal: controller.signal })
      const result = await response.json() as { plan?: unknown; error?: string; model?: string; provider?: string }
      if (!response.ok) throw new Error(result.error ?? 'The dashboard could not be generated.')
      if (controller.signal.aborted || latest.current !== scopeKey) return
      if (mode === 'openai' && (result.provider !== 'OpenAI' || result.model !== 'gpt-5.6-sol')) throw new Error('The response did not come from the selected AI model.')
      setPlan(validateDashboardPlan(result.plan, manifest)); setPlanSignature(signature); setFilters({}); setSelectedSaved('')
      setOrigin(`AI-designed layout · ${result.provider} · ${result.model}`)
    } catch (failure) {
      if (latest.current === scopeKey && pending.current === controller) setError(controller.signal.aborted ? 'Dashboard generation stopped or timed out. You can retry or use the local builder.' : failure instanceof Error ? failure.message : 'Dashboard generation failed.')
    } finally {
      window.clearTimeout(timer)
      if (pending.current === controller) { pending.current = null; setBusy(false) }
    }
  }
  const persist = (next: SavedLayout[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaved(next); return true }
    catch { setError('This browser could not save the layout. Your current dashboard is still available.'); return false }
  }
  const save = () => {
    if (!activePlan) return
    const item = { id: crypto.randomUUID(), plan: activePlan, signature, savedAt: new Date().toISOString() }
    if (saved.length >= 8) { setError('Eight layouts are saved for this dataset. Remove one before saving another.'); return }
    if (persist([...saved, item])) { setSelectedSaved(item.id); setNotice('Layout saved in this browser. Records, filters and calculated values are not stored; loading recalculates using the current report scope.') }
  }
  const capture = () => {
    if (!activePlan) return
    const base = { dataset, contextHash, viewFingerprint: contextHash, grain: String(meta.grain ?? 'Source row grain'), source: `${meta.data_label}; ${meta.source ?? ''}`, viewState: `${scope}; ${filteredRows.length} supporting source records; dashboard filters: ${JSON.stringify(filters)}; layout: ${JSON.stringify(activePlan)}; ${origin}` }
    const tables: ReportTable[] = [{ ...base, id: crypto.randomUUID(), title: activePlan.title, grain: `One row per KPI; source grain: ${base.grain}`, sourceRowCount: activePlan.cards.length, headers: ['KPI', 'Value', 'Unit', 'Calculation', 'Status'], rows: activePlan.cards.map(c => { const m = registry.measures.find(x => x.id === c.measure)!; const v = dashboardValue(filteredRows, m); return [m.label, v.value, m.unit, m.definition, v.warning || 'Calculated from selected records'] }) }]
    points.forEach(({ measure, dimension, series }) => tables.push({ ...base, id: crypto.randomUUID(), title: `${measure.label} by ${dimension.label}`, grain: `One row per ${dimension.label}; source grain: ${base.grain}`, sourceRowCount: series.groupCount, headers: [dimension.label, measure.label, 'Unit', 'Source records', 'Status'], rows: series.points.map(p => [p.label, p.value, measure.unit, p.records, p.warning]), viewState: `${base.viewState}; ${series.points.length} of ${series.groupCount} groups shown; ${measure.definition}` }))
    if (!onCapture(tables)) { setError('There is not enough room in the 12-section report. Remove captured views and retry.'); return }
    setNotice('Dashboard KPI and chart-value tables added to the report composer. Use Export PDF or Export Excel above. The captured tables retain this scope.')
  }
  const drill = (dimension: string, label: string) => { setFilters(current => ({ ...current, [dimension]: label })); setNotice(`Drilled into ${humaniseField(dimension)}: ${label}. All dashboard values and supporting rows now use this selection.`) }
  return <section className="dashboard-builder" aria-labelledby="dashboard-builder-title">
    <header className="dashboard-builder__intro"><div><p className="analyst-kicker">From question to dashboard</p><h3 id="dashboard-builder-title">Build dashboard</h3><p>Choose a question. Explore the result. Every value is calculated by the report, not by AI.</p></div><span className="dashboard-builder__badge">Live selected records</span></header>
    {grouped ? <p className="dashboard-builder__warning">Switch the grid to detail rows before building a dashboard. This prevents double-counting grouped totals or averaging percentages. <button onClick={onDetail}>Use detail rows</button></p> : <>
      <form className="dashboard-builder__prompt" onSubmit={e => { e.preventDefault(); void generate() }}>
        <label htmlFor="dashboard-question">What dashboard would you like?</label>
        <textarea id="dashboard-question" maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Show sales and gross margin by category, with a monthly trend" />
        <div className="dashboard-builder__actions"><button className="dashboard-builder__primary" type="submit" disabled={busy || !question.trim() || !rows.length}>{busy ? 'Designing dashboard…' : 'Build dashboard'}</button>
          {busy ? <button type="button" onClick={() => pending.current?.abort()}>Cancel</button> : mode !== 'local' && safeForCloud && <button type="button" disabled={!rows.length || !question.trim()} onClick={() => void generate(true)}>Use local layout builder</button>}
          <small>{rows.length.toLocaleString('en-GB')} filtered source records · {mode === 'local' || !safeForCloud ? 'Local rule-based builder' : 'AI receives the question and field definitions only — no data rows.'}</small></div>
      </form>
      <details className="dashboard-builder__available"><summary>Available measures · {manifest.measures.length}</summary>{manifest.measures.map(m => <p key={m.id}><b>{m.label}{m.unit && ` (${m.unit})`}</b> — {m.definition}</p>)}<p>Only these measures are supported. Unsupported targets, period comparisons and formulas are not invented.</p></details>
      <div className="dashboard-builder__saved"><label>Saved layouts <select value={selectedSaved} onChange={e => { const item = saved.find(s => s.id === e.target.value); setSelectedSaved(e.target.value); if (item) { try { setPlan(validateDashboardPlan(item.plan, manifest)); setPlanSignature(signature); setFilters({}); setOrigin('Saved layout · recalculated on the current report scope'); setNotice('Loaded layout; the current reporting period and grid filters remain in effect.') } catch { setError('This layout no longer matches the report.') } } }}><option value="">Choose a layout</option>{saved.map(s => <option key={s.id} value={s.id}>{s.plan.title} · {s.savedAt.slice(0, 10)}</option>)}</select></label><button disabled={!selectedSaved} onClick={() => { if (persist(saved.filter(s => s.id !== selectedSaved))) { setSelectedSaved(''); setNotice('Saved layout removed from this browser. The displayed dashboard is unchanged.') } }}>Remove saved layout</button><span>Layouts are stored only in this browser.</span></div>
    </>}
    {error && <p className="dashboard-builder__warning" role="alert">{error}</p>}{notice && <p className="dashboard-builder__notice" role="status">{notice}</p>}
    {activePlan && <div className="dashboard-builder__result">
      <header><label className="dashboard-builder__title">Dashboard title<input value={activePlan.title} maxLength={100} onChange={e => setPlan({ ...activePlan, title: e.target.value || 'Selected report dashboard' })} /></label><div className="dashboard-builder__actions"><button onClick={save}>Save layout</button><button onClick={capture}>Add dashboard to PDF / Excel report</button></div></header>
      <p className="dashboard-builder__provenance">{origin}. {meta.data_label} · {filteredRows.length.toLocaleString('en-GB')} of {rows.length.toLocaleString('en-GB')} selected records · {String(meta.grain ?? 'Source row grain')}.</p>
      <details className="dashboard-builder__available"><summary>Reporting scope &amp; evidence</summary><p>{scope}</p><p>{String(meta.caveat ?? meta.disclaimer ?? '')}</p><p>Source: {meta.source ?? 'See report dataset metadata'} · Evidence: {contextHash}</p><p>Colour identifies a measure; it does not indicate performance against a target.</p></details>
      <div className="dashboard-builder__filters">
        {manifest.dimensions.slice(0, 8).map(d => { const options = [...new Set(rows.map(r => dimensionValue(r[d.id])))].sort(); return <label key={d.id}>{d.label}<select aria-label={`Dashboard filter ${d.label}`} value={filters[d.id] ?? ''} onChange={e => setFilters(current => { const next = { ...current }; if (e.target.value) next[d.id] = e.target.value; else delete next[d.id]; return next })}><option value="">All values</option>{options.slice(0, 500).map(o => <option key={o} value={o}>{o}</option>)}</select>{options.length > 500 && <small>First 500 values; narrow the source grid for more.</small>}</label> })}
        <button disabled={!Object.keys(filters).length} onClick={() => { setFilters({}); setNotice('Dashboard drilldown cleared. Source grid filters remain in effect.') }}>Reset dashboard filters</button>
      </div>
      {!!Object.keys(filters).length && <div className="dashboard-builder__breadcrumbs" aria-label="Active dashboard drilldown">{Object.entries(filters).map(([key, value]) => <button key={key} onClick={() => setFilters(current => { const next = { ...current }; delete next[key]; return next })}>{humaniseField(key)}: {value} ×</button>)}</div>}
      <div className="dashboard-builder__kpis">{activePlan.cards.map((card, i) => { const m = registry.measures.find(x => x.id === card.measure)!; const v = dashboardValue(filteredRows, m); return <article key={`${card.measure}-${i}`} className={`dashboard-kpi dashboard-kpi--${card.colour}`}><span>{m.label}</span><strong>{formatDashboardValue(v.value, m.unit)}</strong><p>{v.warning || m.definition}</p></article> })}</div>
      <div className="dashboard-builder__charts">{points.map(({ chart, measure, dimension, series }, index) => {
        const chartProps = { data: series.points, margin: { top: 12, right: 15, left: 8, bottom: 4 } }
        // Recharts 2 inspects direct children; a Fragment hides axes/tooltips.
        const axes = [<CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} />, <XAxis key="x" dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />, <YAxis key="y" tickFormatter={compact} width={66} tick={{ fontSize: 12 }} />, <Tooltip key="tooltip" formatter={(value: number) => formatDashboardValue(value, measure.unit)} />]
        const pick = (event: { activeLabel?: string | number }) => { if (event.activeLabel !== undefined) drill(chart.dimension, String(event.activeLabel)) }
        return <article className="dashboard-chart" key={`${index}-${chart.measure}-${chart.dimension}`}><header><h4>{measure.label}</h4><p>By {dimension.label} · {measure.unit || 'source units'}</p></header>
          <div className="dashboard-chart__controls"><label>Breakdown<select aria-label={`Chart ${index + 1} breakdown`} value={chart.dimension} onChange={e => setPlan({ ...activePlan, charts: activePlan.charts.map((c, i) => i === index ? { ...c, dimension: e.target.value, type: manifest.dimensions.find(d => d.id === e.target.value)?.temporal ? c.type : 'bar' } : c) })}>{manifest.dimensions.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label><label>Chart type<select aria-label={`Chart ${index + 1} type`} value={chart.type} onChange={e => setPlan({ ...activePlan, charts: activePlan.charts.map((c, i) => i === index ? { ...c, type: e.target.value as typeof c.type } : c) })}><option value="bar">Bars</option>{dimension.temporal && <><option value="line">Line</option><option value="area">Area</option></>}</select></label></div>
          <div className="dashboard-chart__canvas" role="img" aria-label={`${measure.label} by ${dimension.label}. The data table below provides values and keyboard drilldown.`}>{!series.points.length ? <p>No matching records. Clear a filter to restore the chart.</p> : <ResponsiveContainer width="100%" height={280}>{chart.type === 'bar' ? <BarChart {...chartProps} onClick={pick}>{axes}<Bar dataKey="value" fill={COLOURS[chart.colour]} radius={[5, 5, 0, 0]} isAnimationActive={false} /></BarChart> : chart.type === 'area' ? <AreaChart {...chartProps} onClick={pick}>{axes}<Area type="linear" dataKey="value" stroke={COLOURS[chart.colour]} fill={COLOURS[chart.colour]} fillOpacity={0.14} connectNulls={false} isAnimationActive={false} /></AreaChart> : <LineChart {...chartProps} onClick={pick}>{axes}<Line type="linear" dataKey="value" stroke={COLOURS[chart.colour]} strokeWidth={3} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} /></LineChart>}</ResponsiveContainer>}</div>
          <p>{series.points.length} of {series.groupCount} groups · {dimension.temporal ? 'Chronological order' : 'Highest values first'}. Click a point or use the table to drill down.</p>
          <details><summary>Chart data &amp; drilldown</summary><div className="dashboard-chart__table"><table><thead><tr><th>{dimension.label}</th><th>{measure.label}</th><th>Records</th></tr></thead><tbody>{series.points.map(p => <tr key={p.label}><td><button onClick={() => drill(chart.dimension, p.label)}>{p.label}</button></td><td title={p.warning}>{formatDashboardValue(p.value, measure.unit)}</td><td>{p.records}</td></tr>)}</tbody></table></div></details>
        </article>
      })}</div>
      <details className="dashboard-builder__evidence"><summary>Supporting data · {filteredRows.length.toLocaleString('en-GB')} source records</summary><p>These rows support the cards and charts above. Searching this inspection grid affects the grid only; use dashboard filters to recalculate the dashboard.</p><AdvancedDataGrid rows={filteredRows} columns={columns} getRowId={rowId} caption="Dashboard supporting data" csvFileName={`${dataset}-dashboard-evidence.csv`} initialPageSize={10} maxHeight={400} /></details>
    </div>}
  </section>
}
