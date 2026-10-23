import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Assumptions, Ledger } from '@/components/Chip'
import DataTable from '@/components/DataTable'
import { Legend, TrendChart } from '@/components/charts/Charts'
import { n0, n1, n2, pct, useDataset } from '@/lib/data'

export default function P9OwnBrands() {
  const obD = useDataset('own_brands'); const ob: any[] = obD.data
  const obmD = useDataset('own_brand_month'); const obm: any[] = obmD.data
  const last: any = obm[obm.length - 1] ?? {}
  const rows = obm.map((r) => ({ ...r, month: String(r.month).slice(2) }))

  return (
    <>
      <PageHead title="Own brands"
        dek="Transgourmet Quality, Economy, Natura and TOPSELLER — plus the inconsistencies in the brand master."
        chips={<><Chip meta={obD._meta} /><Chip meta={obmD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Own-brand SKUs" v={n0(ob.reduce((a, r) => a + r.sku_count, 0))}
               d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="Distinct master entries" v={n0(ob.length)} status="red" d={<span>for 5 actual brands</span>} />
          <Kpi k="Sales share" v={pct(last.own_brand_share_pct)} d={<span>latest month · modelled</span>} />
          <Kpi k="Margin advantage" v={`+${n1(last.own_brand_gm_pct - last.national_gm_pct)} pp`}
               status="green" d={<span>versus national brands</span>} />
        </div>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">The brand master has no controlled list.</b> The same own brands appear under
          {` ${ob.length} `}different spellings — including <code>TRANSCOURMET</code> and{' '}
          <code>TRSNSGOURMET</code>, which are typing errors rather than capitalisation variants. In one case,
          a full product name was entered in the brand field. Any report grouped by brand will remain inaccurate
          until the values are normalised.
        </div>

        <Card title="Every master entry" sub="one row = one distinct spelling, not one distinct brand" chips={<Chip meta={obD._meta} />}>
          <DataTable rows={ob} max={520} cols={[
            { h: 'Master entry', wide: true, render: (r: any) => r.brand },
            { h: 'SKUs', num: true, render: (r: any) => n0(r.sku_count) },
            { h: 'Median price', num: true, render: (r: any) => n2(r.median_net) },
            { h: 'On offer', num: true, render: (r: any) => pct(r.pct_on_offer) },
            { h: 'Categories', num: true, render: (r: any) => r.categories },
          ]} />
        </Card>

        <Card title="Own-brand share and margin" sub="24 months · modelled" chips={<Chip meta={obmD._meta} />}>
          <Legend names={['Own-brand share', 'Own-brand margin', 'National-brand margin']} />
          <TrendChart rows={rows} x="month" area={false} height={200} fmt={(v) => `${n1(v)}%`}
            series={[
              { k: 'own_brand_share_pct', name: 'Own-brand share' },
              { k: 'own_brand_gm_pct', name: 'Own-brand margin' },
              { k: 'national_gm_pct', name: 'National-brand margin' },
            ]} />
        </Card>

        <Assumptions metas={[obmD._meta]} />
        <Ledger metas={[obD._meta, obmD._meta]} />
      </PageBody>
    </>
  )
}
