import { useState } from 'react'
import { Link } from 'react-router'
import { REPORT_BY_PATH, REPORT_PAGES } from '@/lib/report-portfolio'
import './PPresentation.css'

const priorities = [
  {
    id: 'margin', label: 'Protect margin', lens: 'Profitability',
    question: 'Is growth creating more profit—or hiding margin pressure?',
    benefit: 'Look beyond the sales headline. See where gross profit changes, which categories need attention, and what to investigate next.',
    steps: [
      { path: '/current-reference', verb: 'See the change', why: 'Compare periods and scenarios on a consistent basis, from the network down to commercial dimensions.' },
      { path: '/revenue-quality', verb: 'Explain the gap', why: 'Follow the reconciled gross-profit bridge and a losses-first ranking to the areas that deserve scrutiny.' },
      { path: '/pricing', verb: 'Challenge the drivers', why: 'Inspect price, discount and promotion patterns before choosing a commercial response.' },
    ],
    decision: 'Where should commercial teams investigate margin deterioration first?',
    safeguard: 'A variance identifies a question. It does not, by itself, prove a cause.',
  },
  {
    id: 'cash', label: 'Focus working capital', lens: 'Inventory & cash',
    question: 'Where is inventory tying up cash without supporting demand?',
    benefit: 'Put stock exposure and demand signals in the same conversation. Prioritise the items and locations that warrant a closer review.',
    steps: [
      { path: '/stock-age', verb: 'Locate the exposure', why: 'Inspect stock value by age band, category and store at the selected snapshot.' },
      { path: '/stock-analysis', verb: 'Test the demand signal', why: 'Read inventory exposure alongside matched forecast and actual observations.' },
      { path: '/shelf-life-nonmoving', verb: 'Choose the next check', why: 'Separate slow movement, ageing and expiry evidence before reviewing replenishment or disposition.' },
    ],
    decision: 'Which stock positions should we review before committing more cash?',
    safeguard: 'Stock value is exposure, not recoverable cash. Missing expiry dates remain unknown.',
  },
  {
    id: 'service', label: 'Keep service promises', lens: 'Supply chain & customers',
    question: 'Where do delivery failures become a recurring business problem?',
    benefit: 'Connect customer service to supplier performance and operational exceptions. Give finance and operations a shared starting point for investigation.',
    steps: [
      { path: '/otif-outbound', verb: 'Start with the customer', why: 'Review on-time and in-full delivery against the eligible customer-promise population.' },
      { path: '/otif-inbound', verb: 'Trace the supply side', why: 'Examine supplier receipt performance separately, with its own promises and denominator.' },
      { path: '/firefighting', verb: 'Investigate the exceptions', why: 'Explore cause groups and contributing records; distinguish a reported symptom from a verified cause.' },
    ],
    decision: 'Which repeated service exceptions need joint commercial and operational attention?',
    safeguard: 'Supplier and customer service measures stay separate. Service failures are not automatically valued as lost sales.',
  },
  {
    id: 'control', label: 'Strengthen control', lens: 'Finance & governance',
    question: 'Which exceptions deserve attention before they reach the close?',
    benefit: 'Make discrepancies, unposted costs and evidence gaps visible. Structure the review around a clear owner, supporting evidence and the next action.',
    steps: [
      { path: '/purchase-control', verb: 'Surface discrepancies', why: 'Compare invoiced and received items, inspect open commitments and prioritise unmatched lines.' },
      { path: '/finance', verb: 'Prepare the review', why: 'Inspect inventory costs and an exportable, balanced posting proposal before any ledger action.' },
      { path: '/audit', verb: 'Make follow-through explicit', why: 'Review evidence gaps and capture priorities, ownership and follow-up in the demonstration action register.' },
    ],
    decision: 'What must be reconciled, evidenced or assigned before the next finance review?',
    safeguard: 'The demo does not post to the ledger. Its action register is local, not a shared approval workflow.',
  },
] as const

function Arrow() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3.5 10h12M10 4.5l5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export default function PPresentation() {
  const [priorityIndex, setPriorityIndex] = useState(0)
  const priority = priorities[priorityIndex]
  return (
    <article className="pitch-page" aria-label="Control Room presentation">
      <header className="pitch-hero">
        <div className="pitch-hero-copy">
          <p className="pitch-eyebrow">The management advantage</p>
          <h1 tabIndex={-1}>See what matters.<br /><span>Decide what’s next.</span></h1>
          <p className="pitch-lead">A connected view of profit, inventory and service. Built to help leadership move from a headline number to the decisions behind it.</p>
          <div className="pitch-actions">
            <Link className="pitch-button pitch-button--primary" to="/">Explore the Control Room <Arrow /></Link>
            <a className="pitch-text-link" href="#pitch-priorities">Find your starting point <span aria-hidden="true">↓</span></a>
          </div>
          <p className="pitch-demo-note">Interactive demonstration. Explore the capabilities—not live company results.</p>
        </div>
        <aside className="pitch-decision-map" aria-label="From performance to management action">
          <p className="pitch-map-kicker">One management conversation</p>
          <div className="pitch-map-node"><span>01</span><div><b>What changed?</b><p>Performance against a comparable reference.</p></div></div>
          <div className="pitch-map-node"><span>02</span><div><b>Where should we look?</b><p>Stores, categories, items and exceptions.</p></div></div>
          <div className="pitch-map-node"><span>03</span><div><b>What do we do next?</b><p>Evidence to check. An owner. A decision.</p></div></div>
          <div className="pitch-map-foot">From reporting performance<br /><strong>to managing the business.</strong></div>
        </aside>
      </header>

      <div className="pitch-proof-strip" aria-label="Report portfolio structure">
        <div><strong>{REPORT_PAGES.filter(p => !p.id.startsWith('A')).length}</strong><span>core reports</span></div>
        <div><strong>3</strong><span>management domains</span></div>
        <div><strong>{REPORT_PAGES.filter(p => p.id.startsWith('A')).length}</strong><span>specialist annexes</span></div>
        <p>Financial performance.<br />Commercial decisions.<br />Operational execution.</p>
      </div>

      <section id="pitch-priorities" className="pitch-priorities" aria-labelledby="pitch-priorities-title">
        <div className="pitch-section-heading"><p className="pitch-eyebrow">Start with your priority</p><h2 id="pitch-priorities-title">A business question.<br />A clear path to explore.</h2><p>Choose what matters to your next management discussion.</p></div>
        <div className="pitch-priority-buttons" role="group" aria-label="Management priorities">
          {priorities.map((item, index) => <button key={item.id} type="button" aria-pressed={priorityIndex === index} aria-controls="pitch-priority-detail" onClick={() => setPriorityIndex(index)}><span className="pitch-priority-number">0{index + 1}</span>{item.label}</button>)}
        </div>
        <div id="pitch-priority-detail" className="pitch-priority-detail" aria-live="polite" aria-atomic="true">
          <div className="pitch-priority-story">
            <p className="pitch-eyebrow">{priority.lens}</p>
            <h3>{priority.question}</h3>
            <p>{priority.benefit}</p>
            <div className="pitch-decision"><span>The management decision</span><b>{priority.decision}</b></div>
            <p className="pitch-safeguard">{priority.safeguard}</p>
          </div>
          <ol className="pitch-report-path">
            {priority.steps.map((step, index) => <li key={step.path}><Link to={step.path}><div className="pitch-step-top"><span>0{index + 1} / {step.verb}</span><Arrow /></div><h4>{REPORT_BY_PATH[step.path].title}</h4><p>{step.why}</p></Link></li>)}
          </ol>
        </div>
      </section>

      <section className="pitch-workflow" aria-labelledby="pitch-workflow-title">
        <div className="pitch-section-heading"><p className="pitch-eyebrow">Built for the management meeting</p><h2 id="pitch-workflow-title">Follow the question.<br />Keep the evidence in view.</h2></div>
        <div className="pitch-capabilities">
          <Link to="/current-reference"><span className="pitch-feature-index">01 / Explore</span><h3>A comparison you can challenge.</h3><p>Change periods, measures and breakdowns. Follow a variance into the contributing detail, with the comparison basis visible.</p><span className="pitch-feature-link">Try a comparison <Arrow /></span></Link>
          <Link to="/stock-age"><span className="pitch-feature-index">02 / Shape</span><h3>Your question. Your report.</h3><p>Choose columns, filter, group and pivot in the analyst workbench. Capture selected views and prepare PDF or Excel reports.</p><span className="pitch-feature-link">Build a stock view <Arrow /></span></Link>
          <Link to="/ai-copilot"><span className="pitch-feature-index">03 / Interpret</span><h3>An analyst beside the data.</h3><p>Ask about the selected demo evidence, challenge an explanation and identify the next check. Human review stays in charge.</p><span className="pitch-feature-link">Explore the AI analyst <Arrow /></span></Link>
        </div>
      </section>

      <section className="pitch-rollout" aria-labelledby="pitch-rollout-title">
        <div><p className="pitch-eyebrow">A practical next step</p><h2 id="pitch-rollout-title">Prove the value.<br />Then scale with confidence.</h2><p>Start with a focused business review. Agree what a better decision looks like before expanding the scope.</p></div>
        <ol><li><b>Choose a decision</b><span>Select one margin, stock or service question and name the business owner.</span></li><li><b>Validate the evidence</b><span>Connect approved sources, reconcile definitions and confirm access controls before production use.</span></li><li><b>Measure the improvement</b><span>Agree a baseline: review preparation time, exception closure or decision turnaround. Measure rather than assume the benefit.</span></li></ol>
      </section>
      <footer className="pitch-close"><div><h2>Start with one question.<br />See how far you can go.</h2><p>The executive overview is your starting point. Every report opens another layer of detail.</p></div><div className="pitch-actions"><Link className="pitch-button pitch-button--primary" to="/">Open executive overview <Arrow /></Link><Link className="pitch-text-link" to="/benchmark">View portfolio & coverage <Arrow /></Link></div></footer>
    </article>
  )
}
