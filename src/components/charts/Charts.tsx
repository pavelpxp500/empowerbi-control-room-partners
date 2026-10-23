import { useId, type ReactNode } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { SERIES } from '@/lib/data'
import ChartDetails from '../ChartDetails'

const AXIS = { stroke: 'var(--ink-3)', fontSize: 11, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }
const GRID = { stroke: 'var(--chart-grid)' }

const tipStyle = {
  background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 14,
  boxShadow: 'var(--shadow-card)', fontSize: 11.5,
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', color: 'var(--ink)',
}

function SemanticChart(
  { caption, description, headers, tableRows, children }:
  { caption: string; description: string; headers: string[]; tableRows: ReactNode[][]; children: ReactNode },
) {
  const captionId = useId()
  const descriptionId = useId()
  return (
    <figure className="min-w-0" aria-labelledby={captionId} aria-describedby={descriptionId}>
      <figcaption id={captionId} className="sr-only">{caption}</figcaption>
      <p id={descriptionId} className="sr-only">{description}</p>
      <ChartDetails>{children}</ChartDetails>
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {tableRows.map((cells, rowIndex) => (
              <tr key={rowIndex}>
                {cells.map((cell, cellIndex) => cellIndex === 0
                  ? <th scope="row" key={cellIndex}>{cell}</th>
                  : <td key={cellIndex}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

export function Legend({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap gap-3.5 text-[11.5px] text-ink2 pb-2">
      {names.map((n, i) => (
        <span key={n} className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: SERIES[i % 4] }} />
          {n}
        </span>
      ))}
    </div>
  )
}

export function TrendChart(
  { rows, x, series, fmt, height = 210, area = true, zeroBase = true }:
  { rows: any[]; x: string; series: { k: string; name: string }[]; fmt: (v: number) => string; height?: number; area?: boolean; zeroBase?: boolean },
) {
  const Chart: any = area ? AreaChart : LineChart
  return (
    <SemanticChart
      caption={`Trend: ${series.map((item) => item.name).join(', ')}`}
      description={`Time series with ${String(x)} on the horizontal axis. Complete values are available in the alternative table.`}
      headers={[String(x), ...series.map((item) => item.name)]}
      tableRows={rows.map((row) => [
        String(row[x] ?? '—'),
        ...series.map((item) => fmt(Number(row[item.k]))),
      ])}
    >
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={62} tickFormatter={fmt}
                 domain={zeroBase ? [0, 'auto'] : ['auto', 'auto']} />
          <Tooltip contentStyle={tipStyle} formatter={(v: any, n: any) => [fmt(Number(v)), n]} />
          {series.map((s, i) =>
            area && zeroBase ? (
              <Area key={s.k} type="monotone" dataKey={s.k} name={s.name} stroke={SERIES[i % 4]}
                    fill={SERIES[i % 4]} fillOpacity={0.1} strokeWidth={2} dot={false} />
            ) : (
              <Line key={s.k} type="monotone" dataKey={s.k} name={s.name} stroke={SERIES[i % 4]}
                    strokeWidth={2} dot={false} />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </SemanticChart>
  )
}

export function StackedChart(
  { rows, x, keys, names, fmt, height = 210 }:
  { rows: any[]; x: string; keys: string[]; names: string[]; fmt: (v: number) => string; height?: number },
) {
  return (
    <SemanticChart
      caption={`Composition: ${names.join(', ')}`}
      description={`Stacked bars with ${String(x)} on the horizontal axis. Complete values are available in the alternative table.`}
      headers={[String(x), ...names]}
      tableRows={rows.map((row) => [
        String(row[x] ?? '—'),
        ...keys.map((key) => fmt(Number(row[key]))),
      ])}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={62} tickFormatter={fmt} />
          <Tooltip contentStyle={tipStyle} formatter={(v: any, n: any) => [fmt(Number(v)), n]}
                   cursor={{ fill: 'var(--surface-2)' }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} name={names[i]} stackId="a" fill={SERIES[i % 4]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </SemanticChart>
  )
}

/** Stores positioned using the actual coordinates from JSON-LD. */
export function StoreMap(
  { rows, sizeKey, labelKey, fmt, height = 340 }:
  { rows: any[]; sizeKey: string; labelKey: string; fmt: (v: number) => string; height?: number },
) {
  const pts = rows.map((r) => ({ ...r, x: Number(r.lon), y: Number(r.lat), z: Number(r[sizeKey]) }))
  return (
    <SemanticChart
      caption="Geographic distribution of stores"
      description="Actual geographic positions; point size is proportional to the selected metric. The alternative table contains all values."
      headers={['Store', 'Longitude', 'Latitude', 'Value']}
      tableRows={pts.map((point) => [
        String(point[labelKey] ?? '—'),
        Number(point.x).toFixed(4),
        Number(point.y).toFixed(4),
        fmt(point.z),
      ])}
    >
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 12, right: 20, bottom: 8, left: 8 }}>
          <CartesianGrid {...GRID} />
          <XAxis type="number" dataKey="x" domain={['dataMin - 0.5', 'dataMax + 0.5']}
                 tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}°E`} />
          <YAxis type="number" dataKey="y" domain={['dataMin - 0.4', 'dataMax + 0.4']}
                 tick={AXIS} tickLine={false} axisLine={false} width={52}
                 tickFormatter={(v) => `${v.toFixed(1)}°N`} />
          <ZAxis type="number" dataKey="z" range={[90, 900]} />
          <Tooltip contentStyle={tipStyle} cursor={{ strokeDasharray: '3 3' }}
                   formatter={(v: any, n: any) => (n === 'z' ? [fmt(Number(v)), 'Sales'] : [v, n])}
                   labelFormatter={() => ''}
                   content={({ payload }: any) => {
                     const p = payload?.[0]?.payload
                     if (!p) return null
                     return (
                       <div style={tipStyle} className="px-2.5 py-2">
                         <b className="block mb-1">{p[labelKey]}</b>
                         <div className="font-mono text-[11px]">{fmt(p.z)}</div>
                         <div className="font-mono text-[11px] text-ink3">{p.oos_pct}% out of stock</div>
                       </div>
                     )
                   }} />
          <Scatter data={pts} fill="var(--accent)" fillOpacity={0.28} stroke="var(--accent)" strokeWidth={1.5}>
            {pts.map((_, i) => <Cell key={i} />)}
            <LabelList dataKey={labelKey} position="top" offset={10}
              formatter={(v: any) => String(v).replace('Selgros ', '')}
              style={{ fill: 'var(--ink-2)', fontSize: 10, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </SemanticChart>
  )
}
