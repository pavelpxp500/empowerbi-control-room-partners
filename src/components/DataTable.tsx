import { useState, type ReactNode } from 'react'
import useSurfaceWidth from './useSurfaceWidth'
import { columnWindow, fitColumnCount } from '@/lib/grid-layout'

export type Column<T> = {
  h: string
  render: (r: T) => ReactNode
  num?: boolean
  wide?: boolean
}

export default function DataTable<T>(
  { rows, cols, max = 460, caption = 'Data table' }:
  { rows: T[]; cols: Column<T>[]; max?: number; caption?: string },
) {
  const surface = useSurfaceWidth()
  const [columnPage, setColumnPage] = useState(0)
  const window = columnWindow(cols, fitColumnCount(surface.width, surface.fontSize), columnPage)
  return (
    <div ref={surface.ref} className="compact-table-surface">
    {window.count > 1 && <label className="compact-column-control">Column group<select aria-label={`${caption} column group`} value={window.page} onChange={e=>setColumnPage(Number(e.target.value))}>{Array.from({length:window.count},(_,i)=>{const p=columnWindow(cols,fitColumnCount(surface.width,surface.fontSize),i);return <option key={i} value={i}>{i+1} / {window.count} · {p.columns[1]?.h} – {p.columns.at(-1)?.h}</option>})}</select></label>}
    <div className="data-region compact-fit" style={{ maxHeight: max }} role="region" aria-label={caption} tabIndex={0}>
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {window.columns.map((c) => (
              <th key={c.h} scope="col"
                  className={`sticky top-0 z-10 border-b border-line2 px-3 py-2.5 whitespace-nowrap ${c.num ? 'text-right' : 'text-left'}`}>
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr><td colSpan={window.columns.length} className="px-3 py-8 text-center text-ink3">No rows match this selection.</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              {window.columns.map((c) => (
                <td key={c.h}
                    className={`px-3 py-[7px] border-b border-line ${c.num ? 'num font-mono' : ''} ${c.wide ? 'whitespace-normal min-w-[190px] max-w-[340px]' : 'whitespace-nowrap'}`}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}

export function Pill({ status, children }: { status: string; children: ReactNode }) {
  return (
    <span className={`font-mono text-[10px] font-semibold px-1.5 py-[2px] rounded-[3px] pill-${status}`}>
      {children}
    </span>
  )
}
