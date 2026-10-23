import type { ReactNode } from 'react'

export function BenchmarkSourceNotice({ children }: { children?: ReactNode }) {
  return (
    <aside data-benchmark-disclaimer role="note" className="border border-warn rounded-lg px-4 py-3 bg-surface2 text-[12.5px] text-ink2">
      <b className="text-ink">Generalised external benchmark — not validated for Selgros.</b>{' '}
      The catalog comes from the supplied external materials and does not constitute independent validation.
      Stages, examples and criteria describe the source project, not Selgros performance or implementation. The material is not
      officially issued, validated or approved by Selgros Romania.{children ? <> {children}</> : null}
    </aside>
  )
}

const STAGE_STYLE: Record<string, string> = {
  PROD: 'border-good text-good',
  Operational: 'border-good text-good',
  Delivered: 'border-accent text-accent2',
  'In validation': 'border-warn text-ink2',
  DEV: 'border-line2 text-ink2',
  SPEC: 'border-dashed border-line2 text-ink3',
}

export function SourceStageBadge({ stage }: { stage: string }) {
  return (
    <span title="Raw stage in the source project; this is not Selgros status"
      className={`inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.06em] uppercase whitespace-nowrap ${STAGE_STYLE[stage] ?? 'border-line2 text-ink3'}`}>
      {stage}
    </span>
  )
}
