import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createWorkflowDemo } from './control-room-model'
import { prepareSchemaDemo } from './source-schema'
import { coverageDatasets } from './coverage-data'

export type Meta = {
  data_label: string
  source?: string
  generated_at?: string
  etl_version?: string
  grain?: string
  row_count?: number
  seed?: number
  seeds?: number[]
  disclaimer?: string
  assumptions?: string[]
  real_fields?: string[]
  inputs_real?: string[]
  inputs_synthetic?: string[]
  caveat?: string
  method?: string
  [k: string]: unknown
}
export type Dataset<T = Record<string, any>> = { _meta: Meta; data: T[] }
export type DatasetStore = Record<string, Dataset>
type LoadState = { complete: boolean; errors: string[] }

export const DATASETS = [
  'kpi_executive', 'sales_by_month', 'assortment_mix', 'category_month', 'top_brands',
  'attribute_coverage', 'origin_country', 'segments', 'segment_month', 'customer_scorecard',
  'nps_by_segment_quarter', 'market_master', 'store_performance', 'stock_cover', 'otif_month',
  'vat_split', 'pareto_margin', 'offer_types', 'quantity_breaks', 'price_instruments',
  'local_deviations', 'sibiu_campaign', 'availability_by_store', 'availability_by_category',
  'stock_refresh', 'sgr_catalog', 'sgr_flows', 'own_brands', 'own_brand_month',
  'dq_gate', 'anchors', 'ext_sources',
  'sol_stock_kpi', 'sol_gap_store', 'sol_gap_category', 'sol_gap_top', 'sol_store_archetype',
  'sol_tail_category', 'sol_transport_kpi', 'sol_hub_siting', 'sol_truck_fill', 'sol_routes',
  'sol_route_summary', 'sol_cube_by_category', 'sol_transport_volume_month',
  'sol_replenishment_kpi', 'sol_replenishment_summary', 'sol_replenishment_overall',
  'sol_shelf_classes', 'sol_case_sizes',
  'ops_stock_age_kpi', 'ops_stock_age_bucket', 'ops_stock_reason', 'ops_pallet_reconcile',
  'ops_stock_old_category',
  'ops_service_kpi', 'ops_service_direction', 'ops_service_reason', 'ops_service_store',
  'ops_service_category',
  'ops_delivery_kpi', 'ops_open_category', 'ops_overdue_orders', 'ops_receiving_warehouse',
  'ops_receiving_peak',
  'ops_transport_cost_kpi', 'ops_transport_cost_type', 'ops_carrier_cost',
  'ops_transport_variance', 'ops_transport_account',
  'ops_forecast_kpi', 'ops_forecast_horizon', 'ops_forecast_planner', 'ops_forecast_method',
  'ops_forecast_category',
  'ops_customer_kpi', 'ops_customer_segment', 'ops_customer_risk', 'ops_customer_top',
  'ops_customer_price',
  'ops_finance_kpi', 'ops_gl_account', 'ops_po_match', 'ops_warehouse_cost', 'ops_supplier_fee',
  'benchmark_catalog', 'benchmark_portfolio', 'benchmark_sprints', 'benchmark_coverage', 'benchmark_domain_stage',
] as const
export type DatasetName = (typeof DATASETS)[number] | `cr_${string}` | `ref_${string}`

const Ctx = createContext<DatasetStore>({})
const LoadCtx = createContext<LoadState>({ complete: false, errors: [] })

export function DataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<DatasetStore>({})
  const [load, setLoad] = useState<LoadState>({ complete: false, errors: [] })
  useEffect(() => {
    let alive = true
    Promise.all(
      DATASETS.map((n) =>
        fetch(`${import.meta.env.BASE_URL}data/${n}.json`)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json() as Promise<Dataset>
          })
          .then((d) => [n, d, null] as const)
          .catch((error: unknown) => [
            n,
            { _meta: { data_label: '', caveat: 'The dataset could not be loaded.' }, data: [] } as Dataset,
            `${n}: ${error instanceof Error ? error.message : 'unknown error'}`,
          ] as const),
      ),
    ).then(async (pairs) => {
      let schema:DatasetStore={}
      const extraErrors:string[]=[]
      try{const response=await fetch(`${import.meta.env.BASE_URL}data/schema-demo-pack.json`);if(!response.ok)throw new Error();schema=prepareSchemaDemo(await response.json() as {datasets:DatasetStore})}catch{extraErrors.push('Source-schema demonstrations could not be loaded.')}
      if (!alive) return
      setStore({ ...Object.fromEntries(pairs.map(([name, dataset]) => [name, dataset])), ...createWorkflowDemo(),...schema,...coverageDatasets() })
      setLoad({ complete: true, errors: [...pairs.flatMap(([, , error]) => error ? [error] : []),...extraErrors] })
    })
    return () => { alive = false }
  }, [])
  return <Ctx.Provider value={store}><LoadCtx.Provider value={load}>{children}</LoadCtx.Provider></Ctx.Provider>
}

export function useDataset<T = Record<string, any>>(name: DatasetName): Dataset<T> {
  const s = useContext(Ctx)
  return (s[name] as Dataset<T>) ?? { _meta: { data_label: '' }, data: [] }
}
export function useRows<T = Record<string, any>>(name: DatasetName): T[] {
  return useDataset<T>(name).data
}
export function useDatasetStore(): DatasetStore {
  return useContext(Ctx)
}
export function useReady() {
  return useContext(LoadCtx).complete
}
export function useDataErrors() {
  return useContext(LoadCtx).errors
}

/* ---------------- English (UK) number formatting ---------------- */
const EN = new Intl.NumberFormat('en-GB')
export const n0 = (v?: number | null) => (v == null ? '—' : EN.format(Math.round(v)))
export const n1 = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const n2 = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const mil = (v?: number | null) => (v == null ? '—' : `${n1(v / 1e6)}M`)
export const mld = (v?: number | null) => (v == null ? '—' : `${n2(v / 1e9)}B`)
export const pct = (v?: number | null) => (v == null ? '—' : `${n1(v)}%`)
export const sgn = (v?: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${n1(v)}%`)
export const SERIES = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)']
