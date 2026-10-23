import type { DatasetStore, Dataset } from './data'
export function buildSourceControls(store: DatasetStore): Dataset {
  const rows: Record<string, unknown>[] = []
  const check = (id: string, domain: string, rule: string, count: number | null, population: number, owner: string, evidence: string, severity = 'High') => {
    const validCount = typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : null
    rows.push({ id, domain, rule, issue_count: validCount, population: Number.isFinite(population) ? population : null, owner, severity, status: validCount === null ? 'Input missing' : validCount > 0 ? 'Needs review' : 'No exception detected', evidence })
  }
  const fc = store.ref_forecast, st = store.ref_stock_item, ff = store.ref_firefighting, pallets = store.ref_pallets, ledger = store.ref_ledger, states = store.ref_stock
  check('SRC-01', 'Forecast', 'Missing forecast cells', fc ? Number(fc._meta.omitted_null_rows) : null, fc ? Number(fc._meta.input_rows) : 0, 'Demand planning', 'Omitted dash cells remain unknown. A populated-only grid is not 100% source completeness.')
  check('SRC-02', 'Forecast', 'No approved budget / matched actuals / vintage', fc ? fc.data.length : null, fc?.data.length ?? 0, 'FP&A', 'Do not compute source forecast accuracy or budget variance until the missing datasets are mapped.')
  check('SRC-03', 'Stock', 'Missing snapshot date', st ? st.data.filter(r => !r.snapshot_date).length : null, st?.data.length ?? 0, 'Inventory owner', 'Relative-month sales and forecast cannot be assigned an absolute calendar date.')
  check('SRC-04', 'Stock', 'Overloaded source coverage field', st ? st.data.filter(r => Object.entries(r).some(([k, v]) => k.startsWith('source_unvalidated') && typeof v === 'number' && v > 13)).length : null, st?.data.length ?? 0, 'Demand planning', 'The reference defines values above 13 as forecast pieces, not months. Never average or sum this field.')
  check('SRC-05', 'Service', 'Customer ETA before order date', ff ? ff.data.filter(r => r.customer_eta && r.order_date && r.customer_eta < r.order_date).length : null, ff?.data.length ?? 0, 'Supply chain', 'Source chronology needs correction or an explained date-basis change. No silent date substitution.')
  check('SRC-06', 'Service', 'Repeated order keys', ff ? ff.data.length - new Set(ff.data.map(r => r.order_id)).size : null, ff?.data.length ?? 0, 'Logistics data owner', 'Retain the export row ID. Confirm order/line/shipment grain before deduplication.')
  check('SRC-07', 'Shelf life', 'Missing pallet batch', pallets ? pallets.data.filter(r => !r.batch_id).length : null, pallets?.data.length ?? 0, 'Warehouse', 'A blank batch is not proof of no expiry. Request batch-level shelf-life data.')
  check('SRC-08', 'Ledger', 'Quantity unit and currency unconfirmed', ledger?.data.length ?? null, ledger?.data.length ?? 0, 'Finance', 'Quantity equals one per source row. It cannot be interpreted as pieces or sales boxes.')
  check('SRC-09', 'Stock', 'Negative stock-state quantities', states ? states.data.filter(r => Object.entries(r).some(([k, v]) => k.endsWith('_pcs') && typeof v === 'number' && v < 0)).length : null, states?.data.length ?? 0, 'Inventory owner', 'Reconcile movement timing and stock-state definitions before replenishment.')
  const itemKeys = new Set(st?.data.map(r => r.item_id) ?? []), fcKeys = new Set(fc?.data.map(r => r.item_id) ?? [])
  check('SRC-10', 'Item mapping', 'Forecast items unmatched to stock item', fc && st ? [...fcKeys].filter(k => !itemKeys.has(k)).length : null, fcKeys.size, 'Master data', 'An inner join would discard these items. Keep unmatched demand visible.')
  check('SRC-11', 'Service', 'OTIF denominator unavailable', ff?.data.length ?? null, ff?.data.length ?? 0, 'Supply chain', 'Delivery status lacks ordered/delivered quantities and contractual eligibility. No source OTIF calculated.')
  const dep = store.ref_stock_department
  const total = (ds: Dataset | undefined, field: string) => ds?.data.reduce((a, r) => a + (typeof r[field] === 'number' ? r[field] : 0), 0) ?? null
  const itemTotal = total(st, 'on_stock_pcs'), depTotal = total(dep, 'on_stock_pcs')
  check('SRC-12', 'Reconciliation', 'Item / department population mismatch', itemTotal !== null && depTotal !== null ? Number(Math.abs(itemTotal - depTotal) > 0.001) : null, st?.data.length ?? 0, 'Inventory owner', `Item and department scopes differ. Difference in stock pieces: ${itemTotal !== null && depTotal !== null ? (depTotal - itemTotal).toLocaleString('en-GB') : 'not available'}. Do not concatenate or join on department alone.`)
  return { _meta: { data_label: 'REFERENCE DATA · CALCULATED CONTROLS', source: 'Reviewed source schemas and row-level validation', grain: 'control rule with its own population; counts are not additive', caveat: 'A structural check does not prove commercial truth. Issue counts overlap and must not be summed as distinct affected records.', non_additive_fields: ['issue_count', 'population'] }, data: rows }
}
