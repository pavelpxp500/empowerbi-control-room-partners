import { useState, useEffect } from 'react'
import { humaniseField } from '@/lib/analytics'
type Col<T> = { label: keyof T & string; value: keyof T & string; sub?: keyof T & string }

export default function BarList<T extends Record<string, any>>({
  rows, label, value, sub, fmt, subFmt, head, strip, color,
}: Col<T> & {
  rows: T[]
  fmt?: (v: number) => string
  subFmt?: (v: any) => string
  head?: [string, string, string]
  strip?: RegExp
  color?: (r: T) => string
}) {
  const f = fmt ?? ((v: number) => String(v))
  const [selected,setSelected]=useState<number|null>(null)
  useEffect(()=>setSelected(null),[rows])
  const sf = subFmt ?? ((v: any) => String(v ?? ''))
  const mx = Math.max(...rows.map((r) => Number(r[value]) || 0)) || 1
  return (
    <div className="flex flex-col">
      {head && (
        <div className="bar-list-head grid grid-cols-[minmax(158px,1.2fr)_minmax(70px,2.4fr)_76px_66px] gap-2.5 items-center pb-1.5 mb-1 border-b border-line text-[10px] font-semibold tracking-[0.055em] uppercase text-ink3">
          <div>{head[0]}</div><div /><div className="text-right">{head[1]}</div><div className="text-right">{head[2]}</div>
        </div>
      )}
      {rows.map((r, i) => {
        const v = Number(r[value]) || 0
        const lb = strip ? String(r[label]).replace(strip, '') : String(r[label])
        return (
          <button type="button" key={i} aria-pressed={selected===i} onClick={()=>setSelected(selected===i?null:i)} title={Object.entries(r).slice(0,10).map(([k,v])=>`${humaniseField(k)}: ${String(v??'Unavailable')}`).join('\n')} className="bar-list-row grid grid-cols-[minmax(158px,1.2fr)_minmax(70px,2.4fr)_76px_66px] gap-2.5 items-center py-1 text-[12.5px] text-left">
            <div className="truncate text-ink2" title={String(r[label])}>{lb}</div>
            <div className="bar-track">
              <div className="bar-fill"
                   style={{ width: `${((100 * v) / mx).toFixed(2)}%`, background: color ? color(r) : 'var(--bar)' }} />
            </div>
            <div className="font-mono text-[11px] num">{f(v)}</div>
            <div className="font-mono text-[11px] num text-ink3">{sub ? sf(r[sub]) : ''}</div>
          </button>
        )
      })}
      {selected!==null&&rows[selected]&&<aside className="chart-selection" aria-live="polite"><header><b>Selected observation</b><button onClick={()=>setSelected(null)}>Clear selection</button></header><dl>{Object.entries(rows[selected]).slice(0,20).map(([k,v])=><div key={k}><dt>{humaniseField(k)}</dt><dd>{typeof v==='number'?v.toLocaleString('en-GB',{maximumFractionDigits:2}):String(v??'Unavailable')}</dd></div>)}</dl></aside>}
    </div>
  )
}
