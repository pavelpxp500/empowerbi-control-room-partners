import catalog from './schema-catalog.json'
import type { DatasetStore, DatasetName } from './data'
import type { Measure } from './reporting'
export type SourceField={key:string;sourceHeader:string;label:string;type:string;unit:string|null;aggregation:string;canonicalAlias:string}
export const SOURCE_SCHEMAS=catalog.datasets.map(d=>({...d,id:d.id.replace('archive_','cr_schema_') as DatasetName,headers:d.headers as SourceField[]}))
export const schemaFor=(id:string)=>SOURCE_SCHEMAS.find(s=>s.id===id)
export const schemasForRoute=(path:string)=>SOURCE_SCHEMAS.filter(s=>path==='/ai-copilot'||s.routes.includes(path)).sort((a,b)=>Number(b.id==='cr_schema_stock_item')-Number(a.id==='cr_schema_stock_item'))
const FORECAST_MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
// A declared null month is excluded by date filtering, rather than treated as undated data.
function forecastMonth(yearValue: unknown, monthValue: unknown): string | null {
  const year = typeof yearValue === 'number' && Number.isInteger(yearValue) ? String(yearValue) : typeof yearValue === 'string' ? yearValue.trim() : ''
  if (!/^[1-9]\d{3}$/.test(year)) return null
  const text = typeof monthValue === 'string' ? monthValue.trim().toLowerCase() : ''
  const month = typeof monthValue === 'number' ? monthValue : /^(?:0?[1-9]|1[0-2])$/.test(text) ? Number(text) : FORECAST_MONTH_NAMES.indexOf(text) + 1
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  return `${year}-${String(month).padStart(2, '0')}`
}
export function prepareSchemaDemo(pack:{datasets:DatasetStore}):DatasetStore {
  return Object.fromEntries(Object.entries(pack.datasets).map(([id,d])=>{
    const key=id.replace('archive_','cr_schema_'), schema=schemaFor(key)!
    const timeColumn=schema.headers.find(c=>['date','posting_date','order_date'].includes(c.canonicalAlias)&&c.type==='date')
    const snapshot=['archive_stock','archive_stock_item','archive_stock_department','archive_pallets','archive_customers'].includes(id)
    const data=d.data.map(r=>({...r,...(timeColumn?{date:r[timeColumn.key]}:snapshot?{snapshot_date:d._meta.synthetic_snapshot_date}:id==='archive_forecast'?{month:forecastMonth(r['Year of Forecast Month'], r['Month of Forecast Month'])}:{})}))
    return [key,{...d,_meta:{...d._meta,time_kind:snapshot?'snapshot':'flow',dimensions:schema.headers.filter(c=>c.type!=='number').map(c=>c.key)},data}]
  }))
}
export function schemaMeasures(id:string):Measure[]{
  const schema=schemaFor(id)
  if(!schema)return[]
  if(id==='cr_schema_stock')return[{label:'Stock-state records',mode:'count',unit:'records',definition:'Allocation states overlap. Filter Stock before reviewing pieces; no additive cross-state stock total is shown.'}]
  return schema.headers.filter(c=>c.type==='number'&&['sum','snapshot_sum','max'].includes(c.aggregation)).map(c=>({label:c.sourceHeader,field:c.key,unit:c.unit??'',mode:c.aggregation==='max'?'max':'sum',definition:`${c.aggregation==='max'?'Maximum':'Sum'} of populated ${c.sourceHeader} at this table grain. ${c.aggregation==='snapshot_sum'?'Single snapshot only; do not add dates. ':''}${schema.caveat}`}))
}
