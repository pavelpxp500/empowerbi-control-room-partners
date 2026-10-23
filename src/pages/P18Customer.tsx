import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { mil, n0, n2, pct, useDataset } from '@/lib/data'

export default function P18Customer() {
  const kD = useDataset('ops_customer_kpi'); const k: any = kD.data[0] ?? {}
  const segD = useDataset('ops_customer_segment'); const riskD = useDataset('ops_customer_risk')
  const topD = useDataset('ops_customer_top'); const priceD = useDataset('ops_customer_price')

  return (
    <>
      <PageHead title="Customer"
        dek="Who buys, which price agreement applies and how detail-week sales compare with the generated commercial limit."
        chips={<><Chip meta={kD._meta} /><Chip meta={topD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Named customers" v={n0(k.customers)} d={<span>{n0(k.restricted_customers)} restricted or under review</span>} />
          <Kpi k="12-month sales" v={`${mil(k.net_ron_12m)} RON`} d={<span>generated customer layer</span>} />
          <Kpi k="Combined limits" v={`${mil(k.credit_limit_ron)} RON`} d={<span>customer-tier assumption</span>} />
          <Kpi k="Risk class C or D" v={n0(k.high_risk_customers)} status="yellow" d={<span>of {n0(k.customers)} customers</span>} />
          <Kpi k="Over limit in detail week" v={n0(k.over_limit_customers)} status={k.over_limit_customers ? 'red' : 'green'}
               d={<span>detailed sales, not an accounting balance</span>} />
          <Kpi k="Master-data completeness" v={pct(k.avg_completeness_pct)} status={k.avg_completeness_pct >= 95 ? 'green' : 'yellow'}
               d={<span>average across generated attributes</span>} />
        </div>

        <div className="border border-bad rounded-lg px-4 py-3 text-[12.5px]" style={{ background: 'var(--bad-bg)' }}>
          <b className="block mb-0.5">Exposure is not the customer's receivable balance</b>
          This page compares detail-week sales with the generated commercial limit. Without open balances,
          receipts and due dates, it cannot establish actual credit-limit utilisation. Anonymous sales
          ({mil(k.anonymous_week_net_ron)} RON) are excluded from the comparison.
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Portfolio by segment" sub="sales, limit and risk" chips={<Chip meta={segD._meta} />}>
            <BarList rows={segD.data} label="segment_name" value="net_ron_12m" sub="customers"
              fmt={(v) => `${mil(v)} RON`} subFmt={n0} head={['Segment', 'Sales', 'Customers']} />
          </Card>
          <Card title="Risk classes" sub="value and completeness" chips={<Chip meta={riskD._meta} />}>
            <DataTable caption="Customers by risk class" rows={riskD.data} max={260} cols={[
              { h: 'Risc', render: (r: any) => <Pill status={r.risk_class === 'A' ? 'green' : r.risk_class === 'B' ? 'yellow' : 'red'}>{r.risk_class}</Pill> },
              { h: 'Customers', num: true, render: (r: any) => n0(r.customers) },
              { h: 'Sales RON', num: true, render: (r: any) => n2(r.net_ron_12m) },
              { h: 'Limit RON', num: true, render: (r: any) => n2(r.credit_limit_ron) },
              { h: 'Completeness', num: true, render: (r: any) => pct(r.completeness_pct) },
            ]} />
          </Card>
        </div>

        <Card title="Customer 360° view" sub="top 120 by 12-month sales" chips={<Chip meta={topD._meta} />}>
          <DataTable caption="Customer portfolio" rows={topD.data} max={500} cols={[
            { h: 'Customer', wide: true, render: (r: any) => r.customer_name },
            { h: 'Segment', render: (r: any) => r.segment_name },
            { h: 'Tier', render: (r: any) => r.customer_tier },
            { h: 'City', render: (r: any) => r.city },
            { h: 'Risc', render: (r: any) => <Pill status={r.risk_class === 'A' ? 'green' : r.risk_class === 'B' ? 'yellow' : 'red'}>{r.risk_class}</Pill> },
            { h: '12-month sales RON', num: true, render: (r: any) => n2(r.net_ron_12m) },
            { h: 'Limit RON', num: true, render: (r: any) => n2(r.credit_limit_ron) },
            { h: 'Detail week RON', num: true, render: (r: any) => n2(r.detail_week_net_ron) },
            { h: 'Exposure', render: (r: any) => <Pill status={r.exposure_pct > 100 ? 'red' : r.exposure_pct > 75 ? 'yellow' : 'green'}>{pct(r.exposure_pct)}</Pill> },
            { h: 'Agreements', num: true, render: (r: any) => n0(r.agreements) },
            { h: 'Average discount', num: true, render: (r: any) => pct(r.discount_pct) },
            { h: 'Master completeness', num: true, render: (r: any) => pct(r.data_completeness_pct) },
          ]} />
        </Card>

        <Card title="Price agreements" sub="individual agreements versus price lists" chips={<Chip meta={priceD._meta} />}>
          <DataTable caption="Commercial agreements by type" rows={priceD.data} max={240} cols={[
            { h: 'Agreement type', wide: true, render: (r: any) => r.agreement_type },
            { h: 'Agreements', num: true, render: (r: any) => n0(r.agreements) },
            { h: 'Customers', num: true, render: (r: any) => n0(r.customers) },
            { h: 'Average discount', num: true, render: (r: any) => pct(r.avg_discount_pct) },
            { h: 'Median discount', num: true, render: (r: any) => pct(r.median_discount_pct) },
            { h: 'Average margin at effective price', num: true, render: (r: any) => pct(r.avg_gm_pct_at_effective) },
          ]} />
        </Card>

        <Ledger metas={[kD._meta, topD._meta, priceD._meta]} />
      </PageBody>
    </>
  )
}
