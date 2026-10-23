/** Date-only reporting. All calculations use UTC; no browser-timezone shifts. */
export type Grain = 'day' | 'week' | 'iso-week' | 'month' | 'quarter' | 'calendar-year' | 'fiscal-year'
export type ReportContext = { start: string; end: string; grain: Grain; fiscalStart: number; comparison: 'previous' | 'year' | 'custom'; referenceStart: string; referenceEnd: string }
export const WORKFLOW_DEMO_PERIOD = { start: '2024-01-01', end: '2026-08-31' } as const
export const REPORT_PERIOD_PRESETS = [
  { id: '2026-ytd', label: '2026 · January–August', start: '2026-01-01', end: WORKFLOW_DEMO_PERIOD.end },
  { id: '2025', label: '2025 · Full year', start: '2025-01-01', end: '2025-12-31' },
  { id: '2024', label: '2024 · Full year', start: WORKFLOW_DEMO_PERIOD.start, end: '2024-12-31' },
  { id: '2026-08', label: 'August 2026', start: '2026-08-01', end: WORKFLOW_DEMO_PERIOD.end },
  { id: 'all', label: 'All 32 months · Jan 2024–Aug 2026', ...WORKFLOW_DEMO_PERIOD },
] as const
export const DEFAULT_REPORT_CONTEXT: ReportContext = { start: '2026-01-01', end: WORKFLOW_DEMO_PERIOD.end, grain: 'month', fiscalStart: 1, comparison: 'year', referenceStart: '2025-01-01', referenceEnd: '2025-08-31' }
export function periodOutsideCoverage(start: string, end: string, coverage: { start: string; end: string }): boolean {
  return dayCount(start, end) > 0 && (start < coverage.start || end > coverage.end)
}
const DAY = 86400000
export function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value ? d : null
}
export const dayString = (date: Date) => date.toISOString().slice(0, 10)
export function addDays(value: string, n: number): string { const d = parseDay(value); return d ? dayString(new Date(d.getTime() + n * DAY)) : '' }
export function dayCount(start: string, end: string): number { const a = parseDay(start), b = parseDay(end); return a && b && b >= a ? Math.round((+b - +a) / DAY) + 1 : 0 }
export function yearShift(value: string, years: number): string {
  const d = parseDay(value); if (!d) return ''
  const last = new Date(Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth() + 1, 0)).getUTCDate()
  return dayString(new Date(Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth(), Math.min(last, d.getUTCDate()))))
}
export function referenceRange(c: ReportContext): { start: string; end: string } {
  if (!dayCount(c.start, c.end)) return { start: '', end: '' }
  if (c.comparison === 'custom') return { start: c.referenceStart, end: c.referenceEnd }
  if (c.comparison === 'year') return { start: yearShift(c.start, -1), end: yearShift(c.end, -1) }
  const days = dayCount(c.start, c.end)
  return { start: addDays(c.start, -days), end: addDays(c.start, -1) }
}
export function isoWeek(value: string): string {
  const d = parseDay(value); if (!d) return ''
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  const week = Math.ceil((((+d - Date.UTC(year, 0, 1)) / DAY) + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}
export function periodKey(value: string, grain: Grain, fiscalStart = 1): string {
  const d = parseDay(value); if (!d) return 'Undated'
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), f = Math.min(12, Math.max(1, fiscalStart)) - 1
  const fy = y - (m < f ? 1 : 0)
  if (grain === 'day') return value
  if (grain === 'iso-week') return isoWeek(value)
  // Business week is labelled by its Monday, ISO week uses the ISO week-year.
  if (grain === 'week') return `Week of ${addDays(value, -((d.getUTCDay() + 6) % 7))}`
  if (grain === 'month') return value.slice(0, 7)
  if (grain === 'calendar-year') return String(y)
  if (grain === 'fiscal-year') return f === 0 ? `FY${fy}` : `FY${fy}/${String(fy + 1).slice(2)}`
  return f === 0 ? `${y}-Q${Math.floor(m / 3) + 1}` : `FY${fy}/${String(fy + 1).slice(2)}-Q${Math.floor(((m - f + 12) % 12) / 3) + 1}`
}
export function rowInterval(row: Record<string, unknown>): { start: string; end: string; field: string; monthly: boolean } | null {
  for (const field of ['date', 'posting_date', 'promised_date', 'snapshot_date', 'target_date', 'order_date', 'month', 'period']) {
    const v = row[field]
    if (parseDay(v)) return { start: String(v), end: String(v), field, monthly: false }
    if (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) && parseDay(`${v}-01`)) {
      const d = parseDay(`${v}-01`)!
      return { start: `${v}-01`, end: dayString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))), field, monthly: true }
    }
  }
  return null
}
export function filterPeriod<T extends Record<string, unknown>>(rows: readonly T[], start: string, end: string): T[] {
  if (!dayCount(start, end)) return []
  return rows.filter(r => { const interval = rowInterval(r); const declared = ['date', 'posting_date', 'promised_date', 'snapshot_date', 'target_date', 'order_date', 'month', 'period'].some(k => k in r); return interval ? interval.start >= start && interval.end <= end : !declared })
}
export function safeRatio(n: number, d: number): number | null { return d !== 0 && Number.isFinite(n) && Number.isFinite(d) ? n / d : null }
export function sum(rows: readonly Record<string, unknown>[], field: string): number { return rows.reduce((s, r) => s + (typeof r[field] === 'number' && Number.isFinite(r[field]) ? r[field] as number : 0), 0) }
export type Measure = { label: string; unit: string; field?: string; numerator?: string; denominator?: string; factor?: number; mode?: 'sum' | 'average' | 'min' | 'max' | 'count'; definition: string; evaluate?:(rows:readonly Record<string,unknown>[])=>number|null }
export function measureValue(rows: readonly Record<string, unknown>[], measure: Measure): number | null {
  if(measure.evaluate)return measure.evaluate(rows)
  if (!rows.length) return null
  if (measure.mode === 'count') return rows.length
  if (measure.numerator && measure.denominator) {
    const valid = rows.filter(r => typeof r[measure.numerator!] === 'number' && Number.isFinite(r[measure.numerator!]) && typeof r[measure.denominator!] === 'number' && Number.isFinite(r[measure.denominator!]))
    if (!valid.length) return null
    const result = safeRatio(sum(valid, measure.numerator), sum(valid, measure.denominator))
    return result === null ? null : result * (measure.factor ?? 1)
  }
  const values = rows.map(r => r[measure.field ?? '']).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!values.length) return null
  if (measure.mode === 'min') return Math.min(...values)
  if (measure.mode === 'max') return Math.max(...values)
  const total = values.reduce((a, b) => a + b, 0)
  return measure.mode === 'average' ? total / values.length : total
}
export function aggregate(rows: readonly Record<string, unknown>[], dimensions: string[], measure: Measure): Record<string, unknown>[] {
  const groups = new Map<string, { label: Record<string, unknown>; rows: Record<string, unknown>[] }>()
  for (const r of rows) {
    const vals = dimensions.map(d => r[d] ?? 'Not supplied'), key = JSON.stringify(vals)
    if (!groups.has(key)) groups.set(key, { label: Object.fromEntries(dimensions.map((d, i) => [d, vals[i]])), rows: [] })
    groups.get(key)!.rows.push(r)
  }
  return [...groups.values()].map(g => ({ ...g.label, value: measureValue(g.rows, measure), records: g.rows.length }))
}
export function lastSnapshot<T extends Record<string, unknown>>(rows: readonly T[], end: string): T[] {
  if (!parseDay(end)) return []
  const dates = rows.map(r => r.snapshot_date).filter((d): d is string => !!parseDay(d) && String(d) <= end).sort()
  const last = dates.at(-1)
  return last ? rows.filter(r => r.snapshot_date === last) : []
}

export function pivotRows(rows: readonly Record<string, unknown>[], group: string, pivot: string, measure: Measure): { rows: Record<string, unknown>[]; warning: string } {
  if (!group) return { rows: [...rows], warning: '' }
  if (!pivot) return { rows: aggregate(rows, [group], measure), warning: '' }
  const keys = [...new Set(rows.map(r => String(r[pivot] ?? 'Not supplied')))].sort()
  if (keys.length > 20) return { rows: [], warning: `${keys.length} pivot columns exceed the 20-column limit. Filter the page or select another pivot dimension; no columns were silently dropped.` }
  const groups = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) { const key = String(row[group] ?? 'Not supplied'); if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(row) }
  return { rows: [...groups.entries()].map(([key, members]) => ({ [group]: key, ...Object.fromEntries(keys.map(k => [`${pivot}: ${k}`, measureValue(members.filter(r => String(r[pivot] ?? 'Not supplied') === k), measure)])), total: measureValue(members, measure), records: members.length })), warning: '' }
}
