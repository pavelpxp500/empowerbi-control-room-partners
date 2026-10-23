import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Assumptions, Ledger } from '@/components/Chip'
import DataTable, { Pill } from '@/components/DataTable'
import { Legend, StackedChart, TrendChart } from '@/components/charts/Charts'
import { SERIES, mil, mld, n0, n1, n2, pct, sgn, useDataset } from '@/lib/data'

export default function P3Segments() {
  const segD = useDataset('segments'); const seg: any[] = segD.data
  const segmD = useDataset('segment_month'); const csD = useDataset('customer_scorecard')
  const npsD = useDataset('nps_by_segment_quarter')

  const months = [...new Set(segmD.data.map((r: any) => r.month))]
  const piv = months.map((m) => {
    const o: any = { month: String(m).slice(2) }
    seg.forEach((s) => { o[s.segment_code] = segmD.data.find((r: any) => r.month === m && r.segment_code === s.segment_code)?.net_ron ?? 0 })
    return o
  })
  const qs = [...new Set(npsD.data.map((r: any) => r.quarter))]
  const npsRows = qs.map((q) => {
    const o: any = { quarter: q }
    seg.forEach((s) => { o[s.segment_code] = npsD.data.find((r: any) => r.quarter === q && r.segment_code === s.segment_code)?.nps ?? 0 })
    return o
  })

  return (
    <>
      <PageHead title="Customer segments"
        dek="HoReCa, resellers, other companies and individual customers — the four segments Selgros identifies publicly."
        chips={<Chip meta={segD._meta} />} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          {seg.map((s, i) => (
            <Kpi key={s.segment_code} k={s.segment_name} v={`${mld(s.net_ron)} RON`}
                 d={<><span style={{ color: SERIES[i % 4] }}>■</span><span>{pct(s.share_pct)} of revenue · margin {pct(s.gm_pct)}</span></>} />
          ))}
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Segment structure" sub="latest 12 completed months" chips={<Chip meta={segD._meta} />}>
            <DataTable rows={seg} max={260} cols={[
              { h: 'Segment', wide: true, render: (r: any) => r.segment_name },
              { h: 'Sales', num: true, render: (r: any) => mil(r.net_ron) },
              { h: 'Share', num: true, render: (r: any) => pct(r.share_pct) },
              { h: 'Margin', num: true, render: (r: any) => pct(r.gm_pct) },
              { h: 'Customers', num: true, render: (r: any) => n0(r.customers) },
              { h: 'Average basket', num: true, render: (r: any) => n2(r.basket_ron) },
              { h: 'On promotion', num: true, render: (r: any) => pct(r.promo_share_pct) },
            ]} />
          </Card>
          <Card title="NPS by segment" sub="latest four quarters" chips={<Chip meta={npsD._meta} />}>
            <Legend names={seg.map((s) => s.segment_name)} />
            <TrendChart rows={npsRows} x="quarter" area={false} zeroBase={false} height={190} fmt={n0}
                        series={seg.map((s) => ({ k: s.segment_code, name: s.segment_name }))} />
          </Card>
        </div>

        <Card title="Segment trend" sub="43 months" chips={<Chip meta={segmD._meta} />}>
          <Legend names={seg.map((s) => s.segment_name)} />
          <StackedChart rows={piv} x="month" keys={seg.map((s) => s.segment_code)}
                        names={seg.map((s) => s.segment_name)} fmt={mil} />
        </Card>
        <Assumptions metas={[segD._meta, csD._meta]} />

        <Card title="Customer scorecard" sub="220 generated customers" chips={<Chip meta={csD._meta} />}>
          <DataTable rows={csD.data.slice(0, 120)} cols={[
            { h: 'Customer', wide: true, render: (r: any) => r.customer_name },
            { h: 'Segment', render: (r: any) => r.segment_name },
            { h: 'Tier', render: (r: any) => r.tier },
            { h: 'City', render: (r: any) => r.city },
            { h: 'Sales', num: true, render: (r: any) => n0(r.net_ron) },
            { h: 'Margin', num: true, render: (r: any) => pct(r.gm_pct) },
            { h: 'YoY', num: true, render: (r: any) => sgn(r.yoy_pct) },
            { h: 'OTIF', render: (r: any) => <Pill status={r.otif_status}>{n1(r.otif_pct)}%</Pill> },
            { h: 'Visits', num: true, render: (r: any) => r.visits_12m },
            { h: 'NPS', num: true, render: (r: any) => r.nps_latest ?? '—' },
          ]} />
        </Card>
        <Ledger metas={[segD._meta, segmD._meta, csD._meta, npsD._meta]} />
      </PageBody>
    </>
  )
}
