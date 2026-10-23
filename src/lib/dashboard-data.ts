import { CONTROL_ROOMS } from './control-room-model'
import { CFO_METRICS, cfoMeasure } from './cfo-comparison'
import { measureValue, type Measure } from './reporting'
import { humaniseField, type DataRow, type RouteAnalytics } from './analytics'
import type { Meta } from './data'
import type { DashboardManifest } from './dashboard-plan'

export type DashboardMeasure = Measure & { id: string }
export function dashboardRegistry(route: string, dataset: string, rows: readonly DataRow[], meta: Meta, config: RouteAnalytics) {
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))], has = (key?: string) => !!key && keys.includes(key)
  const room = CONTROL_ROOMS[route]
  const measures: DashboardMeasure[] = []
  const add = (m: Measure, id: string) => {
    if (m.mode !== 'count' && !m.evaluate && !(m.numerator ? has(m.numerator) && has(m.denominator) : has(m.field))) return
    if (measures.some(x => x.label === m.label && x.unit === m.unit)) return
    measures.push({ ...m, id })
  }
  if (config.defaultDataset === dataset && config.measure) add(config.measure, 'report-primary')
  if (room?.dataset === dataset) {
    if (['/current-reference', '/revenue-quality'].includes(route)) CFO_METRICS.forEach(m => add(cfoMeasure(m.id), `cfo-${m.id}`))
    else room.measures.forEach((m, i) => add(m, `report-${i}`))
  }
  // Ungoverned columns do not become invented additive KPIs. Min/max are
  // explicitly row-level observations and percentages are never summed.
  if (!measures.length) {
    const numeric = keys.filter(k => rows.some(r => typeof r[k] === 'number' && Number.isFinite(r[k])) && !/id$|year|code|source_unvalidated|unconfirmed/i.test(k))
    for (const key of numeric.slice(0, 3)) {
      const unit = /pct|percent/i.test(key) ? '%' : /_ron$/i.test(key) ? 'RON' : /days/i.test(key) ? 'days' : 'source units'
      add({ label: `Maximum row ${humaniseField(key)}`, field: key, mode: 'max', unit, definition: 'Maximum observed row value, not an aggregate total or a weighted rate. Verify source units and grain.' }, `max-${key}`)
    }
  }
  add({ label: 'Source records', mode: 'count', unit: 'records', definition: 'Count of all selected source records, not distinct customers, items or transactions.' }, 'records')
  const preferred = [...new Set(['reporting_period', config.dimension, ...(room?.dimensions ?? []), ...keys])]
  const dimensions = preferred.filter(k => has(k) && !/email|url|note|description|fingerprint|^(row_)?id$/i.test(k)
    && rows.some(r => typeof r[k] === 'string' || typeof r[k] === 'boolean')
    && rows.every(r => r[k] == null || ['string', 'boolean'].includes(typeof r[k]))).slice(0, 24).map(id => ({ id, label: humaniseField(id), temporal: /^(reporting_period|month|date|posting_date|snapshot_date|target_date|order_date|promised_date)$/.test(id) }))
  const manifest: DashboardManifest = { measures: measures.slice(0, 24).map(({ id, label, unit, definition }) => ({ id, label: label.slice(0, 160), unit: unit.slice(0, 50), definition: definition.slice(0, 600) })), dimensions }
  return { measures, manifest, source: meta.data_label }
}
export const dimensionValue = (v: unknown) => v == null || v === '' ? '(Not supplied)' : String(v)
export function filterDashboardRows(rows: readonly DataRow[], filters: Record<string, string>) {
  return rows.filter(r => Object.entries(filters).every(([key, value]) => dimensionValue(r[key]) === value))
}
export function dashboardValue(rows: readonly DataRow[], measure: Measure): { value: number | null; warning: string } {
  if (!rows.length) return { value: null, warning: 'No matching records.' }
  const currencies = new Set(rows.map(r => r.currency ?? r.currency_code).filter(v => v != null && v !== ''))
  const currencyUnit = /^[A-Z]{3}$/.test(measure.unit) ? measure.unit : null
  if (measure.mode !== 'count' && (currencies.size > 1 || (currencyUnit && [...currencies].some(v => v !== currencyUnit)))) return { value: null, warning: 'Currency mismatch. Filter to one matching currency; no conversion or mixed-currency calculation is allowed.' }
  const snapshots = new Set(rows.map(r => r.snapshot_date).filter(v => v != null))
  if (snapshots.size > 1 && measure.mode !== 'count') return { value: null, warning: 'Multiple stock snapshots: select one snapshot before calculating a balance.' }
  if (new Set(rows.map(r => r.Stock).filter(v => v != null)).size > 1 && measure.mode !== 'count') return { value: null, warning: 'Stock states can overlap. Filter to a single Stock state.' }
  const value = measure.mode === 'count' ? rows.length : measureValue(rows, measure)
  return { value: value !== null && Number.isFinite(value) ? value : null, warning: value === null ? 'Unavailable: missing inputs or an invalid denominator.' : '' }
}
export function dashboardSeries(rows: readonly DataRow[], dimension: string, measure: Measure, temporal: boolean) {
  const groups = new Map<string, DataRow[]>()
  for (const row of rows) { const key = dimensionValue(row[dimension]); if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(row) }
  const points = [...groups].map(([label, members]) => ({ label, ...dashboardValue(members, measure), records: members.length }))
  points.sort((a, b) => temporal ? a.label.localeCompare(b.label, 'en', { numeric: true }) : (b.value ?? -Infinity) - (a.value ?? -Infinity) || a.label.localeCompare(b.label))
  return { points: points.slice(0, temporal ? 60 : 15), groupCount: points.length }
}
export function formatDashboardValue(value: number | null, unit: string) {
  return value === null ? 'Unavailable' : `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: unit === 'records' ? 0 : 2 }).format(value)}${unit ? ` ${unit}` : ''}`
}
