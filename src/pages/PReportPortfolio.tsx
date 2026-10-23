import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import { REPORT_PAGES } from '@/lib/report-portfolio'
import { CONTROL_ROOMS } from '@/lib/control-room-model'
import { useDatasetStore } from '@/lib/data'
import { SOURCE_SCHEMAS } from '@/lib/source-schema'
import { SOURCE_COVERAGE } from '@/lib/coverage-data'

export default function PReportPortfolio({ catalog = false }: { catalog?: boolean }) {
  const store = useDatasetStore()
  const [query, setQuery] = useState(''), [domain, setDomain] = useState('All')
  const pages = useMemo(() => REPORT_PAGES.filter(p => (domain === 'All' || p.group === domain) && `${p.number} ${p.title} ${p.focus} ${p.inputs.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query, domain])
  return <><PageHead title={catalog ? 'Solution catalog' : 'Portfolio & coverage'} dek="25 requested reports and six annex pages. Each report keeps its own name, purpose, visual design and evidence requirements." /><PageBody>
    <div className="cr-kpis"><div><span>Requested reports</span><strong>25</strong></div><div><span>Annex pages</span><strong>6</strong></div><div><span>Distinct report routes</span><strong>{new Set(REPORT_PAGES.map(p => p.path)).size}</strong></div><div><span>Matching this search</span><strong>{pages.length}</strong></div></div>
    <p className="cr-source-note">{SOURCE_SCHEMAS.length} supplied table layouts · {SOURCE_SCHEMAS.reduce((n,s)=>n+s.headers.length,0)} original table fields · {new Set(SOURCE_COVERAGE.dictionary.filter(d=>d.kind==='metric').map(d=>d.name)).size} visual metric definitions · {new Set(SOURCE_COVERAGE.dictionary.filter(d=>d.kind==='attribute').map(d=>d.name)).size} visual attribute definitions. Explore all three inventories in the dynamic grid below. Definition coverage is not proof of populated or validated measures.</p>
    <div className="cr-controls"><label>Find a solution<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Report, measure, data or decision…" /></label><label>Business group<select value={domain} onChange={e => setDomain(e.target.value)}>{['All', ...new Set(REPORT_PAGES.map(p => p.group))].map(d => <option key={d}>{d}</option>)}</select></label><button onClick={() => { setQuery(''); setDomain('All') }}>Reset filters</button></div>
    <div className="report-catalog-grid">{pages.map(p => { const room = CONTROL_ROOMS[p.path], refs = room.references.filter(n => store[n]); return <Card key={p.id} title={`${p.number}. ${p.title}`} sub={p.group}>
      <p>{p.focus}</p><div className="report-catalog-meta"><span>Dedicated report page</span><span>Dynamic grid + PDF / Excel / CSV</span><span>{refs.length ? `${refs.length} local reviewed exports available` : 'Demonstration data; source requirements below'}</span></div>
      <h3>Visuals</h3><ul>{p.visuals.map(v => <li key={v}>{v}</li>)}</ul>
      {catalog && <><h3>Data contract</h3><p>{p.inputs.join(' · ')}</p><h3>Calculation and business limits</h3><p>{room.required}</p><h3>Reference design</h3><p>{p.sourceDesign}</p></>}
      <Link className="report-open" to={p.path}>Open {p.number} <span aria-hidden="true">→</span></Link>
    </Card> })}</div>
  </PageBody></>
}
