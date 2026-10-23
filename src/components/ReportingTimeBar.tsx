import { useReporting } from '@/lib/ReportingContext'
import { dayCount, referenceRange, REPORT_PERIOD_PRESETS, type Grain } from '@/lib/reporting'

export default function ReportingTimeBar() {
  const { context: c, setContext } = useReporting(), ref = referenceRange(c)
  const change = (key: keyof typeof c, value: string | number) => setContext({ ...c, [key]: value })
  const days = dayCount(c.start, c.end), refDays = dayCount(ref.start, ref.end)
  return <section className="report-time-bar" aria-label="Reporting period">
    <div className="report-time-controls">
      <label className="report-range-preset">Date range<select value={REPORT_PERIOD_PRESETS.find(p => p.start === c.start && p.end === c.end)?.id ?? ''} onChange={e => {
        const preset = REPORT_PERIOD_PRESETS.find(p => p.id === e.target.value)
        if (preset) setContext({ ...c, start: preset.start, end: preset.end })
      }}><option value="">Custom dates</option>{REPORT_PERIOD_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <label>Start date<input type="date" value={c.start} onChange={e => change('start', e.target.value)} /></label>
      <label>End date<input type="date" value={c.end} onChange={e => change('end', e.target.value)} /></label>
      <label className="report-time-grain">Time dimension<select value={c.grain} onChange={e => change('grain', e.target.value as Grain)}>
        {Object.entries({ 'fiscal-year': 'Fiscal year', 'calendar-year': 'Calendar year', quarter: 'Quarter', month: 'Month', week: 'Weekly · Monday', 'iso-week': 'ISO week', day: 'Day' }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select></label>
    </div>
    <p className="report-history-note">Workflow demo history: 1 January 2024–31 August 2026 · 32 months. Source-column examples and reviewed exports retain their own dates. Choose the workflow evidence layer to explore the extended history.</p>
    <details className="report-calendar-options"><summary>Comparison & calendar · {c.comparison === 'year' ? 'Last year' : c.comparison === 'previous' ? 'Previous period' : 'Custom reference'}</summary><div className="report-time-controls">
      <label>Fiscal year starts<select value={c.fiscalStart} onChange={e => change('fiscalStart', Number(e.target.value))}>
        {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2026, i, 1).toLocaleString('en-GB', { month: 'long' })}</option>)}
      </select></label>
      <label>Compare with<select value={c.comparison} onChange={e => change('comparison', e.target.value)}>
        <option value="year">Same dates last year</option><option value="previous">Previous period · same days</option><option value="custom">Custom reference</option>
      </select></label>
      {c.comparison === 'custom' && <><label>Reference start<input type="date" value={c.referenceStart} onChange={e => change('referenceStart', e.target.value)} /></label><label>Reference end<input type="date" value={c.referenceEnd} onChange={e => change('referenceEnd', e.target.value)} /></label></>}
    </div></details>
    <p role="status">{!days || !refDays ? 'Choose valid date ranges. Start must be on or before end.' : `Current: ${days} days. Reference: ${ref.start} to ${ref.end} (${refDays} days).`}{days !== refDays && days > 0 && refDays > 0 ? ' Unequal duration: compare per-day values or align the dates.' : ''} Fiscal year labels use the starting year. Monthly sources include complete months only; they cannot become daily or weekly observations.</p>
  </section>
}
