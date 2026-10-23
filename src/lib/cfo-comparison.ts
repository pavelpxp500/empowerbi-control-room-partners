import { dayCount, parseDay, rowInterval, type Measure } from './reporting'

export type CfoRow = Record<string, unknown>
export type CfoMetric = 'net_sales' | 'gross_profit' | 'margin_pct' | 'boxes' | 'units'
export const CFO_METRICS: { id: CfoMetric; label: string; unit: string }[] = [
  { id: 'net_sales', label: 'Net sales', unit: 'RON' },
  { id: 'gross_profit', label: 'Gross profit', unit: 'RON' },
  { id: 'margin_pct', label: 'Gross margin %', unit: '%' },
  { id: 'boxes', label: 'Equivalent boxes', unit: 'boxes' },
  { id: 'units', label: 'Base units', unit: 'units' },
]
export const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
export function cfoMeasure(metric:CfoMetric):Measure {
  const definition=CFO_METRICS.find(m=>m.id===metric)!
  return {label:definition.label,unit:definition.unit,field:metric==='gross_profit'?'gross_margin':metric,definition:'Same strict evaluator as the CFO comparison: complete populations, paired gross profit and sales, and matched sales/COGS fallback. Selected current months and scenario only.',evaluate:rows=>metricValue(rows,metric)}
}
// A partial cost population must not silently become a full-population margin.
export function completeSum(rows: readonly CfoRow[], field: string): number | null {
  if (!rows.length || rows.some(r => !finite(r[field]))) return null
  return rows.reduce((s, r) => s + (r[field] as number), 0)
}
export function grossProfit(rows: readonly CfoRow[]): number | null {
  const direct = completeSum(rows, 'gross_margin')
  if (direct !== null) return direct
  const sales = completeSum(rows, 'net_sales'), cost = completeSum(rows, 'cogs')
  return sales !== null && cost !== null ? sales - cost : null
}
export function metricValue(rows: readonly CfoRow[], metric: CfoMetric): number | null {
  if (metric === 'gross_profit') return grossProfit(rows)
  if (metric !== 'margin_pct') return completeSum(rows, metric)
  const sales = completeSum(rows, 'net_sales'), gp = grossProfit(rows)
  return sales !== null && sales > 0 && gp !== null ? gp / sales * 100 : null
}
export const delta = (current: number | null, reference: number | null) => current === null || reference === null ? null : current - reference
export const deltaPercent = (current: number | null, reference: number | null) => current === null || reference === null || reference <= 0 ? null : (current - reference) / reference * 100
export type ComparisonRow = CfoRow & { key: string; coverage: string; currentSales: number | null; referenceSales: number | null; salesDelta: number | null; salesDeltaPct: number | null; currentMetric: number | null; referenceMetric: number | null; metricDelta: number | null; metricDeltaPct: number | null; currentMargin: number | null; referenceMargin: number | null; marginGap: number | null; currentGP: number | null; referenceGP: number | null; gpDelta: number | null; assessment: string; suggestedOwner: string; nextCheck: string }
export function comparisonRow(key: string, current: readonly CfoRow[], reference: readonly CfoRow[], metric: CfoMetric): ComparisonRow {
  const currentSales = metricValue(current, 'net_sales'), referenceSales = metricValue(reference, 'net_sales')
  const currentMetric = metricValue(current, metric), referenceMetric = metricValue(reference, metric)
  const currentMargin = metricValue(current, 'margin_pct'), referenceMargin = metricValue(reference, 'margin_pct')
  const currentGP = grossProfit(current), referenceGP = grossProfit(reference), gpDelta = delta(currentGP, referenceGP), marginGap = delta(currentMargin, referenceMargin)
  const coverage = current.length && reference.length ? 'Both periods' : current.length ? 'Current only' : reference.length ? 'Reference only' : 'No observations'
  const assessment = coverage !== 'Both periods' ? 'Coverage change' : gpDelta === null || marginGap === null ? 'Missing financial inputs' : gpDelta < 0 ? 'Gross-profit decline' : marginGap < 0 ? (currentSales !== null && referenceSales !== null && currentSales > referenceSales ? 'Growth with margin dilution' : 'Margin-rate deterioration') : 'No deterioration in these measures'
  const nextCheck = coverage !== 'Both periods' ? 'Confirm store/customer/item coverage and dates before interpreting the variance.' : gpDelta === null || marginGap === null ? 'Reconcile dated net sales with matched COGS; confirm missing and non-positive denominators.' : gpDelta < 0 || (marginGap ?? 0) < 0 ? 'Check realised price, discounts, returns, supplier cost and category/customer mix. These are investigation hypotheses, not proven causes.' : 'Check sustainability, stock availability and the cost of servicing this growth.'
  return { key, coverage, currentSales, referenceSales, salesDelta: delta(currentSales, referenceSales), salesDeltaPct: deltaPercent(currentSales, referenceSales), currentMetric, referenceMetric, metricDelta: delta(currentMetric, referenceMetric), metricDeltaPct: metric === 'margin_pct' ? null : deltaPercent(currentMetric, referenceMetric), currentMargin, referenceMargin, marginGap, currentGP, referenceGP, gpDelta, assessment, suggestedOwner: coverage !== 'Both periods' || gpDelta === null ? 'Data owner / Finance' : 'Commercial finance', nextCheck }
}
export function compareGroups(current: readonly CfoRow[], reference: readonly CfoRow[], dimension: string, metric: CfoMetric): ComparisonRow[] {
  if (dimension === 'total') return [comparisonRow('Total', current, reference, metric)]
  const group = (rows: readonly CfoRow[]) => { const m = new Map<string, CfoRow[]>(); for (const r of rows) { const k = String(r[dimension] ?? 'Not supplied'); const set = m.get(k) ?? []; set.push(r); m.set(k, set) } return m }
  const c = group(current), r = group(reference)
  return [...new Set([...c.keys(), ...r.keys()])].sort().map(k => comparisonRow(k, c.get(k) ?? [], r.get(k) ?? [], metric))
}
export function monthKeys(start: string, end: string): string[] {
  if (!dayCount(start, end)) return []
  const d = parseDay(start)!, last = parseDay(end)!, keys: string[] = []
  d.setUTCDate(1)
  for (let i = 0; d <= last && i < 1200; i++, d.setUTCMonth(d.getUTCMonth() + 1)) keys.push(d.toISOString().slice(0, 7))
  return keys
}
export function selectMonths(rows: readonly CfoRow[], months: readonly string[]): CfoRow[] {
  return rows.filter(r => { const d = rowInterval(r); return !!d && months.includes(d.start.slice(0, 7)) })
}
export function monthlyComparison(current: readonly CfoRow[], reference: readonly CfoRow[], currentMonths: readonly string[], referenceMonths: readonly string[], metric: CfoMetric) {
  const group = (rows: readonly CfoRow[]) => { const m = new Map<string, CfoRow[]>(); for (const r of rows) { const d = rowInterval(r); if (!d) continue; const k = d.start.slice(0, 7); const a = m.get(k) ?? []; a.push(r); m.set(k, a) } return m }
  const c = group(current), r = group(reference)
  // Align requested calendar slots, never the observed rows: a missing February
  // must not shift March into the February comparison.
  return Array.from({ length: Math.max(currentMonths.length, referenceMonths.length) }, (_, i) => ({ slot: i + 1, currentMonth: currentMonths[i] ?? null, referenceMonth: referenceMonths[i] ?? null, Current: metricValue(c.get(currentMonths[i]) ?? [], metric), Reference: metricValue(r.get(referenceMonths[i]) ?? [], metric) }))
}
export function marginBridge(current: readonly CfoRow[], reference: readonly CfoRow[]) {
  const c = comparisonRow('Total', current, reference, 'gross_profit')
  if (c.currentSales === null || c.referenceSales === null || c.currentSales <= 0 || c.referenceSales <= 0 || c.currentGP === null || c.referenceGP === null) return []
  const salesEffect = (c.currentSales - c.referenceSales) * c.referenceGP / c.referenceSales
  const residual = c.currentGP - c.referenceGP - salesEffect
  return [
    { name: 'Reference gross profit', value: c.referenceGP, total: true },
    { name: 'Sales-value effect', value: salesEffect },
    { name: 'Margin-rate / mix effect', value: residual },
    { name: 'Current gross profit', value: c.currentGP, total: true },
  ]
}
