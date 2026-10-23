import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Assumptions, Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable from '@/components/DataTable'
import { Legend, TrendChart } from '@/components/charts/Charts'
import { n0, pct, useDataset } from '@/lib/data'

export default function P8Sgr() {
  const scD = useDataset('sgr_catalog'); const sc: any[] = scD.data
  const sfD = useDataset('sgr_flows'); const sf: any[] = sfD.data
  const last: any = sf[sf.length - 1] ?? {}
  const rows = sf.map((r) => ({ ...r, month: String(r.month).slice(2) }))

  return (
    <>
      <PageHead title="Deposit-return system"
        dek="How many SKUs carry a deposit and what the packaging flow could look like."
        chips={<><Chip meta={scD._meta} /><Chip meta={sfD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="SKUs carrying a deposit" v={n0(sc.reduce((a, r) => a + r.sgr_skus, 0))}
               d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="Categories covered" v={n0(sc.length)} d={<span>of 37</span>} />
          <Kpi k="Containers returned · latest month" v={n0(last.containers_returned)} status="yellow"
               d={<span>rate {pct(last.return_rate_pct)}</span>} />
          <Kpi k="Deposit in circulation" v={`${n0(last.deposit_out_ron - last.deposit_in_ron)} RON`}
               d={<span>monthly difference</span>} />
        </div>

        <Card title="Deposit coverage in the catalog" sub="deposit-bearing SKUs by category" chips={<Chip meta={scD._meta} />}>
          <BarList rows={sc} label="cat_l1" value="sgr_skus" sub="sgr_share_pct" fmt={n0} subFmt={pct}
                   head={['Category', 'Deposit SKUs', '% of category']} />
        </Card>

        <Card title="Packaging flow" sub="placed on market vs returned · 18 months" chips={<Chip meta={sfD._meta} />}>
          <Legend names={['Placed on market', 'Returned']} />
          <TrendChart rows={rows} x="month" fmt={n0} height={200}
                      series={[{ k: 'containers_sold', name: 'Placed on market' }, { k: 'containers_returned', name: 'Returned' }]} />
        </Card>

        <Assumptions metas={[sfD._meta]} />

        <Card title="Monthly detail" chips={<Chip meta={sfD._meta} />}>
          <DataTable rows={sf} max={400} cols={[
            { h: 'Month', render: (r: any) => r.month },
            { h: 'Placed on market', num: true, render: (r: any) => n0(r.containers_sold) },
            { h: 'Returned', num: true, render: (r: any) => n0(r.containers_returned) },
            { h: 'Return rate', num: true, render: (r: any) => pct(r.return_rate_pct) },
            { h: 'Deposit collected', num: true, render: (r: any) => n0(r.deposit_out_ron) },
            { h: 'Deposit refunded', num: true, render: (r: any) => n0(r.deposit_in_ron) },
          ]} />
        </Card>
        <Ledger metas={[scD._meta, sfD._meta]} />
      </PageBody>
    </>
  )
}
