import { Children, cloneElement, isValidElement, useState, useEffect, type ReactNode, type ReactElement } from 'react'
import { Bar, Line, Area, Scatter, Pie, Treemap, Tooltip, BarChart, LineChart, ComposedChart, AreaChart, ScatterChart, PieChart } from 'recharts'
import { humaniseField } from '@/lib/analytics'

type RecordValue = Record<string, unknown>
function record(value: unknown): RecordValue | null { return value && typeof value==='object' && !Array.isArray(value) ? value as RecordValue : null }
function datum(value: unknown): RecordValue | null {
  const r=record(value); if(!r)return null
  if(Array.isArray(r.activePayload)&&r.activePayload.length) return record(record(r.activePayload[0])?.payload)
  return record(r.payload) ?? (typeof r.name==='string' && ('value' in r) ? r : null)
}
function values(row:RecordValue) {return Object.entries(row).filter(([k,v])=>!['tooltipPosition','x','y','width','height','cx','cy','fill','stroke','index','radius','payload','children'].includes(k)&&v!=null&&(typeof v!=='object'||Array.isArray(v)))}
const display=(v:unknown)=>typeof v==='number'?v.toLocaleString('en-GB',{maximumFractionDigits:2}):Array.isArray(v)?v.join(' → '):String(v)
function scopeKey(value:string) { let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);return `${value.length}:${hash>>>0}` }
export function RichChartTooltip({active,payload,label,formatter,labelFormatter}: {active?:boolean;payload?:readonly {name?:string;value?:unknown;payload?:RecordValue;color?:string}[];label?:unknown;formatter?:(value:unknown,name:unknown,item:unknown,index:number,payload:unknown)=>unknown;labelFormatter?:(label:unknown,payload:unknown)=>ReactNode}) {
  if(!active||!payload?.length)return null
  const row=payload[0].payload??{}
  return <div className="rich-chart-tooltip"><b>{labelFormatter?labelFormatter(label,payload):String(label??row.name??row.item??row.customer??'Observation')}</b>{payload.map((p,i)=>{const formatted=formatter?formatter(p.value,p.name,p,i,payload):p.value;return <p key={i}><span style={{color:p.color}}>{String(Array.isArray(formatted)?formatted[1]??p.name:p.name)}</span><strong>{display(Array.isArray(formatted)?formatted[0]:formatted??'Unavailable')}</strong></p>})}<dl>{values(row).filter(([k])=>!['value','name'].includes(k)).slice(0,8).map(([k,v])=><div key={k}><dt>{humaniseField(k)}</dt><dd>{display(v)}</dd></div>)}</dl><small>Click a mark to inspect its values. Use report filters to change scope.</small></div>
}
// Preserve existing click handlers and specialised tooltips; enrich otherwise inert exhibits.
export default function ChartDetails({children}: {children:ReactNode}) {
  const [selection,setSelection]=useState<RecordValue|null>(null)
  let chart=false
  const scopes:string[]=[]
  const enhance=(nodes:ReactNode):ReactNode=>Children.map(nodes,node=>{
    if(!isValidElement(node))return node
    const el=node as ReactElement<Record<string,unknown>>, props=el.props, type=el.type
    const isMark=[Bar,Line,Area,Scatter,Pie,Treemap].includes(type as never)
    const isChart=[BarChart,LineChart,ComposedChart,AreaChart,ScatterChart,PieChart,Treemap].includes(type as never)
    const scopeStart=scopes.length
    if(isChart)chart=true
    if((isChart||isMark)&&Array.isArray(props.data))scopes.push(JSON.stringify(props.data))
    const changes:Record<string,unknown>={}
    if(props.children)changes.children=enhance(props.children as ReactNode)
    // Recharts retains activeTooltipIndex/payload between data replacements.
    // A new population must never display a hover value from the previous one.
    if(isChart)changes.key=`${String(el.key??'chart')}:${scopeKey(scopes.slice(scopeStart).join('|'))}`
    if(type===Tooltip&&!props.content)changes.content=<RichChartTooltip/>
    if(isMark||isChart){changes.onClick=(...args:unknown[])=>{const selected=datum(args[0]);if(selected&&values(selected).length)setSelection(selected);if(typeof props.onClick==='function')props.onClick(...args)};if(isMark)changes.cursor='pointer'}
    return cloneElement(el,changes)
  })
  const content=enhance(children)
  const signature=scopes.join('|')
  useEffect(()=>setSelection(null),[signature])
  return <>{content}{chart&&<p className="chart-interaction-hint">Select a chart mark to inspect its values.</p>}{selection&&<aside className="chart-selection" aria-live="polite"><header><b>Selected observation</b><button onClick={()=>setSelection(null)}>Clear selection</button></header><dl>{values(selection).map(([k,v])=><div key={k}><dt>{humaniseField(k)}</dt><dd>{display(v)}</dd></div>)}</dl></aside>}</>
}
