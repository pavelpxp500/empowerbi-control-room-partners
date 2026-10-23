import { useState, type FormEvent } from 'react'
export type Decision = { id: string; domain: string; store: string; item: string; device: string; symptom: string; suspected_cause: string; severity: string; owner: string; due_date: string; status: string; evidence: string; resolution: string; created_at: string; observed_date?: string; actual_value?: number | null; reference_value?: number | null; reference_basis?: string; metric_unit?: string; next_action?: string; reviewer?: string; revision?: number; updated_at?: string }
const storageKey = 'controlroom-local-investigations-v1'
export function readDecisions(): Decision[] {
  try { const rows: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]'); return Array.isArray(rows) ? rows.filter(r => r && typeof r.id === 'string' && typeof r.symptom === 'string' && typeof r.owner === 'string').slice(0, 100) : [] } catch { return [] }
}
export default function DecisionRegister({ rows, onChange, domain }: { rows: Decision[]; onChange: (rows: Decision[]) => void; domain: string }) {
  const [editing, setEditing] = useState(''), [message, setMessage] = useState('')
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget, values = new FormData(form)
    const text = (name: string) => String(values.get(name) ?? '').trim().slice(0, 1000)
    const status = text('status'), evidence = text('evidence'), resolution = text('resolution'), reviewer = text('reviewer')
    if (status === 'Verified closed' && (!evidence || !resolution || !reviewer)) { setMessage('A verified closure requires evidence, a resolution and a reviewer.'); return }
    const id = editing || `CASE-${Date.now()}`, previous = rows.find(r => r.id === id)
    const row: Decision = { id, domain: text('domain'), store: text('store'), item: text('item'), device: text('device'), symptom: text('symptom'), suspected_cause: text('suspected_cause') || 'Unknown', severity: text('severity'), owner: text('owner'), due_date: text('due_date'), status, evidence, resolution, created_at: previous?.created_at ?? new Date().toISOString() }
    const numeric = (key: string) => text(key) === '' ? null : Number(text(key))
    Object.assign(row, { observed_date: text('observed_date'), actual_value: numeric('actual_value'), reference_value: numeric('reference_value'), reference_basis: text('reference_basis'), metric_unit: text('metric_unit'), next_action: text('next_action'), reviewer, revision: (previous?.revision ?? 0) + 1, updated_at: new Date().toISOString() })
    if ((row.actual_value !== null && !Number.isFinite(row.actual_value)) || (row.reference_value !== null && !Number.isFinite(row.reference_value))) { setMessage('Actual and reference values must be valid numbers or blank.'); return }
    if (!row.symptom || !row.owner || !row.due_date) { setMessage('Provide a symptom, owner and due date.'); return }
    const next = previous ? rows.map(r => r.id === id ? row : r) : [...rows, row].slice(-100)
    onChange(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setMessage(`${id} saved in this browser only. Export the register to share it.`) } catch { setMessage('Saved for this session only. Browser storage is unavailable. Export before leaving.') }
    setEditing(''); form.reset()
  }
  const selected = rows.find(r => r.id === editing)
  return <section className="cr-decision">
    <header><h2>{domain === 'Audit' ? 'Control review & decision register' : 'POS and operational investigation form'}</h2><p>Record the symptom separately from the suspected cause. Local drafts do not notify owners or post to any system.</p></header>
    <label>Open a saved case<select value={editing} onChange={e => setEditing(e.target.value)}><option value="">New investigation</option>{rows.map(r => <option key={r.id} value={r.id}>{r.id} · {r.symptom.slice(0, 60)}</option>)}</select></label>
    <form key={editing} onSubmit={save} className="cr-form">
      <label>Domain<select name="domain" defaultValue={selected?.domain ?? domain}>{['Audit', 'POS performance', 'Supply chain', 'Stock', 'Pricing', 'Customer', 'Finance'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Store / location<input name="store" defaultValue={selected?.store} maxLength={120} /></label><label>Item / product<input name="item" defaultValue={selected?.item} maxLength={120} /></label><label>Device / till<input name="device" defaultValue={selected?.device} maxLength={120} /></label>
      <label>Observed date<input type="date" name="observed_date" defaultValue={selected?.observed_date} /></label><label>Actual observed value<input type="number" step="any" name="actual_value" defaultValue={selected?.actual_value ?? ''} /></label><label>Reference value<input type="number" step="any" name="reference_value" defaultValue={selected?.reference_value ?? ''} /></label><label>Metric / unit<input name="metric_unit" defaultValue={selected?.metric_unit} placeholder="e.g. failed scans / 100 transactions" maxLength={120} /></label>
      <label className="cr-form-wide">Reference basis<input name="reference_basis" defaultValue={selected?.reference_basis} placeholder="Comparable period, agreed target, budget or policy" maxLength={300} /></label><label className="cr-form-wide">Next action<input name="next_action" defaultValue={selected?.next_action} maxLength={300} /></label>
      <label className="cr-form-wide">Observed symptom<textarea required name="symptom" defaultValue={selected?.symptom} maxLength={1000} placeholder="What failed, when, and which transactions or products were affected?" /></label>
      <label className="cr-form-wide">Suspected cause (not yet verified)<textarea name="suspected_cause" defaultValue={selected?.suspected_cause} maxLength={1000} placeholder="Unknown until evidence supports a cause" /></label>
      <label>Severity<select name="severity" defaultValue={selected?.severity ?? 'Medium'}>{['High', 'Medium', 'Low'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Accountable owner<input required name="owner" defaultValue={selected?.owner} maxLength={120} /></label><label>Due date<input required name="due_date" type="date" defaultValue={selected?.due_date} /></label>
      <label>Status<select name="status" defaultValue={selected?.status ?? 'Open'}>{['Open', 'Investigating', 'Awaiting evidence', 'Action in progress', 'Verified closed'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="cr-form-wide">Evidence / verification reference<textarea name="evidence" defaultValue={selected?.evidence} maxLength={1000} placeholder="Log, document, reconciliation or test result. Do not enter passwords or personal data." /></label>
      <label className="cr-form-wide">Resolution and recovery check<textarea name="resolution" defaultValue={selected?.resolution} maxLength={1000} /></label>
      <label>Reviewer for verified closure<input name="reviewer" defaultValue={selected?.reviewer} maxLength={120} /></label>
      <button type="submit">{editing ? 'Save case update' : 'Create investigation'}</button><p role="status">{message}</p>
    </form>
  </section>
}
