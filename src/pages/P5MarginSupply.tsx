import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Assumptions, Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable from '@/components/DataTable'
import { TrendChart } from '@/components/charts/Charts'
import { n0, n1, n2, pct, useDataset } from '@/lib/data'

export default function P5MarginSupply() {
  const vatD = useDataset('vat_split'); const vat: any[] = vatD.data
  const scD = useDataset('stock_cover'); const sc: any[] = scD.data
  const otD = useDataset('otif_month'); const pmD = useDataset('pareto_margin')
  const cum80 = pmD.data.findIndex((r: any) => r.cum_share_pct >= 80) + 1
  const ms = [...new Set(otD.data.map((r: any) => r.month))].sort()
  const otRows = ms.map((m) => {
    const s = otD.data.filter((r: any) => r.month === m)
    return { month: String(m).slice(2), otif: s.reduce((a: number, r: any) => a + r.otif_pct, 0) / (s.length || 1) }
  })
  const pareto = pmD.data.map((r: any, i: number) => ({ i: String(i + 1), cum: r.cum_share_pct }))
  const med = [...sc].map((r) => r.avg_cover_days).sort((a, b) => a - b)[Math.floor(sc.length / 2)]

  return (
    <>
      <PageHead title="Margin & supply"
        dek="Where margin is generated, where stock sits and how concentrated revenue is across customers."
        chips={<><Chip meta={vatD._meta} /><Chip meta={scD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="SKUs at 21% VAT" v={n0(vat.find((r) => r.vat_rate === 21)?.sku_count)}
               d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="SKUs at 11% VAT" v={n0(vat.find((r) => r.vat_rate === 11)?.sku_count)}
               d={<span>basic food products</span>} />
          <Kpi k="Customers generating 80% of revenue" v={n0(cum80)} d={<span>of 220 modelled</span>} />
          <Kpi k="Median stock cover" v={`${n0(med)} days`} d={<span>modelled</span>} />
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="VAT-rate structure" sub="19% → 21% change on 1 Aug 2025" chips={<Chip meta={vatD._meta} />}>
            <DataTable rows={vat} max={200} cols={[
              { h: 'Rate', render: (r: any) => `${r.vat_rate}%` },
              { h: 'SKUs', num: true, render: (r: any) => n0(r.sku_count) },
              { h: 'Catalog share', num: true, render: (r: any) => pct(r.share_pct) },
              { h: 'Median price', num: true, render: (r: any) => n2(r.median_net) },
              { h: 'On offer', num: true, render: (r: any) => pct(r.pct_on_offer) },
            ]} />
          </Card>
          <Card title="OTIF trend" sub="latest 18 months" chips={<Chip meta={otD._meta} />}>
            <TrendChart rows={otRows} x="month" height={190} zeroBase={false} fmt={(v) => `${n1(v)}%`}
                        series={[{ k: 'otif', name: 'Average OTIF' }]} />
            <p className="text-[11px] text-ink3 mt-1.5">
              The axis does not start at zero — its range follows the series so variation remains visible.
            </p>
          </Card>
        </div>

        <Card title="Stock cover by category" sub="days · red below 7 or above 150" chips={<Chip meta={scD._meta} />}>
          <BarList rows={[...sc].sort((a, b) => b.avg_cover_days - a.avg_cover_days)}
                   label="cat_l1" value="avg_cover_days" sub="sku_count" fmt={(v) => `${n1(v)} d`} subFmt={n0}
                   head={['Category', 'Days', 'SKUs']}
                   color={(r) => (r.status === 'red' ? 'var(--bar-bad)' : r.status === 'yellow' ? 'var(--bar-warn)' : 'var(--bar)')} />
        </Card>

        <Card title="Revenue concentration by customer" sub="cumulative curve · top 120 customers" chips={<Chip meta={pmD._meta} />}>
          <TrendChart rows={pareto} x="i" height={200} fmt={(v) => `${n0(v)}%`}
                      series={[{ k: 'cum', name: 'Cumulative share' }]} />
        </Card>

        <Assumptions metas={[scD._meta, otD._meta, pmD._meta]} />
        <Ledger metas={[vatD._meta, scD._meta, otD._meta, pmD._meta]} />
      </PageBody>
    </>
  )
}
