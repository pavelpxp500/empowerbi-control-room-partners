import { useId, useMemo } from 'react'
import {
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipProps,
} from 'recharts'

const AXIS = {
  stroke: 'var(--ink-3)',
  fontSize: 11,
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
}
const GRID = { stroke: 'var(--chart-grid)' }
const TIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--line-2)',
  borderRadius: 14,
  boxShadow: 'var(--shadow-card)',
  color: 'var(--ink)',
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  fontSize: 11.5,
}

type StageKey = 'prod' | 'operational' | 'livrat' | 'validare' | 'dev' | 'spec' | 'other'

const STAGES: ReadonlyArray<{ key: StageKey; label: string; color: string; textColor: string }> = [
  { key: 'prod', label: 'PROD', color: 'var(--good)', textColor: 'var(--chart-fill-label)' },
  { key: 'operational', label: 'Operational', color: 'var(--petrol)', textColor: 'var(--chart-fill-label)' },
  { key: 'livrat', label: 'Delivered', color: 'var(--bar)', textColor: 'var(--chart-fill-label)' },
  { key: 'validare', label: 'In validation', color: 'var(--accent)', textColor: 'var(--chart-fill-label)' },
  { key: 'dev', label: 'DEV', color: 'var(--warn)', textColor: 'var(--chart-fill-label)' },
  { key: 'spec', label: 'SPEC', color: 'var(--ink-3)', textColor: 'var(--chart-fill-label)' },
  { key: 'other', label: 'Other stage', color: 'var(--line-2)', textColor: 'var(--ink)' },
]

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en-GB')
}

function stageKey(value: string): StageKey {
  const normalized = normalizeText(value)
  if (normalized === 'prod') return 'prod'
  if (normalized.includes('operational')) return 'operational'
  if (normalized === 'livrat' || normalized === 'delivered') return 'livrat'
  if (normalized.includes('validare') || normalized.includes('validation')) return 'validare'
  if (normalized === 'dev') return 'dev'
  if (normalized === 'spec') return 'spec'
  return 'other'
}

function pct(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}% of total` : '0% of total'
}

function compact(value: number): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)
}

function ChartLegend({ items }: { items: ReadonlyArray<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pb-2 text-[11px] text-ink2" aria-hidden="true">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

export interface BenchmarkPortfolioRow {
  id: string
  name: string
  baseline: string
  critical_go_live: boolean
  priority: string
  design_sprint?: string | null
  build_sprint?: string | null
}

export interface SourcePortfolioFunnelProps {
  rows: readonly BenchmarkPortfolioRow[]
  height?: number
}

interface FunnelStep {
  name: string
  value: number
  fill: string
}

function FunnelTip(
  { active, payload, total }: TooltipProps<number, string> & { total: number },
) {
  const step = payload?.[0]?.payload as FunnelStep | undefined
  if (!active || !step) return null
  return (
    <div style={TIP_STYLE} className="px-2.5 py-2 shadow-sm">
      <b className="block">{step.name}</b>
      <span className="font-mono">{step.value} · {pct(step.value, total)} of inventory</span>
    </div>
  )
}

/**
 * A source-portfolio narrowing view: inventory, retained candidates and critical go-live items.
 * Baseline labels are interpreted only for presentation; the component does not claim delivery.
 */
export function SourcePortfolioFunnel({ rows, height = 250 }: SourcePortfolioFunnelProps) {
  const captionId = useId()
  const descId = useId()
  const data = useMemo(() => {
    const retained = rows.filter((row) => !normalizeText(row.baseline).includes('de-scope')).length
    const critical = rows.filter((row) => row.critical_go_live).length
    return [
      { name: 'Source inventory', value: rows.length, fill: 'var(--bar)' },
      { name: 'Retained candidates', value: retained, fill: 'var(--petrol)' },
      { name: 'Go-live critical', value: critical, fill: 'var(--accent)' },
    ] satisfies FunnelStep[]
  }, [rows])
  const descoped = rows.length - data[1].value

  return (
    <figure className="min-w-0" aria-labelledby={captionId} aria-describedby={descId}>
      <figcaption id={captionId} className="mb-1 font-display text-sm font-semibold tracking-wide text-ink">
        Source-portfolio filter
      </figcaption>
      <p id={descId} className="mb-3 text-xs leading-relaxed text-ink3">
        Separates the base inventory from retained candidates and items declared critical for go-live;
        {` ${descoped}`} items have a De-scope baseline. This is requirements classification, not proof of implementation.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-sm border border-line bg-surface2 p-4 text-sm text-ink3">No records available.</p>
      ) : (
        <>
          <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={height}>
              <FunnelChart margin={{ top: 8, right: 118, bottom: 8, left: 8 }}>
                <Tooltip content={<FunnelTip total={rows.length} />} isAnimationActive={false} />
                <Funnel data={data} dataKey="value" nameKey="name" isAnimationActive={false}>
                  {data.map((step) => <Cell key={step.name} fill={step.fill} />)}
                  <LabelList
                    dataKey="name"
                    position="right"
                    fill="var(--ink-2)"
                    stroke="none"
                    style={{ fontFamily: 'Oswald, sans-serif', fontSize: 10.5 }}
                  />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
          <div className="sr-only">
            <table>
              <caption>Source-portfolio filter values</caption>
              <thead><tr><th scope="col">Stage</th><th scope="col">Count</th><th scope="col">Share of inventory</th></tr></thead>
              <tbody>
                {data.map((step) => (
                  <tr key={step.name}><th scope="row">{step.name}</th><td>{step.value}</td><td>{pct(step.value, rows.length)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </figure>
  )
}

export interface BenchmarkDomainStageRow {
  domain: string
  total: number
  prod: number
  operational: number
  livrat: number
  validare: number
  dev: number
  spec: number
  avg_source_stage_index: number
  avg_complexity_score: number
  acceptance_checks: number
}

export interface DomainStageTreemapProps {
  rows: readonly BenchmarkDomainStageRow[]
  height?: number
}

interface TreemapLeaf {
  name: string
  domain: string
  stage: string
  value: number
  fill: string
  textColor: string
}

interface TreemapTileProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  value?: number
  fill?: string
  textColor?: string
}

function TreemapTile({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = '',
  value = 0,
  fill = 'var(--line-2)',
  textColor = '#fff',
}: TreemapTileProps) {
  const shortName = name.replace('Navigation & delivery', 'Navigation').replace('Platform & method', 'Platform')
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--surface)" strokeWidth={2} />
      {width >= 74 && height >= 34 ? (
        <>
          <text x={x + 7} y={y + 16} fill={textColor} fontFamily="Oswald, sans-serif" fontSize={10.5}>
            {shortName.length > 24 ? `${shortName.slice(0, 22)}…` : shortName}
          </text>
          <text x={x + 7} y={y + 30} fill={textColor} fontFamily="Open Sans, sans-serif" fontSize={9.5}>
            {value} cards
          </text>
        </>
      ) : null}
    </g>
  )
}

/** Area encodes card count for every source-domain × declared-source-stage combination. */
export function DomainStageTreemap({ rows, height = 310 }: DomainStageTreemapProps) {
  const captionId = useId()
  const descId = useId()
  const data = useMemo(() => rows.flatMap((row) => STAGES.slice(0, 6).flatMap((stage) => {
    const value = row[stage.key as Exclude<StageKey, 'other'>]
    if (value <= 0) return []
    return [{
      name: `${row.domain} · ${stage.label}`,
      domain: row.domain,
      stage: stage.label,
      value,
      fill: stage.color,
      textColor: stage.textColor,
    } satisfies TreemapLeaf]
  })), [rows])

  return (
    <figure className="min-w-0" aria-labelledby={captionId} aria-describedby={descId}>
      <figcaption id={captionId} className="mb-1 font-display text-sm font-semibold tracking-wide text-ink">
        Portfolio by domain and declared stage
      </figcaption>
      <p id={descId} className="mb-2 text-xs leading-relaxed text-ink3">
        Area represents the number of cards. Stage labels come from the source and use mixed vocabulary;
        they are not interpreted as Selgros maturity or readiness.
      </p>
      <ChartLegend items={STAGES.slice(0, 6)} />
      {data.length === 0 ? (
        <p className="rounded-sm border border-line bg-surface2 p-4 text-sm text-ink3">No aggregated cards available.</p>
      ) : (
        <>
          <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={height}>
              <Treemap
                data={data}
                dataKey="value"
                nameKey="name"
                content={<TreemapTile />}
                stroke="var(--surface)"
                isAnimationActive={false}
                isUpdateAnimationActive={false}
                aspectRatio={4 / 3}
              />
            </ResponsiveContainer>
          </div>
          <div className="sr-only">
            <table>
              <caption>Cards by domain and stage declared in the source</caption>
              <thead><tr><th scope="col">Domain</th><th scope="col">Source stage</th><th scope="col">Cards</th></tr></thead>
              <tbody>
                {data.map((leaf) => (
                  <tr key={leaf.name}><th scope="row">{leaf.domain}</th><td>{leaf.stage}</td><td>{leaf.value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </figure>
  )
}

export interface BenchmarkCatalogAnalyticsRow {
  id: string
  name: string
  domain: string
  source_stage_raw: string
  source_stage_index: number
  complexity_score: number
  acceptance_count: number
  artifact_type?: string
}

export interface ComplexityStageScatterProps {
  rows: readonly BenchmarkCatalogAnalyticsRow[]
  height?: number
}

interface ScatterPoint extends BenchmarkCatalogAnalyticsRow {
  z: number
}

function ScatterTip({ active, payload }: TooltipProps<number, string>) {
  const point = payload?.[0]?.payload as ScatterPoint | undefined
  if (!active || !point) return null
  return (
    <div style={TIP_STYLE} className="max-w-[250px] px-2.5 py-2 shadow-sm">
      <b className="block">{point.id} · {point.name}</b>
      <span className="block text-ink3">{point.domain} · {point.source_stage_raw}</span>
      <span className="font-mono">
        complexity {point.complexity_score} · source ordinal {point.source_stage_index} · {point.acceptance_count} checks
      </span>
    </div>
  )
}

/** Complexity versus a source-stage ordinal. The y-axis is explicitly not a maturity score. */
export function ComplexityStageScatter({ rows, height = 320 }: ComplexityStageScatterProps) {
  const captionId = useId()
  const descId = useId()
  const groups = useMemo(() => {
    const byStage = new Map<StageKey, ScatterPoint[]>()
    rows.forEach((row) => {
      const key = stageKey(row.source_stage_raw)
      const points = byStage.get(key) ?? []
      points.push({ ...row, z: Math.max(1, row.acceptance_count) })
      byStage.set(key, points)
    })
    return STAGES.flatMap((stage) => {
      const points = byStage.get(stage.key) ?? []
      return points.length > 0 ? [{ ...stage, points }] : []
    })
  }, [rows])

  return (
    <figure className="min-w-0" aria-labelledby={captionId} aria-describedby={descId}>
      <figcaption id={captionId} className="mb-1 font-display text-sm font-semibold tracking-wide text-ink">
        Complexity × source-stage ordinal
      </figcaption>
      <p id={descId} className="mb-2 text-xs leading-relaxed text-ink3">
        Each bubble is a card; size indicates the number of acceptance checks. The vertical axis is an ordinal
        convention for mixed source labels, not a Selgros maturity, readiness or implementation score.
      </p>
      <ChartLegend items={groups.map((group) => ({ label: group.label, color: group.color }))} />
      {rows.length === 0 ? (
        <p className="rounded-sm border border-line bg-surface2 p-4 text-sm text-ink3">No cards to analyse.</p>
      ) : (
        <>
          <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={height}>
              <ScatterChart margin={{ top: 10, right: 14, bottom: 24, left: 4 }}>
                <CartesianGrid {...GRID} />
                <XAxis
                  type="number"
                  dataKey="complexity_score"
                  name="Complexity"
                  domain={[0, 100]}
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Derived complexity', position: 'insideBottom', offset: -15, fill: 'var(--ink-3)', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="source_stage_index"
                  name="Source-stage ordinal"
                  domain={[0, 100]}
                  width={50}
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                />
                <ZAxis type="number" dataKey="z" range={[70, 390]} />
                <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray: '3 3' }} isAnimationActive={false} />
                {groups.map((group) => (
                  <Scatter
                    key={group.key}
                    name={group.label}
                    data={group.points}
                    fill={group.color}
                    fillOpacity={0.64}
                    stroke={group.color}
                    strokeWidth={1.25}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="sr-only">
            <table>
              <caption>Complexity × source-stage ordinal chart data</caption>
              <thead>
                <tr><th scope="col">Card</th><th scope="col">Domain</th><th scope="col">Source stage</th><th scope="col">Complexity</th><th scope="col">Source ordinal</th><th scope="col">Checks</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.id} · {row.name}</th><td>{row.domain}</td><td>{row.source_stage_raw}</td>
                    <td>{row.complexity_score}</td><td>{row.source_stage_index}</td><td>{row.acceptance_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </figure>
  )
}

export interface BenchmarkRouteCoverageRow {
  route_order: number
  route: string
  route_label: string
  coverage: string
  catalog_card_count: number
  portfolio_report_count: number
  avg_source_stage_index: number | null
  avg_complexity_score: number | null
}

export interface RouteCoverageHeatmapProps {
  rows: readonly BenchmarkRouteCoverageRow[]
}

function coverageClass(value: string): { label: string; short: string; score: number; background: string; color: string } {
  const normalized = normalizeText(value)
  if (normalized.includes('direct')) {
    return { label: 'Direct coverage', short: 'D', score: 2, background: 'var(--good-bg)', color: 'var(--good)' }
  }
  if (normalized.includes('partial')) {
    return { label: 'Partial coverage', short: 'P', score: 1, background: 'var(--warn-bg)', color: 'var(--warn)' }
  }
  return { label: 'Not covered', short: '—', score: 0, background: 'var(--surface-3)', color: 'var(--ink-3)' }
}

function heatColor(color: string, value: number | null, maximum: number): string {
  const numeric = value ?? 0
  const intensity = maximum > 0 ? Math.round(12 + (Math.max(0, numeric) / maximum) * 68) : 12
  return `color-mix(in srgb, ${color} ${intensity}%, var(--surface))`
}

/** A semantic table used as a route-level heatmap. Values remain readable without color. */
export function RouteCoverageHeatmap({ rows }: RouteCoverageHeatmapProps) {
  const captionId = useId()
  const descId = useId()
  const sorted = useMemo(() => [...rows].sort((a, b) => a.route_order - b.route_order), [rows])
  const maxCatalog = Math.max(1, ...sorted.map((row) => row.catalog_card_count))
  const maxPortfolio = Math.max(1, ...sorted.map((row) => row.portfolio_report_count))
  const direct = sorted.filter((row) => coverageClass(row.coverage).score === 2).length
  const partial = sorted.filter((row) => coverageClass(row.coverage).score === 1).length

  return (
    <figure className="min-w-0" aria-labelledby={captionId} aria-describedby={descId}>
      <figcaption id={captionId} className="mb-1 font-display text-sm font-semibold tracking-wide text-ink">
        Route coverage matrix
      </figcaption>
      <p id={descId} className="mb-3 text-xs leading-relaxed text-ink3">
        {direct} routes have direct mapping and {partial} have partial mapping. Numbers are source-object volumes;
        mapping is an analytical inference, and the source-stage ordinal does not measure Selgros maturity.
      </p>
      <div className="overflow-x-auto rounded-sm border border-line" role="region"
        aria-label="Route coverage matrix, horizontally scrollable" tabIndex={0}>
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <caption className="sr-only">Coverage, volume and derived indices for every Selgros route</caption>
          <thead className="bg-surface2 text-[10px] uppercase tracking-[.08em] text-ink3">
            <tr>
              <th scope="col" className="sticky left-0 z-10 border-b border-line bg-surface2 px-3 py-2 text-left">Route</th>
              <th scope="col" className="border-b border-l border-line px-2 py-2 text-center">Mapping</th>
              <th scope="col" className="border-b border-l border-line px-2 py-2 text-center">Catalog cards</th>
              <th scope="col" className="border-b border-l border-line px-2 py-2 text-center">Reports</th>
              <th scope="col" className="border-b border-l border-line px-2 py-2 text-center">
                <abbr title="Average ordinal of the stage labels declared in the source">Source ordinal</abbr>
              </th>
              <th scope="col" className="border-b border-l border-line px-2 py-2 text-center">Complexity</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const coverage = coverageClass(row.coverage)
              return (
                <tr key={row.route} className="border-b border-line last:border-b-0">
                  <th scope="row" className="sticky left-0 z-[1] bg-surface px-3 py-2 text-left font-semibold text-ink">
                    <span className="block">{row.route_label}</span>
                    <span className="block font-mono text-[9.5px] font-normal text-ink3">{row.route}</span>
                  </th>
                  <td
                    className="border-l border-line px-2 py-2 text-center font-display text-sm font-bold"
                    style={{ background: coverage.background, color: coverage.color }}
                    aria-label={coverage.label}
                    title={coverage.label}
                  >
                    {coverage.short}<span className="sr-only"> {coverage.label}</span>
                  </td>
                  <td
                    className="border-l border-line px-2 py-2 text-center font-mono font-semibold"
                    style={{ background: heatColor('var(--bar)', row.catalog_card_count, maxCatalog) }}
                  >{row.catalog_card_count}</td>
                  <td
                    className="border-l border-line px-2 py-2 text-center font-mono font-semibold"
                    style={{ background: heatColor('var(--petrol)', row.portfolio_report_count, maxPortfolio) }}
                  >{row.portfolio_report_count}</td>
                  <td
                    className="border-l border-line px-2 py-2 text-center font-mono"
                    style={{ background: heatColor('var(--warn)', row.avg_source_stage_index, 100) }}
                  >{row.avg_source_stage_index == null ? '—' : compact(row.avg_source_stage_index)}</td>
                  <td
                    className="border-l border-line px-2 py-2 text-center font-mono"
                    style={{ background: heatColor('var(--accent)', row.avg_complexity_score, 100) }}
                  >{row.avg_complexity_score == null ? '—' : compact(row.avg_complexity_score)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10.5px] text-ink3" aria-hidden="true">
        <span>D = direct</span><span>P = partial</span><span>— = not covered</span>
        <span>Colour intensity = cell value</span>
      </div>
    </figure>
  )
}

export interface BenchmarkSprintRow {
  id: string
  sprint: string
  name: string
  required_by: string
  priority: string
  selgros_route?: string
}

export interface SprintSwimlaneTimelineProps {
  rows: readonly BenchmarkSprintRow[]
}

const SPRINTS = ['Sprint 1', 'Sprint 2', 'Sprint 3'] as const

/** A semantic swimlane: business functions are lanes and source sprints are columns. */
export function SprintSwimlaneTimeline({ rows }: SprintSwimlaneTimelineProps) {
  const captionId = useId()
  const descId = useId()
  const lanes = useMemo(() => {
    const byLane = new Map<string, BenchmarkSprintRow[]>()
    rows.forEach((row) => {
      const lane = row.required_by || 'Unspecified'
      byLane.set(lane, [...(byLane.get(lane) ?? []), row])
    })
    return [...byLane.entries()]
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, 'en'))
  }, [rows])

  return (
    <figure className="min-w-0" aria-labelledby={captionId} aria-describedby={descId}>
      <figcaption id={captionId} className="mb-1 font-display text-sm font-semibold tracking-wide text-ink">
        Go-live roadmap by flow and sprint
      </figcaption>
      <p id={descId} className="mb-3 text-xs leading-relaxed text-ink3">
        Distributes the {rows.length} source P1 items across three sprints; flows are swimlanes, not confirmed
        owners of a Selgros implementation.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-sm border border-line bg-surface2 p-4 text-sm text-ink3">No planned items.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line" role="region"
          aria-label="Go-live roadmap by flow and sprint, horizontally scrollable" tabIndex={0}>
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <caption className="sr-only">P1 items grouped by requesting flow and declared sprint</caption>
            <thead>
              <tr className="bg-surface2 text-[10px] uppercase tracking-[.08em] text-ink3">
                <th scope="col" className="sticky left-0 z-10 w-40 border-b border-line bg-surface2 px-3 py-2 text-left">Flow</th>
                {SPRINTS.map((sprint, index) => (
                  <th key={sprint} scope="col" className="border-b border-l border-line px-3 py-2 text-left">
                    <span className="inline-flex items-center gap-2">
                      <i className="h-2 w-2 rounded-full" style={{ background: ['var(--bar)', 'var(--petrol)', 'var(--accent)'][index] }} />
                      {sprint}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lanes.map((lane) => (
                <tr key={lane.name} className="border-b border-line last:border-b-0">
                  <th scope="row" className="sticky left-0 z-[1] bg-surface px-3 py-3 text-left align-top font-semibold text-ink">
                    {lane.name}
                    <span className="mt-0.5 block font-mono text-[10px] font-normal text-ink3">{lane.items.length} items</span>
                  </th>
                  {SPRINTS.map((sprint, index) => {
                    const items = lane.items.filter((item) => normalizeText(item.sprint) === normalizeText(sprint))
                    return (
                      <td
                        key={sprint}
                        className="border-l border-line px-2.5 py-2.5 align-top"
                        style={{ background: items.length > 0 ? heatColor(['var(--bar)', 'var(--petrol)', 'var(--accent)'][index], items.length, 5) : 'var(--surface)' }}
                      >
                        <span className="mb-1 block font-mono text-[11px] font-bold text-ink">{items.length}</span>
                        {items.length > 0 ? (
                          <ul className="relative space-y-1 text-[10.5px] leading-snug text-ink2">
                            {items.slice(0, 2).map((item) => <li key={item.id}>{item.name}</li>)}
                            {items.length > 2 ? <li className="font-semibold">+{items.length - 2} other items</li> : null}
                            <li className="sr-only">Full list: {items.map((item) => `${item.id}, ${item.name}`).join('; ')}</li>
                          </ul>
                        ) : <span className="text-ink3" aria-label="No items">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  )
}
