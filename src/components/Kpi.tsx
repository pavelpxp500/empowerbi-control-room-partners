import type { ReactNode } from 'react'

const STRIPE: Record<string, string> = {
  green: 'bg-good', yellow: 'bg-warn', red: 'bg-bad', n: 'bg-line2',
}

export default function Kpi(
  { k, v, d, status = 'n' }: { k: string; v: ReactNode; d?: ReactNode; status?: string },
) {
  return (
    <div className="kpi-card">
      <span className={`kpi-accent ${STRIPE[status] ?? STRIPE.n}`} />
      <span className="kpi-label">{k}</span>
      <span className="kpi-value">{v}</span>
      {d && <span className="kpi-detail">{d}</span>}
    </div>
  )
}
