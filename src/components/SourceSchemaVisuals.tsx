import { BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid,Legend } from 'recharts'
import Card from './Card'
import { Matrix, Ranking } from './ReportVisuals'
import { schemaFor } from '@/lib/source-schema'
import { measureValue, type Measure } from '@/lib/reporting'
import type { DataRow } from '@/lib/analytics'

export default function SourceSchemaVisuals({dataset,rows,onFilter}:{dataset:string;rows:DataRow[];onFilter:(key:string,value:string)=>void}){
  const schema=schemaFor(dataset)!
  const dimension=schema.headers.find(c=>['Department','Segment Name','Supplier','Location','WH'].includes(c.key))?.key??schema.headers.find(c=>c.type==='string')!.key
  const other=schema.headers.find(c=>c.type==='string'&&c.key!==dimension&&!/email|gtin|remarks/i.test(c.key))?.key??dimension
  const numeric=schema.headers.filter(c=>c.type==='number'&&['sum','snapshot_sum','max'].includes(c.aggregation))
  const preferred=numeric.find(c=>['On Stock €','Net Ron','FC pcs','Received Units','Stock pcs','Cost Amount (Actual)','Max. days of delay'].includes(c.key))??numeric[0]
  const measure:Measure=preferred&&dataset!=='cr_schema_stock'?{label:preferred.sourceHeader,field:preferred.key,unit:preferred.unit??'',mode:preferred.aggregation==='max'?'max':'sum',definition:'Selected source-schema demonstration, compatible units and one stated grain.'}:{label:'Records',mode:'count',unit:'records',definition:'Stock states overlap; inspect detail without a cross-state quantity sum.'}
  const relative=dataset==='cr_schema_stock_item'||dataset==='cr_schema_stock_department'
  return <section className="report-specific" aria-label="Source-schema visual analysis"><div className="report-visual-grid">
    <Ranking rows={rows} field={dimension} measure={measure} title={`${measure.label} by ${dimension}`} onFilter={onFilter}/>
    <Matrix rows={rows} rowKey={dimension} colKey={other} measure={measure} title={`${dimension} / ${other}`} onFilter={onFilter}/>
    {relative&&<Card title="Historical sales and forward demand" sub="Synthetic July 2026 snapshot · pieces · past and future periods are not accuracy pairs"><ResponsiveContainer width="100%" height={300}><BarChart data={[-6,-5,-4,-3,-2,-1,1,2,3,4,5,6].map(offset=>{const key=offset<0?`Sales ${offset} month pcs`:`FC +${offset}${offset<3?' ':''}month pcs`;return{month:`M${offset>0?'+':''}${offset}`,source_field:key,Sales:offset<0?measureValue(rows,{label:key,field:key,unit:'pcs',definition:''}):null,Forecast:offset>0?measureValue(rows,{label:key,field:key,unit:'pcs',definition:''}):null}})}><CartesianGrid stroke="var(--line)"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Legend/><Bar dataKey="Sales" fill="#173d65"/><Bar dataKey="Forecast" fill="#e20026"/></BarChart></ResponsiveContainer></Card>}
    {dataset==='cr_schema_purchases'&&<Card title="Ordered, received and invoiced quantities" sub="No prices are supplied; this chart does not infer monetary values"><ResponsiveContainer width="100%" height={300}><BarChart data={['Ordered Units','Received Units','Invoiced Units'].map(field=>({name:field,value:measureValue(rows,{label:field,field,unit:'units',definition:''})}))}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#173d65"/></BarChart></ResponsiveContainer></Card>}
  </div><details><summary>All {schema.headers.length} source fields, units and aggregation rules</summary><div className="schema-source-fields"><table><thead><tr><th>Report field</th><th>Type</th><th>Unit</th><th>Aggregation rule</th></tr></thead><tbody>{schema.headers.map(c=><tr key={c.key}><td>{c.sourceHeader}</td><td>{c.type}</td><td>{c.unit??'Not specified'}</td><td>{c.aggregation}</td></tr>)}</tbody></table></div><p>Report headers use neutral terminology; field meanings and aggregation rules are retained.</p><p>{schema.caveat}</p></details></section>
}
