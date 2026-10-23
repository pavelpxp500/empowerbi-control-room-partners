import type { Meta } from '@/lib/data'

const isReal = (label: string) => label.startsWith('REAL DATA')
const isSynthetic = (label: string) => label.startsWith('SYNTHETIC DATA')
const isEngine = (label: string) => label.startsWith('ENGINE OUTPUT')

/** Provenance label. Every figure in the application is paired with one. */
export default function Chip({ meta }: { meta: Meta }) {
  const label = meta.data_label ?? ''
  const base = 'provenance-chip border'
  if (isReal(label))
    return <span className={`${base} bg-accentSoft border-accent text-accent2`} title={meta.source}
      aria-label={`Provenance: real data. ${meta.source ?? ''}`}>real</span>
  if (isSynthetic(label))
    return <span className={`${base} border-dashed border-line2 text-ink3`} title={meta.disclaimer}
      aria-label={`Provenance: synthetic data, seed ${meta.seed}. ${meta.disclaimer ?? ''}`}>synthetic · seed {meta.seed}</span>
  if (isEngine(label))
    return <span className={`${base} bg-surface3 border-line2 text-ink2 font-semibold`} title={meta.method ?? meta.caveat}
      aria-label={`Provenance: engine output. ${meta.method ?? meta.caveat ?? ''}`}>engine</span>
  return <span className={`${base} border-dotted border-line2 text-ink3 italic`} title={meta.source}
    aria-label={`Provenance: third-party source. ${meta.source ?? ''}`}>third-party source</span>
}

export function Assumptions({ metas }: { metas: Meta[] }) {
  const items = [...new Set(metas.flatMap((m) => m.assumptions ?? []))]
  if (!items.length) return null
  return (
    <div className="notice-panel text-[12.5px]">
      <b className="text-ink">Declared modelling assumptions</b>
      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11.5px] text-ink3">
        {items.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </div>
  )
}

/** Input ledger: what is real and what is generated for each engine. */
export function Ledger({ metas }: { metas: Meta[] }) {
  const real = [...new Set(metas.flatMap((m) => {
    if (m.inputs_real?.length) return m.inputs_real
    return isReal(m.data_label ?? '') && m.source ? [m.source] : []
  }))]
  const syn = [...new Set(metas.flatMap((m) => {
    if (m.inputs_synthetic?.length) return m.inputs_synthetic
    if (!isSynthetic(m.data_label ?? '') || !m.source) return []
    return [`${m.source}${m.seed == null ? '' : ` · seed ${m.seed}`}`]
  }))]
  const external = [...new Set(metas.flatMap((m) => {
    const label = m.data_label ?? ''
    return !isReal(label) && !isSynthetic(label) && !isEngine(label) && m.source ? [m.source] : []
  }))]
  const cav = [...new Set(metas.map((m) =>
    m.caveat ?? (isSynthetic(m.data_label ?? '') ? m.disclaimer : undefined),
  ).filter(Boolean) as string[])]
  const met = [...new Set(metas.map((m) => m.method).filter(Boolean) as string[])]
  if (!real.length && !syn.length && !external.length && !cav.length && !met.length) return null
  return (
    <>
      {(real.length || syn.length || external.length) ? (
        <div className="ledger-panel grid gap-5 grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))]">
          {real.length ? <div>
            <h4 className="section-kicker text-accent mb-1.5">Real inputs</h4>
            <ul className="list-disc pl-4 text-[12px] text-ink2 leading-relaxed">
              {real.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div> : null}
          {syn.length ? <div>
            <h4 className="section-kicker mb-1.5">Generated or assumed inputs</h4>
            <ul className="list-disc pl-4 text-[12px] text-ink2 leading-relaxed">
              {syn.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div> : null}
          {external.length ? <div>
            <h4 className="section-kicker mb-1.5">Declared third-party sources</h4>
            <ul className="list-disc pl-4 text-[12px] text-ink2 leading-relaxed">
              {external.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div> : null}
        </div>
      ) : null}
      {met.map((m) => (
        <div key={m} className="notice-panel text-[12.5px]">
          Method: {m}
        </div>
      ))}
      {cav.map((c) => (
        <div key={c} className="caveat-panel text-[12.5px]">
          <b className="block mb-0.5">What this does not prove</b>{c}
        </div>
      ))}
    </>
  )
}
