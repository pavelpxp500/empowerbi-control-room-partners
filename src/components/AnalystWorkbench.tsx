import { useCallback, useEffect, useMemo, useState, useRef, type FormEvent } from 'react'
import { useLocation } from 'react-router'
import AdvancedDataGrid, {
  type AdvancedDataGridColumn,
  type AdvancedDataGridFacet,
  type AdvancedDataGridProjection,
  type FacetValue,
} from './AdvancedDataGrid'
import {
  answerAnalystQuestion,
  buildAnalystBrief,
  humaniseField,
  routeAnalytics,
  type DataRow,
  type RouteAnalytics,
} from '@/lib/analytics'
import { type DatasetName, type DatasetStore, type Meta } from '@/lib/data'
import { useReportStore, useReporting } from '@/lib/ReportingContext'
import { pivotRows, periodKey, rowInterval, type Measure } from '@/lib/reporting'
import { exportExcel, exportPdf, type ReportExport, type ReportTable } from '@/lib/exporters'
import { presentAnalystAnswer } from '@/lib/analyst-presentation'
import { describeGrid, groupedColumnLabel } from '@/lib/grid-semantics'
import { OFFLINE_EDITION } from '@/lib/runtime'
import DashboardBuilder from './DashboardBuilder'

type WorkbenchTab = 'interpretation' | 'assistant'
type AiMode = 'local' | 'openai' | 'cloudflare'
type ChatItem = Readonly<{ id: string; question: string; answer: string; provider?: AiMode; source?: string; contextHash?: string; viewState?: string; grain?: string; dataset?: string }>
const redactCloudText = (value: string) => value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email withheld]').replace(/https?:\/\/[^\s"<>]+/gi, '[URL withheld]')

function sessionHistory(pathname: string): ChatItem[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(`analyst-history:${pathname}`) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ChatItem => Boolean(item)
      && typeof item === 'object'
      && typeof (item as ChatItem).id === 'string'
      && typeof (item as ChatItem).question === 'string'
      && typeof (item as ChatItem).answer === 'string').slice(-8)
  } catch {
    return []
  }
}

function inferredColumns(rows: readonly DataRow[], meta?: Meta): AdvancedDataGridColumn<DataRow>[] {
  const schema = Array.isArray(meta?.columns) ? meta.columns as { key: string; sourceHeader?: string; label?: string; type?: string }[] : []
  const keys: string[] = schema.map(c => c.key)
  for (const row of rows) {
    for (const key of Object.keys(row)) if (!keys.includes(key)) keys.push(key)
  }
  const defaults = Array.isArray(meta?.defaultVisibleFields) ? meta.defaultVisibleFields as string[] : null
  return keys.map((key, index) => {
    const numeric = rows.some((row) => typeof row[key] === 'number' && Number.isFinite(row[key]))
    return {
      id: key,
      header: schema.find(c => c.key === key)?.sourceHeader ?? schema.find(c => c.key === key)?.label ?? humaniseField(key),
      value: (row) => row[key],
      align: numeric ? 'right' : 'left',
      minWidth: numeric ? 116 : 160,
      defaultHidden: defaults ? !defaults.includes(key) : index >= 16,
    }
  })
}

function inferredFacets(
  rows: readonly DataRow[],
  columns: readonly AdvancedDataGridColumn<DataRow>[],
): AdvancedDataGridFacet<DataRow>[] {
  const facets: AdvancedDataGridFacet<DataRow>[] = []
  const excludedField = /(^|_)(id|code|sku|ean|url|email|date|time|timestamp|description|note)($|_)/i

  for (const column of columns) {
    if (facets.length >= 3) break
    if (excludedField.test(column.id)) continue

    const options = new Map<string, FacetValue>()
    let unsuitable = false
    for (const row of rows) {
      const raw = column.value(row)
      if (raw === null || raw === undefined || raw === '') continue
      if (typeof raw !== 'string' && typeof raw !== 'boolean') {
        unsuitable = true
        break
      }
      const value = typeof raw === 'string' ? raw.trim() : raw
      if (value === '' || (typeof value === 'string' && value.length > 120)) {
        unsuitable = true
        break
      }
      options.set(`${typeof value}:${String(value)}`, value)
      if (options.size > 40) {
        unsuitable = true
        break
      }
    }

    if (unsuitable || options.size < 2) continue
    facets.push({
      id: `facet-${column.id}`,
      label: column.header,
      value: (row) => {
        const raw = column.value(row)
        if (typeof raw === 'string') return raw.trim() || undefined
        return typeof raw === 'boolean' ? raw : undefined
      },
      options: [...options.values()].map((value) => ({
        value,
        label: typeof value === 'boolean'
          ? (value ? 'Yes' : 'No')
          : (String(value).length > 60 ? `${String(value).slice(0, 57)}…` : String(value)),
      })),
    })
  }

  return facets
}

function getDataRowId(row: DataRow, index: number): string {
  return `${String(row.row_id ?? row.id ?? row.order_id ?? row.shipment_id ?? row.customer_id ?? row.sku ?? 'row')}:${index}`
}

function makeReportTable(
  projection: AdvancedDataGridProjection<DataRow>,
  datasetName: DatasetName,
  title: string,
  contextHash: string,
  grain: string,
  source: string,
  id = `${datasetName}-${Date.now()}`,
): ReportTable {
  const columns = projection.columns
  const viewState = [
    projection.query ? `Search: ${projection.query}` : 'Search: none',
    projection.sort ? `Sort: ${projection.sort.columnId} ${projection.sort.direction}` : 'Sort: source order',
    `Columns: ${columns.map((column) => column.id).join(', ')}`,
    `Rows: ${projection.rows.length}`,
    `Facet filters: ${JSON.stringify(projection.facets)}`,
    `Grain and report context: ${grain}`,
  ].join(' | ')
  let viewHash = 5381
  const signature = `${contextHash}|${datasetName}|${viewState}|${JSON.stringify(projection.facets)}`
  for (let index = 0; index < signature.length; index += 1) viewHash = ((viewHash << 5) + viewHash) ^ signature.charCodeAt(index)
  return {
    id,
    title,
    dataset: datasetName,
    headers: columns.map((column) => column.header),
    sourceRowCount: projection.rows.length,
    rows: projection.rows.slice(0, Math.min(10000, Math.floor(500000 / Math.max(1, columns.length)))).map((row) => columns.map((column) => column.csvValue
      ? column.csvValue(row)
      : column.value(row))),
    contextHash,
    viewFingerprint: `view-${(viewHash >>> 0).toString(16).padStart(8, '0')}`,
    viewState,
    grain,
    source,
  }
}

function statusLabel(severity: 'attention' | 'watch' | 'context'): string {
  if (severity === 'attention') return 'Needs attention'
  if (severity === 'watch') return 'Watch'
  return 'Context'
}

export default function AnalystWorkbench({ dataStore, configOverride, onDatasetChange }: { dataStore?: DatasetStore; configOverride?: RouteAnalytics; onDatasetChange?: (name: DatasetName) => void } = {}) {
  const { pathname } = useLocation()
  const filteredStore = useReportStore()
  const store = dataStore ?? filteredStore
  const config = configOverride ?? routeAnalytics(pathname)
  const { context } = useReporting()
  const [tab, setTab] = useState<WorkbenchTab>('assistant')
  const [assistantTask, setAssistantTask] = useState<'analyse' | 'dashboard'>('analyse')
  const [datasetName, setDatasetName] = useState<DatasetName>(config.defaultDataset)
  const [storedProjection, setProjection] = useState<AdvancedDataGridProjection<DataRow> | null>(null)
  const projectionRows=useRef<readonly DataRow[] | null>(null)
  const [reportTitle, setReportTitle] = useState(`${config.title} report`)
  const [sections, setSections] = useState<ReportTable[]>([])
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<ChatItem[]>([])
  const [aiServices, setAiServices] = useState({ openai: false, cloudflare: false, checking: true })
  const [aiMode,setAiMode]=useState<AiMode>('local'), [asking,setAsking]=useState(false), [aiError,setAiError]=useState('')
  const modeChosen = useRef(false)
  const requestRef=useRef<AbortController|null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const [exportStatus, setExportStatus] = useState('')
  const [groupBy, setGroupBy] = useState(''), [pivotBy, setPivotBy] = useState(''), [valueField, setValueField] = useState(''), [denominator, setDenominator] = useState(''), [aggregation, setAggregation] = useState('sum')
  const [ratioFormat,setRatioFormat]=useState('unit')
  const dataset = store[datasetName] ?? { _meta: { data_label: 'Unavailable' }, data: [] }
  const reportScope={...context,comparisonSelection:dataset._meta.comparison_selection??null}
  const inputRows = dataset.data as DataRow[]
  const sourceRows = useMemo(() => inputRows.map(r => {
    const interval = rowInterval(r)
    return interval && !(interval.monthly && ['day', 'week', 'iso-week'].includes(context.grain)) ? { ...r, reporting_period: periodKey(interval.start, context.grain, context.fiscalStart) } : r
  }), [inputRows, context.grain, context.fiscalStart])
  const rawColumns = useMemo(() => inferredColumns(sourceRows, dataset._meta), [sourceRows, dataset._meta])
  const numericColumns = useMemo(() => rawColumns.filter(c => sourceRows.some(r => typeof r[c.id] === 'number')), [rawColumns, sourceRows])
  const dimensionColumns = useMemo(() => rawColumns.filter(c => !numericColumns.some(n => n.id === c.id)), [rawColumns, numericColumns])
  const valueKey = numericColumns.some(c => c.id === valueField) ? valueField : numericColumns.find(c=>c.id===config.metric)?.id ?? numericColumns[0]?.id ?? ''
  const nonAdditive = new Set([...(Array.isArray(dataset._meta.non_additive_fields) ? dataset._meta.non_additive_fields as string[] : []), ...numericColumns.filter(c => /pct|percent|rate|price|cover|per_box|per_pallet|per_layer|age_days|days_without|source_unvalidated/.test(c.id)).map(c => c.id)])
  const groupingMeasure: Measure = useMemo(() => aggregation === 'ratio' ? { label: `${humaniseField(valueKey)} / ${humaniseField(denominator)}`, numerator: valueKey, denominator, factor: ratioFormat==='percent'?100:1, unit: ratioFormat==='percent'?'%':'per denominator unit', definition: 'Ratio of paired sums. Missing pairs are excluded; zero denominator is unavailable. Percent is appropriate only for compatible units.' } : { label: `${aggregation} ${humaniseField(valueKey)}`, field: valueKey, mode: aggregation as Measure['mode'], unit: '', definition: `User-selected ${aggregation} at the current filtered source grain. Do not combine unlike units.` }, [aggregation, valueKey, denominator,ratioFormat])
  const gridSemantics = describeGrid(groupBy, pivotBy, groupingMeasure, String(dataset._meta.grain ?? 'Not specified'))
  const capturedGrain = `${gridSemantics.grain}; ${gridSemantics.definition}; time context: ${JSON.stringify(reportScope)}`
  const unvalidatedField = /source_unvalidated|unconfirmed/.test(valueKey) || (aggregation === 'ratio' && /source_unvalidated|unconfirmed/.test(denominator))
  const overlappingStock=datasetName==='cr_schema_stock'&&new Set(sourceRows.map(r=>r.Stock)).size>1
  const blockedAggregation = groupBy && (overlappingStock&&['sum','ratio'].includes(aggregation)||(unvalidatedField && aggregation !== 'count') || (aggregation === 'sum' && nonAdditive.has(valueKey)) || (aggregation === 'ratio' && !denominator))
  const grouped = useMemo(() => blockedAggregation ? { rows: [], warning: overlappingStock ? 'Stock allocation states overlap. Select one Stock state in the report filters before summing pieces or calculating a ratio. Cross-state stock totals are not valid.' : unvalidatedField ? 'This source field has unvalidated or overloaded units. Inspect detail records; numeric aggregation is disabled until its meaning is confirmed.' : aggregation === 'sum' ? 'This field is non-additive. Use an explicit average, minimum, maximum, or a ratio of paired sums.' : 'Select the denominator for the ratio of sums.' } : pivotRows(sourceRows, groupBy, pivotBy, groupingMeasure), [sourceRows, groupBy, pivotBy, groupingMeasure, blockedAggregation, aggregation, unvalidatedField,overlappingStock])
  const rows = grouped.rows
  const projection=projectionRows.current===rows?storedProjection:null
  useEffect(() => {
    if (groupBy && !dimensionColumns.some(c => c.id === groupBy)) { setGroupBy(''); setPivotBy('') }
    if (pivotBy && !dimensionColumns.some(c => c.id === pivotBy)) { setPivotBy('') }
  }, [dimensionColumns, groupBy, pivotBy])
  const columns = useMemo(() => inferredColumns(rows, groupBy ? undefined : dataset._meta).map(column => ({ ...column, header: groupedColumnLabel(column.id, column.header, groupBy, pivotBy, gridSemantics.measureLabel) })), [rows, groupBy, pivotBy, dataset._meta, gridSemantics.measureLabel])
  const facets = useMemo(() => inferredFacets(rows, columns), [columns, rows])
  const brief = useMemo(() => buildAnalystBrief(pathname, { ...store, [datasetName]: { ...dataset, _meta: { ...dataset._meta, grain: gridSemantics.grain, report_context: JSON.stringify(context), grid_shape: JSON.stringify({ groupBy, pivotBy, aggregation, valueKey, denominator,ratioFormat, columns: projection?.columns.map(c => c.id), query: projection?.query, facets: projection?.facets, sort: projection?.sort }) }, data: projection ? [...projection.rows] : rows } }, { ...config, defaultDataset: datasetName, datasets: [datasetName], dimension: groupBy || config.dimension, metric: groupBy ? pivotBy ? 'total' : 'value' : config.metric, metricLabel: groupBy ? groupingMeasure.label : config.metricLabel, metricUnit: groupBy ? groupingMeasure.unit : config.metricUnit, measure: groupBy || datasetName !== config.defaultDataset ? undefined : config.measure }), [pathname, store, datasetName, dataset, projection, rows, config, context, groupBy, pivotBy, aggregation, valueKey, denominator,ratioFormat, gridSemantics.grain])
  const historyKey = `${pathname}:${brief.contextHash}`
  const safeForCloud=!OFFLINE_EDITION&&/DEMO|SYNTHETIC|FICTITIOUS/i.test(dataset._meta.data_label)&&!datasetName.startsWith('ref_')&&datasetName!=='cr_actions'
  const refreshAi = useCallback(async (signal?: AbortSignal) => {
    if (OFFLINE_EDITION) { setAiServices({ openai: false, cloudflare: false, checking: false }); setAiMode('local'); return }
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/analyst/status`, { signal })
      const status = response.ok ? await response.json() as { providers?: { openai?: { configured?: boolean }; cloudflare?: { configured?: boolean } } } : null
      if (signal?.aborted) return
      const openai = status?.providers?.openai?.configured === true, cloudflare = status?.providers?.cloudflare?.configured === true
      setAiServices({ openai, cloudflare, checking: false })
      if (!modeChosen.current) setAiMode(openai ? 'openai' : cloudflare ? 'cloudflare' : 'local')
    } catch { if (!signal?.aborted) setAiServices({ openai: false, cloudflare: false, checking: false }) }
  }, [])
  useEffect(() => { const controller = new AbortController(); void refreshAi(controller.signal); return () => { controller.abort(); requestRef.current?.abort() } }, [refreshAi])
  useEffect(()=>{requestRef.current?.abort();setAsking(false);setAiError('')},[historyKey])
  const openAssistant = useCallback(() => {
    setTab('assistant')
    document.getElementById('page-ai-assistant')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.analyst-ask textarea')?.focus({ preventScroll: true }))
  }, [])
  useEffect(() => { window.addEventListener('controlroom:open-assistant', openAssistant); return () => window.removeEventListener('controlroom:open-assistant', openAssistant) }, [openAssistant])
  const selectedMode = safeForCloud ? aiMode : 'local'
  const activeHistory = history.filter(item => item.contextHash === brief.contextHash)
  const cloudReady = selectedMode === 'openai' ? aiServices.openai : aiServices.cloudflare
  const cloudLabel = selectedMode === 'openai' ? 'GPT Sol · OpenAI' : 'Llama 3.3 · Cloudflare'

  useEffect(() => {
    setDatasetName(config.defaultDataset)
    setTab('assistant')
  }, [config.defaultDataset, config.title, pathname])

  useEffect(() => { setSections([]); setReportTitle(`${config.title} report`) }, [pathname])

  // Row identity rejects stale projections. Clearing here would overwrite the
  // child grid's first projection because child passive effects run first.
  useEffect(() => { setGroupBy(''); setPivotBy(''); setValueField(''); setDenominator(''); setAggregation('sum') }, [datasetName])

  useEffect(() => { setHistory(sessionHistory(historyKey)) }, [historyKey])

  const receiveProjection = useCallback((next: AdvancedDataGridProjection<DataRow>) => {
    projectionRows.current=rows
    setProjection(next)
  }, [rows])

  const activeScope=useRef(historyKey);activeScope.current=historyKey
  const ask = async (value: string) => {
    const clean = value.trim().slice(0, 500)
    if (!clean || asking || requestRef.current) return
    setAiError('')
    let answer=''
    if(selectedMode !== 'local'){
      if(!safeForCloud||!cloudReady){setAiError('The selected AI service is not connected. Choose Local evidence analyst or refresh the connection.');return}
      const controller=new AbortController();requestRef.current=controller;setAsking(true)
      const timeout=window.setTimeout(()=>controller.abort(),45000)
      try {
        const visibleColumns = projection?.columns ?? columns.filter(c => !c.defaultHidden)
        const packet = {title:config.title,businessQuestion:config.question,decisionLimits:config.impact,contextHash:brief.contextHash,dataset:datasetName,scope:reportScope,grain:gridSemantics.grain,rowCount:brief.rowCount,selectedMetric:groupBy?groupingMeasure:config.measure??config.metricLabel??config.metric,selectedBreakdown:groupBy||config.dimension,grid:{definition:gridSemantics.definition,search:projection?.query,facets:projection?.facets,sort:projection?.sort},columns:visibleColumns.map(c=>({key:c.id,label:c.header})),summary:brief.summary,findings:brief.findings.map(f=>({observation:f.observation,checks:f.checks,limitations:f.limitations,evidence:f.evidence.map(e=>({label:e.label,value:e.value}))})),sampleNote:'Up to six visible-column rows from this filtered grid, not the population. Samples may be omitted to fit the request. Never sum them as a report total. Aggregate report findings can reference the selected measure even when its column is hidden.',sampleRows:(projection?.rows??rows).slice(0,6).map(row => Object.fromEntries(visibleColumns.map(c => { const value = c.value(row); return [c.id, typeof value === 'string' ? value.slice(0,200) : value] })))}
        let evidence = redactCloudText(JSON.stringify(packet))
        while (evidence.length > 18000 && packet.sampleRows.length) { packet.sampleRows.pop(); evidence = redactCloudText(JSON.stringify(packet)) }
        if (evidence.length > 18000) throw new Error('This view has too much context. Select fewer columns or a narrower dataset and retry.')
        const conversation = activeHistory.filter(item => item.provider === selectedMode).slice(-4).map(item => ({question:redactCloudText(item.question).slice(0,500),answer:redactCloudText(item.answer).slice(0,3000)}))
        const response=await fetch(`${import.meta.env.BASE_URL}api/analyst/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({route:pathname,question:clean,evidence,history:conversation,provider:selectedMode,classification:'demonstration'}),signal:controller.signal})
        const result=await response.json() as {answer?:string;error?:string;provider?:string;model?:string}
        if(!response.ok||typeof result.answer!=='string')throw new Error(result.error??'The AI service did not return an answer.')
        if(controller.signal.aborted||activeScope.current!==historyKey)return
        if (selectedMode === 'openai' && (result.provider !== 'OpenAI' || result.model !== 'gpt-5.6-sol')) throw new Error('The AI provider did not match GPT Sol. No substituted answer was accepted.')
        answer=`${cloudLabel} · ${result.model}\n${result.answer}`
      }catch(error){if(requestRef.current===controller&&activeScope.current===historyKey)setAiError(controller.signal.aborted?'Request stopped or timed out. Please retry.':error instanceof Error?error.message:'AI request failed.');return}
      finally{window.clearTimeout(timeout);if(requestRef.current===controller){setAsking(false);requestRef.current=null}}
    }else answer=`Local calculation-based analyst\n${answerAnalystQuestion(clean,brief)}`
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question: clean,
      answer,
      provider:selectedMode,
      source:selectedMode !== 'local'?`${cloudLabel} interpretation · verify against report evidence`:'Local calculation-based interpretation',
      contextHash:brief.contextHash,viewState:JSON.stringify({...reportScope,grid:gridSemantics.definition}),grain:gridSemantics.grain,dataset:datasetName,
    }
    setHistory((current) => { const next = [...current, item].slice(-8); try { window.sessionStorage.setItem(`analyst-history:${historyKey}`, JSON.stringify(next)) } catch { /* Session-only memory fallback. */ } return next })
    setQuestion('')
  }

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    ask(question)
  }

  const captureCurrentView = () => {
    if (!projection || projection.columns.length === 0) return
    if(sections.length>=12){setExportStatus('The report already contains 12 views. Remove one before adding another.');return}
    const title = `${humaniseField(datasetName)} · ${projection.rows.length.toLocaleString('en-GB')} rows`
    const section = makeReportTable(
      projection, datasetName, title, brief.contextHash,
      capturedGrain,
      typeof dataset._meta.source === 'string' ? dataset._meta.source : dataset._meta.data_label,
    )
    setSections((current) => [...current, section].slice(0, 12))
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections((current) => {
      const next = [...current]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const renameSection = (id: string, title: string) => {
    setSections((current) => current.map((section) => section.id === id
      ? { ...section, title: title.slice(0, 80) }
      : section))
  }

  const exportPayload = (): ReportExport => {
    // Each captured view keeps its own immutable scope and provenance.
    const validSections = sections
    const currentSection = projection && projection.columns.length > 0
      ? makeReportTable(
        projection, datasetName, `Current view · ${humaniseField(datasetName)}`, brief.contextHash,
        capturedGrain,
        typeof dataset._meta.source === 'string' ? dataset._meta.source : dataset._meta.data_label,
        'current-view',
      )
      : null
    return {
      reportTitle: reportTitle.trim().slice(0, 96) || `${config.title} report`,
      route: pathname,
      brief,
      sections: validSections.length ? validSections : (currentSection ? [currentSection] : []),
    }
  }

  const runExport = async (format: 'pdf' | 'xlsx') => {
    setExporting(format)
    setExportStatus('')
    try {
      const payload = exportPayload()
      if (format === 'pdf') await exportPdf(payload)
      else await exportExcel(payload)
      setExportStatus(`${format === 'pdf' ? 'PDF' : 'Excel'} prepared and download requested. ${format === 'pdf' ? 'Maximum 500 rows per view; use Excel or CSV for more detail.' : 'Maximum 10,000 rows and 500,000 cells per view; use CSV for the full filtered grid.'}`)
    } catch {
      setExportStatus(`The ${format === 'pdf' ? 'PDF' : 'Excel'} report could not be generated. Please try again.`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <section className="analyst-workbench" aria-labelledby="analyst-workbench-title">
      <header className="analyst-workbench__head">
        <div>
          <p className="analyst-kicker">Decision intelligence</p>
          <h2 id="analyst-workbench-title">Analyst workbench</h2>
          <p>{config.question}</p>
        </div>
        <div className="analyst-head-actions">
          <button type="button" onClick={openAssistant}>Ask AI assistant</button>
          <button type="button" onClick={() => runExport('pdf')} disabled={Boolean(exporting)}>
            {exporting === 'pdf' ? 'Building PDF…' : 'Export PDF'}
          </button>
          <button type="button" onClick={() => runExport('xlsx')} disabled={Boolean(exporting)}>
            {exporting === 'xlsx' ? 'Building Excel…' : 'Export Excel'}
          </button>
        </div>
      </header>

      <p className="analyst-export-status" role="status" aria-live="polite">{exportStatus}</p>

      <div className="analyst-context" role="status">
        <span>{brief.rowCount.toLocaleString('en-GB')} route rows</span>
        <span>{brief.completeness.toFixed(1)}% sampled completeness</span>
      </div>
      <p className="cr-pivot-note">{dataset._meta.caveat ?? dataset._meta.disclaimer ?? 'Use the stated dataset grain and source before combining measures.'} {sourceRows.some(rowInterval) ? `Date basis: ${rowInterval(sourceRows.find(r => rowInterval(r)) ?? {})?.field}. Only wholly contained source periods are included.` : 'No supported date field: this dataset keeps its original fixed scope.'}</p>

      <section id="dynamic-report-grid" className="analyst-grid-shell" aria-labelledby="dynamic-report-grid-title">
        <header className="analyst-grid-shell__head">
          <div>
            <p className="analyst-kicker">Dynamic reporting</p>
            <h3 id="dynamic-report-grid-title">Build your data view</h3>
            <p>Choose a dataset, filter and arrange the columns, then capture the exact view for export.</p>
          </div>
          <span>{config.datasets.length} datasets available</span>
        </header>

        <div className="analyst-panel analyst-grid">
          <div className="report-builder__controls">
            <label>
              <span>Dataset</span>
              <select value={datasetName} onChange={(event) => {
                setDatasetName(event.target.value as DatasetName)
                onDatasetChange?.(event.target.value as DatasetName)
                setProjection(null)
              }}>
                {config.datasets.map((name) => (
                  <option key={name} value={name}>{String(store[name]?._meta.table_title ?? humaniseField(name))} · {store[name]?.data.length ?? 0} rows</option>
                ))}
              </select>
            </label>
            <label className="report-title-field">
              <span>Report title</span>
              <input value={reportTitle} maxLength={96} onChange={(event) => setReportTitle(event.target.value)} />
            </label>
            <button type="button" className="report-capture" onClick={captureCurrentView}
              disabled={!projection || projection.rows.length === 0}>+ Add current view</button>
          </div>
          <p className="report-builder__note">
            {rawColumns.length} fields available. Filters, search, sorting and visible columns are captured exactly. Different dataset grains remain separate.
          </p>
          <div className="cr-pivot-controls" aria-label="Dynamic grid grouping and pivot">
            <label>Row grouping<select value={groupBy} onChange={e => { setGroupBy(e.target.value); setProjection(null) }}><option value="">Detail rows</option>{dimensionColumns.map(c => <option key={c.id} value={c.id}>{c.header}</option>)}</select></label>
            {groupBy && <>
              <label>Pivot columns<select value={pivotBy} onChange={e => { setPivotBy(e.target.value); setProjection(null) }}><option value="">No column pivot</option>{dimensionColumns.filter(c => c.id !== groupBy).map(c => <option key={c.id} value={c.id}>{c.header}</option>)}</select></label>
              <label>Aggregation<select value={aggregation} onChange={e => { setAggregation(e.target.value); setProjection(null) }}>{[['sum', 'Sum'], ['average', 'Average (unweighted)'], ['min', 'Minimum'], ['max', 'Maximum'], ['count', 'Count records'], ['ratio', 'Ratio of paired sums']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              {aggregation !== 'count' && <label>{aggregation === 'ratio' ? 'Numerator' : 'Value field'}<select value={valueKey} onChange={e => { setValueField(e.target.value); setProjection(null) }}>{numericColumns.map(c => <option key={c.id} value={c.id}>{c.header}</option>)}</select></label>}
              {aggregation === 'ratio' && <label>Denominator<select value={denominator} onChange={e => { setDenominator(e.target.value); setProjection(null) }}><option value="">Choose denominator</option>{numericColumns.map(c => <option key={c.id} value={c.id}>{c.header}</option>)}</select></label>}
              {aggregation === 'ratio' && <label>Ratio display<select value={ratioFormat} onChange={e=>{setRatioFormat(e.target.value);setProjection(null)}}><option value="unit">Per-unit ratio (×1)</option><option value="percent">Percentage (×100, compatible units only)</option></select></label>}
              <button onClick={() => { setGroupBy(''); setPivotBy(''); setProjection(null) }}>Back to detail</button>
            </>}
          </div>
          <p className="cr-pivot-note">{grouped.warning || (groupBy ? `${groupingMeasure.definition} Grouping uses the page scope; changing the shape resets grid search and facets. Pivot totals recalculate from source rows, never from summed percentages.` : 'Choose row grouping and a value to build an on-the-fly report. Dated rows include the selected reporting period.')} PDF includes up to 500 rows per view; Excel up to 10,000 rows and 500,000 cells per view. CSV downloads the complete filtered grid.</p>
          {columns.length > 0 ? (
            <AdvancedDataGrid key={`${pathname}:${datasetName}:${groupBy}:${pivotBy}:${aggregation}:${valueKey}:${denominator}`} rows={rows} columns={columns} facets={facets}
              getRowId={getDataRowId}
              caption={`${humaniseField(datasetName)} dynamic report grid`}
              searchPlaceholder={`Search ${humaniseField(datasetName).toLowerCase()}…`}
              csvFileName={`${datasetName}.csv`} initialPageSize={25} maxHeight={520}
              onProjectionChange={receiveProjection} />
          ) : <div className="analyst-empty">This dataset has no rows available.</div>}

          <section className="report-composer" aria-labelledby="report-composer-title">
            <header><div><p className="analyst-kicker">Report composer</p><h3 id="report-composer-title">Captured views</h3></div>
              <button type="button" onClick={() => setSections([])} disabled={sections.length === 0}>Clear report</button></header>
            {sections.length === 0 ? (
              <p className="report-composer__empty">No captured views yet. Exports will use the current grid until you add views.</p>
            ) : (
              <ol>
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <span className="report-order">{String(index + 1).padStart(2, '0')}</span>
                    <div><input aria-label={`Title for report section ${index + 1}`} value={section.title}
                      onChange={(event) => renameSection(section.id, event.target.value)} />
                      <small>{section.dataset} · {section.rows.length} rows · {section.headers.length} columns</small></div>
                    <div className="report-item-actions">
                      <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label="Move section up">↑</button>
                      <button type="button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} aria-label="Move section down">↓</button>
                      <button type="button" onClick={() => setSections((current) => current.filter((item) => item.id !== section.id))} aria-label="Remove section">Remove</button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </section>

      <div id="page-ai-assistant" className="analyst-tabs" role="tablist" aria-label="Analyst workbench views">
        {([
          ['interpretation', 'Interpretation'],
          ['assistant', 'AI assistant'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" id={`analyst-tab-${id}`} aria-controls={`analyst-panel-${id}`} aria-selected={tab === id}
            className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'interpretation' && (
        <div className="analyst-panel" role="tabpanel" id="analyst-panel-interpretation" aria-labelledby="analyst-tab-interpretation">
          <div className="analyst-summary">
            <p className="analyst-summary__label">Executive read</p>
            <p>{brief.summary}</p>
          </div>
          <div className="analyst-findings">
            {brief.findings.map((finding, index) => (
              <details key={finding.id} className={`analyst-finding analyst-finding--${finding.severity}`} open={index === 0}>
                <summary>
                  <span className="analyst-severity">{statusLabel(finding.severity)}</span>
                  <b>{finding.title}</b>
                  <span>{finding.confidence} confidence</span>
                </summary>
                <div className="analyst-finding__body">
                  <div><h3>What we observe</h3><p>{finding.observation}</p></div>
                  <div><h3>Why it matters</h3><p>{finding.whyItMatters}</p></div>
                  <div><h3>What to check now</h3><ul>{finding.checks.map((check) => <li key={check}>{check}</li>)}</ul></div>
                  <div><h3>Confidence &amp; limitations</h3><p><b>{finding.confidence}.</b>{' '}{finding.limitations.join(' ') || 'No additional limitation supplied.'}</p></div>
                  <div className="analyst-evidence">
                    {finding.evidence.map((item) => (
                      <span key={`${item.dataset}-${item.label}`}>
                        <b>{item.label}: {item.value}</b>
                        <small>{item.dataset} · {item.grain}</small>
                      </span>
                    ))}
                  </div>
                  <p className="analyst-action"><b>Recommended reversible action:</b> {finding.action}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {tab === 'assistant' && (
        <div className="analyst-panel analyst-assistant" role="tabpanel" id="analyst-panel-assistant" aria-labelledby="analyst-tab-assistant">
          <div className="analyst-assistant__intro">
            <div>
              <span className="analyst-avatar" aria-hidden="true">AN</span>
              <div><b>{config.title}</b><p>{selectedMode !== 'local'?'Questions, a limited demo-data summary and recent conversation are sent to the AI service. Private reviewed exports stay local. Do not enter confidential information.':'Local calculation-based answers for the filtered view. No external data transfer.'}</p></div>
            </div>
            <button type="button" onClick={() => {setHistory([]);try{window.sessionStorage.removeItem(`analyst-history:${historyKey}`)}catch{}}} disabled={activeHistory.length === 0 || asking}>Clear history</button>
          </div>
          {OFFLINE_EDITION && <p className="analyst-connection-note" role="note">Offline edition: the local evidence analyst uses calculations from this view. Generative cloud AI is not included, and no questions are sent online.</p>}
          {!OFFLINE_EDITION && <details className="analyst-settings">
            <summary>Assistant settings</summary>
            <div className="analyst-connection-row">
            <label className="cr-inline-label">Analyst mode<select value={selectedMode} onChange={e=>{modeChosen.current=true;setAiMode(e.target.value as AiMode);setAiError('')}} disabled={asking}><option value="openai" disabled={!aiServices.openai||!safeForCloud}>GPT Sol · {aiServices.openai ? 'OpenAI' : 'connection required'}</option><option value="cloudflare" disabled={!aiServices.cloudflare||!safeForCloud}>Llama 3.3 · Cloudflare</option><option value="local">Local evidence analyst</option></select></label>
            <button type="button" disabled={asking} onClick={() => { modeChosen.current = false; void refreshAi() }}>Refresh connection</button>
            </div>
          {!aiServices.openai&&!aiServices.checking&&<p className="analyst-connection-note">GPT Sol is not connected yet. The site owner must add the OpenAI API key securely on the server. No key is requested or stored in this browser.</p>}
          </details>}
          {!OFFLINE_EDITION&&!safeForCloud&&<p>Private reviewed exports and user-entered case registers remain local. Choose a demonstration layer for cloud AI.</p>}
          <div className="analyst-prompts" aria-label="Assistant task">
            <button type="button" aria-pressed={assistantTask === 'analyse'} onClick={() => setAssistantTask('analyse')}>Analyse data</button>
            <button type="button" aria-pressed={assistantTask === 'dashboard'} onClick={() => setAssistantTask('dashboard')}>Build dashboard</button>
          </div>
          {assistantTask === 'dashboard' && <DashboardBuilder key={`${pathname}:${datasetName}`} route={pathname} dataset={datasetName} rows={projection?.rows ?? rows} schemaRows={sourceRows} meta={dataset._meta} config={config}
            contextHash={brief.contextHash} scope={`${capturedGrain}; page filters: ${String(dataset._meta.scope ?? 'none')}; source-grid search: ${projection?.query ?? ''}; source-grid facets: ${JSON.stringify(projection?.facets ?? {})}`} mode={selectedMode} ready={cloudReady} safeForCloud={safeForCloud} grouped={Boolean(groupBy)}
            onDetail={() => { setGroupBy(''); setPivotBy(''); setProjection(null) }} onCapture={tables => { if (sections.length + tables.length > 12) return false; setSections(current => [...current, ...tables]); setExportStatus('Dashboard tables captured with their reporting scope.'); return true }} />}
          {assistantTask === 'analyse' && <>
          {aiError&&<p role="alert">{aiError}</p>}{asking&&<p role="status">AI is interpreting the current view… <button onClick={()=>requestRef.current?.abort()}>Cancel</button></p>}
          <div className="analyst-prompts" aria-label="Suggested questions">
            {config.prompts.map((prompt) => <button key={prompt} type="button" disabled={asking} onClick={() => ask(prompt)}>{prompt}</button>)}
          </div>
          <div className="analyst-chat" aria-live="polite">
            {activeHistory.length === 0 ? (
              <div className="analyst-chat__empty"><b>Start with the decision, not the dashboard.</b><span>Ask what changed, what matters, what to verify, or what action the evidence supports.</span></div>
            ) : activeHistory.map((item) => (
              <article key={item.id}>
                <p className="analyst-question">{item.question}</p>
                <div className="analyst-answer"><b>Analyst</b><p>{presentAnalystAnswer(item.answer)}</p></div>
                <button disabled={sections.length>=12} onClick={()=>setSections(s=>[...s,{id:`${item.id}-${crypto.randomUUID()}`,title:item.question,dataset:item.dataset??datasetName,headers:['Question','Analyst interpretation'],rows:[[item.question,item.answer]],contextHash:item.contextHash??brief.contextHash,viewFingerprint:item.contextHash??brief.contextHash,viewState:item.viewState??JSON.stringify(context),grain:item.grain??'Current report view',source:item.source??(item.answer.startsWith('Cloud AI')?'Cloud AI interpretation':'Local evidence interpretation')}])}>Add answer to PDF / Excel report</button>
              </article>
            ))}
          </div>
          <form className="analyst-ask" onSubmit={submitQuestion}>
            <label htmlFor={`analyst-question-${brief.contextHash}`}>Ask about this page</label>
            <div><textarea id={`analyst-question-${brief.contextHash}`} value={question} maxLength={500}
              onChange={(event) => setQuestion(event.target.value)} placeholder="What needs management attention, and why?" />
              <button type="submit" disabled={!question.trim()||asking}>Analyse</button></div>
            <small>{question.length}/500 · Conversation resets when filters, metrics, breakdowns or visible columns change.</small>
          </form>
          </>}
        </div>
      )}

    </section>
  )
}
