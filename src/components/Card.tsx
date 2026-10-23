import type { ReactNode } from 'react'
import ChartDetails from './ChartDetails'

export default function Card(
  { title, sub, chips, children, className = '' }:
  { title: string; sub?: string; chips?: ReactNode; children: ReactNode; className?: string },
) {
  return (
    <section className={`app-card ${className}`}>
      <header className="flex justify-between items-baseline gap-3 flex-wrap">
        <h2>{title}</h2>
        <div className="flex gap-1.5 items-center">
          {sub && <span className="text-[11.5px] text-ink3">{sub}</span>}
          {chips}
        </div>
      </header>
      <div><ChartDetails>{children}</ChartDetails></div>
    </section>
  )
}
