import type { Dataset, DatasetName, DatasetStore, Meta } from './data'
import { aggregate, measureValue, type Measure } from './reporting'

export type DataRow = Record<string, unknown>

export type RouteAnalytics = Readonly<{
  title: string
  question: string
  defaultDataset: DatasetName
  datasets: readonly DatasetName[]
  dimension: string
  metric: string
  impact: string
  action: string
  prompts: readonly string[]
  measure?: Measure
  metricLabel?: string
  metricUnit?: string
}>

export type EvidencePoint = Readonly<{
  label: string
  value: string
  dataset: string
  grain: string
  source: string
}>

export type AnalystFinding = Readonly<{
  id: string
  severity: 'attention' | 'watch' | 'context'
  title: string
  observation: string
  whyItMatters: string
  checks: readonly string[]
  action: string
  confidence: 'High' | 'Medium' | 'Low'
  limitations: readonly string[]
  evidence: readonly EvidencePoint[]
}>

export type AnalystBrief = Readonly<{
  route: string
  title: string
  question: string
  contextHash: string
  generatedAt: string
  summary: string
  findings: readonly AnalystFinding[]
  datasets: readonly string[]
  rowCount: number
  completeness: number
  sourceLabels: readonly string[]
}>

const route = (
  title: string,
  question: string,
  defaultDataset: DatasetName,
  datasets: readonly DatasetName[],
  dimension: string,
  metric: string,
  impact: string,
  action: string,
  prompts: readonly string[],
): RouteAnalytics => ({
  title, question, defaultDataset, datasets, dimension, metric, impact, action, prompts,
})

export const ROUTE_ANALYTICS: Readonly<Record<string, RouteAnalytics>> = {
  '/': route('Executive pulse', 'Where does management attention create the most value now?', 'customer_scorecard',
    ['customer_scorecard', 'kpi_executive', 'sales_by_month', 'segments', 'segment_month', 'dq_gate', 'anchors', 'ext_sources'],
    'customer_name', 'net_ron', 'This concentrates the commercial and operational signals used for prioritisation.',
    'Assign an owner to the largest supported exception and validate it against the next reporting cut.',
    ['What needs attention now?', 'Show the strongest supported driver', 'What are the data limitations?', 'Recommend the next decision']),
  '/assortment': route('Assortment analyst', 'Where is assortment breadth creating value or unnecessary complexity?', 'category_month',
    ['category_month', 'assortment_mix', 'top_brands', 'origin_country', 'attribute_coverage'], 'cat_l1', 'net_ron',
    'Category concentration can expose both growth dependence and range rationalisation opportunities.',
    'Review the leading and trailing categories with availability, margin and attribute completeness together.',
    ['Which categories dominate?', 'Where is the long tail?', 'What should I validate?', 'Summarise the evidence']),
  '/segments': route('Customer segment analyst', 'Which customer cohorts are changing the value and service mix?', 'customer_scorecard',
    ['customer_scorecard', 'segments', 'segment_month', 'nps_by_segment_quarter'], 'customer_name', 'net_ron',
    'Customer concentration and experience signals influence retention and commercial focus.',
    'Prioritise a segment drill-down and test value, margin and service together before intervening.',
    ['Which segment leads?', 'Where is retention risk?', 'Compare value and service', 'What should sales check?']),
  '/network': route('Network analyst', 'Which locations need commercial or operational intervention?', 'store_performance',
    ['store_performance', 'market_master'], 'store_name', 'net_ron',
    'Location dispersion can reveal repeatable operating gaps that aggregate totals hide.',
    'Compare the most divergent locations on sales, availability and service before setting an owner.',
    ['Which store is the outlier?', 'Where is availability weakest?', 'Compare top and bottom', 'Recommend a network action']),
  '/margin': route('Margin and supply analyst', 'Where are margin, stock and fulfilment out of balance?', 'otif_month',
    ['otif_month', 'vat_split', 'stock_cover', 'pareto_margin'], 'store_name', 'otif_pct',
    'A service or stock imbalance can erode gross margin even when revenue appears stable.',
    'Validate the service exceptions against stock cover and margin concentration.',
    ['Where is service weakest?', 'What threatens margin?', 'Show the largest variation', 'What should supply check?']),
  '/pricing': route('Pricing analyst', 'Where do pricing and promotional mechanics create the largest decision gap?', 'sibiu_campaign',
    ['sibiu_campaign', 'offer_types', 'price_instruments', 'quantity_breaks', 'local_deviations'], 'name', 'discount_pct',
    'Large or inconsistent promotional mechanics can distort realised margin and customer trust.',
    'Review the extreme discounts and reconcile campaign, catalogue and local conditions.',
    ['Which discounts are extreme?', 'Where do prices diverge?', 'What needs validation?', 'Recommend a pricing check']),
  '/availability': route('Availability analyst', 'Where is availability constraining the customer promise?', 'availability_by_store',
    ['availability_by_store', 'availability_by_category', 'stock_refresh'], 'store_name', 'oos_pct',
    'Out-of-stock concentration points to the locations or categories with the clearest service risk.',
    'Investigate the highest supported out-of-stock rate and confirm freshness of the source snapshot.',
    ['Where is OOS highest?', 'Which location needs attention?', 'How fresh is the data?', 'Recommend the next check']),
  '/deposit-return': route('Deposit return analyst', 'Is the deposit-return flow balanced and operationally controlled?', 'sgr_flows',
    ['sgr_flows', 'sgr_catalog'], 'month', 'return_rate_pct',
    'A persistent sales-to-return imbalance can create working-capital and operational exceptions.',
    'Validate the lowest return periods against collection capacity and catalogue coverage.',
    ['How is the return rate moving?', 'Where is the imbalance?', 'What are the limits?', 'Recommend an operational check']),
  '/own-brands': route('Own-brand analyst', 'Which own-brand ranges deserve scale, repair or rationalisation?', 'own_brands',
    ['own_brands', 'own_brand_month'], 'brand', 'sku_count',
    'Range concentration helps distinguish scalable propositions from fragmented tail complexity.',
    'Review the largest ranges together with price position, offer exposure and category reach.',
    ['Which brands lead?', 'Where is the tail?', 'Compare offer exposure', 'What should category teams check?']),
  '/assortment-gaps': route('Assortment gap analyst', 'Which availability gaps carry the greatest supported value?', 'sol_gap_top',
    ['sol_gap_top', 'sol_stock_kpi', 'sol_gap_store', 'sol_gap_category', 'sol_store_archetype', 'sol_tail_category'],
    'store_name', 'gap_value_week_ron', 'Concentrated gaps identify where ranging or replenishment action is most material.',
    'Validate the highest-value gap by location, product and replenishment constraint before closing it.',
    ['Which gap is largest?', 'Where are gaps concentrated?', 'What should be fixed first?', 'Explain confidence']),
  '/transport': route('Transport analyst', 'Which routes offer the clearest capacity or distance improvement?', 'sol_routes',
    ['sol_routes', 'sol_transport_kpi', 'sol_hub_siting', 'sol_truck_fill', 'sol_route_summary', 'sol_cube_by_category', 'sol_transport_volume_month'],
    'route', 'fill_pct', 'Route dispersion can reveal capacity loss, avoidable distance and unstable frequency.',
    'Review the lowest-fill route with distance, stop count and service constraints before redesign.',
    ['Which route underfills?', 'Where is distance excessive?', 'Compare route extremes', 'Recommend a transport test']),
  '/replenishment': route('Replenishment analyst', 'Which policy best balances service, waste and cover?', 'sol_replenishment_summary',
    ['sol_replenishment_summary', 'sol_replenishment_kpi', 'sol_replenishment_overall', 'sol_shelf_classes', 'sol_case_sizes'],
    'policy', 'service_pct', 'Policy differences expose the trade-off between availability, waste and inventory.',
    'Pilot the strongest supported policy on a bounded category and track service plus waste together.',
    ['Which policy performs best?', 'What is the waste trade-off?', 'Where is evidence thin?', 'Design a safe pilot']),
  '/stock-age': route('Stock-age analyst', 'Where is ageing inventory tying up the most value?', 'ops_stock_old_category',
    ['ops_stock_old_category', 'ops_stock_age_kpi', 'ops_stock_age_bucket', 'ops_stock_reason', 'ops_pallet_reconcile'],
    'cat_l1', 'value_ron', 'Ageing value concentration identifies where working capital and obsolescence risk accumulate.',
    'Assign the largest ageing-value category for receipt, status and disposition validation.',
    ['Where is old stock concentrated?', 'What needs attention now?', 'Check pallet reconciliation', 'Recommend a stock action']),
  '/service-level': route('Service-level analyst', 'Where and why is fulfilment missing the promise?', 'ops_service_category',
    ['ops_service_category', 'ops_service_kpi', 'ops_service_direction', 'ops_service_reason', 'ops_service_store'],
    'cat_l1', 'otif_pct', 'Service dispersion shows where missed value and customer friction are concentrated.',
    'Validate the weakest category or direction against reason codes before assigning corrective action.',
    ['Where is OTIF weakest?', 'What value is missed?', 'Which direction drives the gap?', 'Recommend a service action']),
  '/order-delivery': route('Order and delivery analyst', 'Which open-order exceptions are most urgent?', 'ops_overdue_orders',
    ['ops_overdue_orders', 'ops_delivery_kpi', 'ops_open_category', 'ops_receiving_warehouse', 'ops_receiving_peak'],
    'order_id', 'value_open_ron', 'Overdue value and constrained allocation identify the orders with the greatest service exposure.',
    'Validate the highest-value overdue line and confirm allocation, promise date and receiving capacity.',
    ['Which orders are most exposed?', 'Where is capacity overloaded?', 'What should logistics check?', 'Summarise urgency']),
  '/transport-cost': route('Transport cost analyst', 'Where do invoiced transport costs diverge from provision?', 'ops_transport_variance',
    ['ops_transport_variance', 'ops_transport_cost_kpi', 'ops_transport_cost_type', 'ops_carrier_cost', 'ops_transport_account'],
    'shipment_id', 'diff_ron', 'Provision-to-invoice variance indicates where cost control or master data needs attention.',
    'Reconcile the largest absolute shipment variance with carrier, flow and account evidence.',
    ['Which variance is largest?', 'Which carrier needs review?', 'What drives cost?', 'Recommend a reconciliation']),
  '/forecast': route('Forecast analyst', 'Where is forecast error most material and biased?', 'ops_forecast_category',
    ['ops_forecast_category', 'ops_forecast_kpi', 'ops_forecast_horizon', 'ops_forecast_planner', 'ops_forecast_method'],
    'cat_l1', 'wape_pct', 'Forecast error concentration translates directly into stock, service and working-capital decisions.',
    'Challenge the highest-error category by horizon, bias, planner and method before changing parameters.',
    ['Where is WAPE highest?', 'Is bias systematic?', 'Compare methods', 'Recommend a forecast check']),
  '/customer': route('Customer risk analyst', 'Which customer exposures require controlled commercial action?', 'ops_customer_top',
    ['ops_customer_top', 'ops_customer_kpi', 'ops_customer_segment', 'ops_customer_risk', 'ops_customer_price'],
    'customer_name', 'exposure_pct', 'Concentrated exposure can combine credit, retention and commercial risk.',
    'Validate the largest exposure against credit status, recency and agreement terms with the account owner.',
    ['Which exposure is highest?', 'Where is data incomplete?', 'Compare risk and value', 'Recommend an account action']),
  '/finance': route('Finance control analyst', 'Which reconciliations carry the greatest financial exception?', 'ops_po_match',
    ['ops_po_match', 'ops_finance_kpi', 'ops_gl_account', 'ops_warehouse_cost', 'ops_supplier_fee'],
    'cat_l1', 'abs_diff_ron', 'Mismatch concentration indicates where close quality and working-capital controls need attention.',
    'Reconcile the category with the largest absolute difference and trace the affected postings.',
    ['Where is mismatch largest?', 'Is the ledger balanced?', 'What fees remain open?', 'Recommend a control check']),
  '/benchmark': route('Portfolio analyst', 'Which requested reports have the strongest source coverage?', 'cr_report_catalog',
    ['cr_report_catalog', 'cr_source_fields', 'cr_visual_definitions'],
    'report', 'source_schema_count', 'Source schema coverage is different from live data availability or a validated KPI.',
    'Review the documented evidence gap before presenting a demonstration as operational fact.',
    ['What should be prioritised?', 'Where is effort concentrated?', 'Which coverage gap matters?', 'Recommend a delivery sequence']),
  '/catalog': route('Solution catalog analyst', 'Which report definitions and source fields are available?', 'cr_report_catalog',
    ['cr_report_catalog', 'cr_source_fields', 'cr_visual_definitions'], 'report', 'source_schema_count',
    'The catalog reflects the current 31 report routes, supplied table schemas and reference visual definitions.',
    'Review evidence gaps, grain, measures and acceptance criteria before live deployment.',
    ['Which item is most complex?', 'Where is definition weak?', 'Compare domains', 'Recommend a design step']),
}

export function routeAnalytics(pathname: string): RouteAnalytics {
  return ROUTE_ANALYTICS[pathname] ?? ROUTE_ANALYTICS['/']
}

export function humaniseField(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function formatAnalyticalValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value)
  const lower = field.toLowerCase()
  if (lower.includes('pct') || lower.includes('rate') || lower.includes('share') || lower.includes('wape') || lower.includes('bias')) {
    return `${value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}%`
  }
  if (lower.includes('ron') || ['net_sales', 'gross_margin', 'theoretical_margin', 'contribution'].includes(lower)) {
    return `${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })} RON`
  }
  return value.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}

function firstLabel(row: DataRow, preferred: string): string {
  const preferredValue = row[preferred]
  if (typeof preferredValue === 'string' || typeof preferredValue === 'number') return String(preferredValue)
  const candidate = Object.entries(row).find(([, value]) => typeof value === 'string' && value.length > 0)
  return candidate ? String(candidate[1]) : 'Selected record'
}

function qualityOf(datasets: readonly Dataset[]): { completeness: number; cells: number } {
  let filled = 0
  let cells = 0
  for (const dataset of datasets) {
    for (const row of dataset.data.slice(0, 500) as DataRow[]) {
      for (const value of Object.values(row)) {
        cells += 1
        if (value !== null && value !== undefined && value !== '') filled += 1
      }
    }
  }
  return { completeness: cells ? (filled / cells) * 100 : 0, cells }
}

function confidenceFor(meta: Meta, rows: number): 'High' | 'Medium' | 'Low' {
  if (rows === 0) return 'Low'
  if (/demo|synthetic|engine|workflow/i.test(meta.data_label)) return 'Low'
  if (meta.source || meta.grain) return 'Medium'
  return 'Low'
}

function limitationsFor(meta: Meta): string[] {
  const limits = [meta.caveat, meta.disclaimer]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  const label = meta.data_label?.toLowerCase() ?? ''
  if (label.includes('synthetic') || label.includes('engine')) {
    limits.push('This is deterministic demonstration data; verify against governed operational records before action.')
  }
  return [...new Set(limits)].slice(0, 2)
}

function source(meta: Meta): string {
  return typeof meta.source === 'string' && meta.source.trim() ? meta.source : meta.data_label || 'Local dataset'
}

function hashText(text: string): string {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, '0')
}

export function contextFingerprint(pathname: string, store: DatasetStore, names: readonly DatasetName[]): string {
  const signature = names.map((name) => {
    const dataset = store[name]
    return `${name}:${contentHash(dataset?.data)}:${JSON.stringify(dataset?._meta ?? {})}`
  }).join('|')
  return `ctx-${hashText(`${pathname}|${signature}`)}`
}

const dataHashes = new WeakMap<object, string>()
function contentHash(rows: unknown[] | undefined): string {
  if (!rows) return ''
  const cached = dataHashes.get(rows); if (cached) return cached
  const hash = hashText(JSON.stringify(rows)); dataHashes.set(rows, hash); return hash
}

function rankRows(rows: readonly DataRow[], metric: string): Array<{ row: DataRow; value: number }> {
  const rankByMagnitude = /(diff|variance|bias)/i.test(metric)
  return rows
    .map((row) => ({ row, value: numberValue(row[metric]) }))
    .filter((item): item is { row: DataRow; value: number } => item.value !== null)
    .sort((a, b) => rankByMagnitude ? Math.abs(b.value) - Math.abs(a.value) : /(otif|on_time|in_full|return_rate|service_pct)/i.test(metric) ? a.value - b.value : b.value - a.value)
}

function fallbackMetric(rows: readonly DataRow[], requested: string): string {
  if (rows.some((row) => numberValue(row[requested]) !== null)) return requested
  const keys = rows.flatMap((row) => Object.keys(row)).filter((key, index, all) => all.indexOf(key) === index)
  return keys.find((key) => rows.some((row) => numberValue(row[key]) !== null)
    && !/(^|_)(id|lat|lon|seed|index|code|year|month|date)($|_)/i.test(key)) ?? requested
}

function statusFinding(config: RouteAnalytics, store: DatasetStore): AnalystFinding | null {
  for (const datasetName of config.datasets) {
    const dataset = store[datasetName]
    const row = dataset?.data[0] as DataRow | undefined
    if (!row) continue
    const status = Object.entries(row).find(([key, value]) => key.endsWith('_status')
      && typeof value === 'string' && ['red', 'yellow'].includes(value.toLowerCase()))
    if (!status) continue
    const statusMetric = status[0].replace(/_status$/, '')
    const metric = Object.keys(row).find((key) => key === statusMetric
      || (key.startsWith(`${statusMetric}_`) && numberValue(row[key]) !== null)) ?? statusMetric
    const metricValue = row[metric]
    if (metricValue === undefined) continue
    const statusValue = String(status[1])
    const severity = statusValue.toLowerCase() === 'red' ? 'attention' : 'watch'
    return {
      id: `${datasetName}-${metric}-status`, severity,
      title: `${humaniseField(metric)} is flagged ${statusValue}`,
      observation: `${humaniseField(metric)} is ${formatAnalyticalValue(metric, metricValue)} and carries a ${statusValue} status in the current snapshot.`,
      whyItMatters: config.impact,
      checks: ['Confirm the status threshold and reporting period.', `Drill into ${config.defaultDataset.replace(/_/g, ' ')} before attributing a cause.`],
      action: config.action,
      confidence: confidenceFor(dataset._meta, dataset.data.length),
      limitations: limitationsFor(dataset._meta),
      evidence: [{ label: humaniseField(metric), value: formatAnalyticalValue(metric, metricValue), dataset: datasetName,
        grain: dataset._meta.grain ?? 'Not specified', source: source(dataset._meta) }],
    }
  }
  return null
}

export function buildAnalystBrief(pathname: string, store: DatasetStore, override?: RouteAnalytics): AnalystBrief {
  const config = override ?? routeAnalytics(pathname)
  const selected = config.datasets.map((name) => store[name]).filter((dataset): dataset is Dataset => Boolean(dataset))
  const defaultData = store[config.defaultDataset] ?? { _meta: { data_label: 'Unavailable' }, data: [] }
  const rows = defaultData.data as DataRow[]
  const scopedMeasure = config.measure
  const explicitMetric = config.metricLabel !== undefined || config.metricUnit !== undefined
  const metric = scopedMeasure ? 'scoped_value' : explicitMetric ? config.metric : fallbackMetric(rows, config.metric)
  const ranked = scopedMeasure ? aggregate(rows, [config.dimension], scopedMeasure).map(r => ({ row: r, value: r.value })).filter((r): r is { row: DataRow; value: number } => typeof r.value === 'number').sort((a, b) => /^(OTIF|On time|In full)$/i.test(scopedMeasure.label) ? a.value - b.value : Math.abs(b.value) - Math.abs(a.value)) : rankRows(rows, metric)
  const displayMetric = (value: number) => scopedMeasure || config.metricUnit !== undefined ? `${value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}${(scopedMeasure?.unit ?? config.metricUnit) ? ` ${scopedMeasure?.unit ?? config.metricUnit}` : ''}` : formatAnalyticalValue(metric, value)
  const top = ranked[0]
  const bottom = ranked.at(-1)
  const evidence: EvidencePoint[] = []
  if (top) evidence.push({ label: firstLabel(top.row, config.dimension), value: displayMetric(top.value),
    dataset: config.defaultDataset, grain: defaultData._meta.grain ?? 'Not specified', source: source(defaultData._meta) })
  if (bottom && bottom !== top) evidence.push({ label: firstLabel(bottom.row, config.dimension), value: displayMetric(bottom.value),
    dataset: config.defaultDataset, grain: defaultData._meta.grain ?? 'Not specified', source: source(defaultData._meta) })

  const findings: AnalystFinding[] = []
  if (!scopedMeasure && explicitMetric && !ranked.length) {
    findings.push({ id: 'selected-measure-unavailable', severity: 'watch', title: `${config.metricLabel ?? humaniseField(config.metric)}: unavailable`, observation: 'The selected measure is unavailable in this filtered view. Missing values or invalid denominators are not zero performance.', whyItMatters: config.impact, checks: ['Check the selected numerator, denominator, units and source observations.'], action: config.action, confidence: 'Low', limitations: ['No other numeric field has been substituted for the selected measure.'], evidence: [] })
  }
  if (scopedMeasure) {
    const total = measureValue(rows, scopedMeasure), display = total === null ? 'unavailable' : `${total.toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${scopedMeasure.unit}`
    findings.push({ id: 'scoped-measure', severity: 'context', title: `${scopedMeasure.label}: ${display}`, observation: `${scopedMeasure.label} is ${display} for the current filtered population (${rows.length.toLocaleString('en-GB')} records).`, whyItMatters: config.impact, checks: [scopedMeasure.definition, 'Check missing values, period coverage and comparable populations before attributing causality.'], action: config.action, confidence: confidenceFor(defaultData._meta, rows.length), limitations: limitationsFor(defaultData._meta), evidence: [{ label: scopedMeasure.label, value: display, dataset: config.defaultDataset, grain: defaultData._meta.grain ?? 'Selected grid', source: source(defaultData._meta) }] })
  }
  const flagged = statusFinding(config, store)
  if (flagged) findings.push(flagged)
  if (top) {
    const bottomText = bottom && bottom !== top
      ? `; the other end of the comparable range is ${firstLabel(bottom.row, config.dimension)} at ${displayMetric(bottom.value)}`
      : ''
    findings.push({
      id: `${config.defaultDataset}-${metric}-range`, severity: flagged ? 'watch' : 'attention',
      title: `${firstLabel(top.row, config.dimension)}: ${(scopedMeasure?.label ?? config.metricLabel ?? humaniseField(metric)).toLowerCase()} review`,
      observation: `${firstLabel(top.row, config.dimension)} records ${displayMetric(top.value)}${bottomText}.`,
      whyItMatters: config.impact,
      checks: [`Confirm that ${humaniseField(metric).toLowerCase()} is comparable at grain “${defaultData._meta.grain ?? 'not specified'}”.`,
        'Use the grid to inspect adjacent measures; this ranking does not establish causality.'],
      action: config.action,
      confidence: confidenceFor(defaultData._meta, rows.length),
      limitations: limitationsFor(defaultData._meta),
      evidence,
    })
  }
  const quality = qualityOf(selected)
  findings.push({
    id: `${config.defaultDataset}-quality`, severity: quality.completeness >= 95 ? 'context' : 'watch',
    title: `Data completeness is ${quality.completeness.toFixed(1)}%`,
    observation: `${selected.reduce((sum, dataset) => sum + dataset.data.length, 0).toLocaleString('en-GB')} rows across ${selected.length} route datasets are available; sampled field completeness is ${quality.completeness.toFixed(1)}%.`,
    whyItMatters: 'A decision is only as reliable as its scope, grain, freshness and field coverage.',
    checks: ['Read the provenance and grain before combining conclusions.', 'Treat synthetic and external evidence as context, not verified operational fact.'],
    action: 'Resolve material source or completeness gaps before committing an irreversible decision.',
    confidence: quality.cells > 0 ? 'High' : 'Low',
    limitations: ['Completeness measures populated fields; it does not prove semantic accuracy.'],
    evidence: [{ label: 'Sampled completeness', value: `${quality.completeness.toFixed(1)}%`, dataset: config.datasets.join(', '),
      grain: 'Mixed — no automatic aggregation', source: 'Dataset metadata and populated-field scan' }],
  })

  const contextHash = `ctx-${hashText(`${contextFingerprint(pathname, store, config.datasets)}|${JSON.stringify({ dimension: config.dimension, metric: config.metric, label: config.metricLabel, unit: config.metricUnit, measure: config.measure })}`)}`
  const summary = findings.length
    ? `${findings[0].observation} ${findings[0].action}`
    : 'No supported numeric variation is available for this page. Inspect the dataset and provenance before making a decision.'
  return {
    route: pathname, title: config.title, question: config.question, contextHash,
    generatedAt: new Date().toISOString(), summary, findings: findings.slice(0, 3),
    datasets: config.datasets,
    rowCount: selected.reduce((sum, dataset) => sum + dataset.data.length, 0),
    completeness: quality.completeness,
    sourceLabels: [...new Set(selected.map((dataset) => source(dataset._meta)))],
  }
}

function looksLikePromptInjection(question: string): boolean {
  return /(ignore|override|reveal|show).{0,32}(instruction|prompt|secret|system)|api[_ -]?key|developer message/i.test(question)
}

export function answerAnalystQuestion(question: string, brief: AnalystBrief): string {
  const clean = question.trim().slice(0, 500)
  if (!clean) return 'Ask a question about the current page and I will answer from its bounded evidence packet.'
  if (looksLikePromptInjection(clean)) {
    return `I can only analyse the current page evidence. I cannot reveal instructions, credentials or hidden configuration. Context: ${brief.contextHash}.`
  }
  const lower = clean.toLowerCase()
  if (/(source|provenance|where.*data|fresh|quality|limit|confidence)/.test(lower)) {
    return `Evidence coverage: ${brief.rowCount.toLocaleString('en-GB')} rows across ${brief.datasets.length} allowed datasets, with ${brief.completeness.toFixed(1)}% sampled field completeness. Sources: ${brief.sourceLabels.slice(0, 3).join(' · ') || 'not supplied'}. Limitation: completeness does not prove semantic accuracy. Context: ${brief.contextHash}.`
  }
  if (/(why|driver|cause)/.test(lower)) {
    const finding = brief.findings.find((item) => item.evidence.length > 1) ?? brief.findings[0]
    return finding
      ? `${finding.observation} The current data supports comparison, not causality. Check: ${finding.checks.join(' ')} Evidence: ${finding.evidence.map((item) => `${item.label} ${item.value}`).join(' versus ')}. Context: ${brief.contextHash}.`
      : `No supported driver comparison is available in context ${brief.contextHash}.`
  }
  if (/(action|recommend|next|decision|do now)/.test(lower)) {
    return `${brief.findings.slice(0, 2).map((finding, index) => `${index + 1}. ${finding.action}`).join(' ')} Verify each action against its stated grain and limitations before execution. Context: ${brief.contextHash}.`
  }
  if (/(trend|change|moving|direction)/.test(lower)) {
    return `${brief.summary} The current evidence packet does not automatically treat row order as a time series; select a dated dataset in the report grid to validate direction. Context: ${brief.contextHash}.`
  }
  return `${brief.summary} Evidence: ${brief.findings[0]?.evidence.map((item) => `${item.label} ${item.value}`).join(' · ') || 'no material numeric evidence'}. Confidence: ${brief.findings[0]?.confidence ?? 'Low'}. Context: ${brief.contextHash}.`
}
