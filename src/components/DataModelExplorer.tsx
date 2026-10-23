import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useDatasetStore } from '@/lib/data'
import { humaniseField, type DataRow } from '@/lib/analytics'
import { sum, lastSnapshot, parseDay } from '@/lib/reporting'

const FACTS = [
  { dataset: 'cr_sales', title: 'Sales', grain: 'Demonstration transaction date × store × item × customer', metric: 'net_sales', unit: 'RON', route: '/sales', dimensions: ['date','store','item','customer','segment','campaign'] },
  { dataset: 'cr_stock', title: 'Stock snapshots', grain: 'Month-end × store × item', metric: 'stock_value', unit: 'RON', route: '/stock-age', dimensions: ['snapshot_date','store','item','category','supplier','age_bucket'] },
  { dataset: 'cr_service', title: 'Delivery service', grain: 'Promise date × direction × store × item', metric: 'eligible', unit: 'eligible lines', route: '/otif-outbound', dimensions: ['date','store','item','direction','category','reason'] },
  { dataset: 'cr_purchases', title: 'Purchase control', grain: 'Demonstration purchase observation', metric: 'open_value', unit: 'RON', route: '/purchase-control', dimensions: ['date','store','item','supplier','status','region'] },
  { dataset: 'cr_forecast', title: 'Demand planning', grain: 'Month × store × item × frozen vintage', metric: 'forecast_units', unit: 'units', route: '/forecast', dimensions: ['month','store','item','region','category','version'] },
] as const
const positions = [[35,30],[395,15],[755,30],[35,325],[395,340],[755,325]]
export default function DataModelExplorer() {
  const store = useDatasetStore()
  const [factIndex,setFactIndex] = useState(0), [node,setNode] = useState('store'), [value,setValue] = useState('')
  const fact = FACTS[factIndex], allRows = (store[fact.dataset]?.data ?? []) as DataRow[]
  const latestSnapshot = useMemo(() => allRows.reduce((latest, row) => parseDay(row.snapshot_date) && String(row.snapshot_date) > latest ? String(row.snapshot_date) : latest, ''), [allRows])
  const rows=useMemo(()=>fact.dataset==='cr_stock'?lastSnapshot(allRows,latestSnapshot):allRows,[allRows,fact.dataset,latestSnapshot])
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))], dimensions = fact.dimensions.filter(d => keys.includes(d))
  const dimension = dimensions.includes(node as never) ? node : dimensions[0] ?? 'store'
  const members = useMemo(() => [...new Set(rows.map(r => String(r[dimension] ?? 'Not supplied')))].sort(), [rows,dimension])
  const scoped = useMemo(() => value ? rows.filter(r => String(r[dimension] ?? 'Not supplied') === value) : rows, [rows,dimension,value])
  const choose = (key: string) => { setNode(key); setValue('') }
  if (!rows.length) return <section className="model-explorer"><h2>Explore the data model</h2><p>The demonstration fact is unavailable. Reload the dataset before exploring its relationships.</p></section>
  return <section className="model-explorer" aria-labelledby="model-title">
    <header><div><p className="analyst-kicker">Pilot AI · semantic model</p><h2 id="model-title">Explore the data model</h2><p>Choose a fact, select a dimension, then filter a member to see its effect on the demonstration records.</p></div><Link to={fact.route}>Open {fact.title} report →</Link></header>
    <div className="model-facts" aria-label="Fact tables">{FACTS.map((f,i) => <button key={f.dataset} aria-pressed={i===factIndex} onClick={() => {setFactIndex(i);setNode('store');setValue('')}}>{f.title}</button>)}</div>
    <p className="cr-pivot-note">{fact.dataset==='cr_stock'?`Stock as of ${latestSnapshot} only. Snapshot balances are never added across dates.`:`Model laboratory: complete demonstration history (${String(store[fact.dataset]?._meta.coverage_start ?? 'unknown start')} to ${String(store[fact.dataset]?._meta.coverage_end ?? 'unknown end')}), independent of page reporting dates.`}</p>
    <div className="model-diagram-wrap"><svg viewBox="0 0 1010 465" className="model-diagram" role="group" aria-label={`${fact.title} star schema. One-way dimension filters feed the fact table.`}>
      <defs><marker id="model-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
      {dimensions.map((d,i) => {const [x,y]=positions[i];return <g key={d} className={d===dimension?'model-edge selected':'model-edge'}><path d={`M ${x+105} ${y<150?y+110:y} L 505 ${y<150?180:285}`} markerEnd="url(#model-arrow)"/><text x={(x+105+505)/2} y={y<150?(y+110+180)/2-8:312}>1 : many</text></g>})}
      <g className="model-fact"><rect x="360" y="177" width="290" height="110" rx="18"/><text x="505" y="207" textAnchor="middle">FACT · {fact.title}</text><text x="505" y="234" textAnchor="middle">{rows.length.toLocaleString()} demo records</text><text x="505" y="262" textAnchor="middle">{humaniseField(fact.metric)} · {fact.unit}</text></g>
      {dimensions.map((d,i) => {const [x,y]=positions[i];return <g key={d} role="button" tabIndex={0} aria-label={`Inspect ${humaniseField(d)} dimension`} aria-pressed={dimension===d} className={`model-dimension ${dimension===d?'selected':''}`} onClick={() => choose(d)} onKeyDown={e => {if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(d)}}}><rect x={x} y={y} width="220" height="110" rx="16"/><text x={x+18} y={y+28}>DIM · {humaniseField(d)}</text><text x={x+18} y={y+57}>Key: {d}</text><text x={x+18} y={y+84}>{new Set(rows.map(r=>String(r[d]??'Not supplied'))).size} distinct members</text></g>})}
    </svg></div>
    <div className="model-compact" aria-label={`${fact.title} responsive relationship explorer`}><div className="model-compact-fact"><b>FACT · {fact.title}</b><span>{rows.length.toLocaleString()} records · {humaniseField(fact.metric)} ({fact.unit})</span></div><p>Dimension → fact · one-to-many</p><div>{dimensions.map(d=><button key={d} aria-pressed={d===dimension} onClick={()=>choose(d)}><b>DIM · {humaniseField(d)}</b><span>{new Set(rows.map(r=>String(r[d]??'Not supplied'))).size} members · filter fact →</span></button>)}</div></div>
    <div className="model-details"><div><h3>{humaniseField(dimension)} dimension</h3><label>Filter member<select value={value} onChange={e=>setValue(e.target.value)}><option value="">All members</option>{members.map(m=><option key={m}>{m}</option>)}</select></label><p><b>{scoped.length.toLocaleString()}</b> / {rows.length.toLocaleString()} matching records</p><p><b>{sum(scoped,fact.metric).toLocaleString('en-GB',{maximumFractionDigits:2})} {fact.unit}</b> · {humaniseField(fact.metric)}</p><button onClick={()=>setValue('')}>Reset model filter</button></div><div><h3>Grain & relationship contract</h3><p>{fact.grain}. Dimension values are deduplicated from the selected fact. Each fact observation maps to one dimension member, including an explicit unknown member where needed.</p><p>Filter direction: dimension → fact. Separate fact tables are not joined row-to-row. Align keys, dates, populations and units before comparing their measures.</p><p><b>Logical star-schema demonstration.</b> The app currently reads materialised flat datasets, not a live warehouse. This view demonstrates model design and actual filtering of demo rows; it does not claim physical database relationships are installed.</p></div></div>
    <details><summary>Fact attributes and measures · {keys.length} fields</summary><div className="model-field-list">{keys.map(k=><span key={k}><b>{humaniseField(k)}</b> {rows.some(r=>typeof r[k]==='number')?'number':'attribute'}<code>{k}</code></span>)}</div></details>
  </section>
}
