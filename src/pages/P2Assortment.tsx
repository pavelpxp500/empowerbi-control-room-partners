import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Assumptions, Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable from '@/components/DataTable'
import { Legend, StackedChart } from '@/components/charts/Charts'
import { mil, n0, n2, pct, useDataset } from '@/lib/data'

export default function P2Assortment() {
  const mixD = useDataset('assortment_mix'); const mix: any[] = mixD.data
  const cmD = useDataset('category_month'); const brD = useDataset('top_brands')
  const orD = useDataset('origin_country'); const atD = useDataset('attribute_coverage')
  const totals: any = atD._meta.totals ?? {}

  const totBy = new Map<string, number>()
  cmD.data.forEach((r: any) => totBy.set(r.cat_l1, (totBy.get(r.cat_l1) ?? 0) + r.net_ron))
  const top = [...totBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c)
  const months = [...new Set(cmD.data.map((r: any) => r.month))]
  const piv = months.map((m) => {
    const o: any = { month: String(m).slice(2) }
    top.forEach((c) => { o[c] = cmD.data.find((r: any) => r.month === m && r.cat_l1 === c)?.net_ron ?? 0 })
    return o
  })

  return (
    <>
      <PageHead title="Assortment"
        dek="What Selgros carries, counted across all 16,080 published SKUs, and how that assortment could translate into sales."
        chips={<><Chip meta={mixD._meta} /><Chip meta={cmD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="L1 / L2 categories" v="38 / 320" d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="SKUs" v={n0(mix.reduce((a, r) => a + r.sku_count, 0))} d={<span>with an assigned category</span>} />
          <Kpi k="Distinct brands" v={n0(2362)} d={<span>2,146 after normalisation</span>} />
          <Kpi k="Product-attribute pairs" v={n0(totals.eav_pairs)} d={<span>{n0(totals.distinct_names)} attribute names</span>} />
        </div>

        <Card title="Published assortment by category" sub="counted across all SKUs" chips={<Chip meta={mixD._meta} />}>
          <BarList rows={mix} label="cat_l1" value="sku_count" sub="share_pct" fmt={n0} subFmt={pct}
                   head={['Category', 'SKUs', '% of catalog']} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Median price by category" sub="RON excluding VAT" chips={<Chip meta={mixD._meta} />}>
            <BarList rows={[...mix].sort((a, b) => b.median_net - a.median_net).slice(0, 18)}
                     label="cat_l1" value="median_net" sub="pct_on_offer" fmt={n2} subFmt={pct}
                     head={['Category', 'RON', 'On offer']} />
          </Card>
          <Card title="Category share on offer" sub="% of category SKUs" chips={<Chip meta={mixD._meta} />}>
            <BarList rows={[...mix].sort((a, b) => b.pct_on_offer - a.pct_on_offer).slice(0, 18)}
                     label="cat_l1" value="pct_on_offer" sub="sku_count" fmt={pct} subFmt={n0}
                     head={['Category', 'On offer', 'SKUs']} />
          </Card>
        </div>

        <Card title="Modelled sales by category" sub="the catalog skews non-food; sales do not" chips={<Chip meta={cmD._meta} />}>
          <Legend names={top} />
          <StackedChart rows={piv} x="month" keys={top} names={top} fmt={mil} />
        </Card>
        <Assumptions metas={[cmD._meta]} />

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Brands by SKU count" sub="top 20" chips={<Chip meta={brD._meta} />}>
            <BarList rows={brD.data.slice(0, 20)} label="brand" value="sku_count" sub="pct_on_offer"
                     fmt={n0} subFmt={pct} head={['Brand', 'SKUs', 'On offer']} />
          </Card>
          <Card title="Declared country of origin" sub="top 15" chips={<Chip meta={orD._meta} />}>
            <BarList rows={orD.data.slice(0, 15)} label="origin_country" value="sku_count" sub="share_pct"
                     fmt={n0} subFmt={pct} head={['Country', 'SKUs', 'Share']} />
          </Card>
        </div>

        <Card title="Most frequent attributes" sub="the product model is EAV, not tabular" chips={<Chip meta={atD._meta} />}>
          <DataTable rows={atD.data.slice(0, 40)} cols={[
            { h: 'Group', render: (r: any) => r.attr_group },
            { h: 'Attribute', wide: true, render: (r: any) => r.attr_name },
            { h: 'Products', num: true, render: (r: any) => n0(r.product_count) },
            { h: 'Coverage', num: true, render: (r: any) => pct(r.coverage_pct) },
          ]} />
        </Card>
        <Ledger metas={[mixD._meta, cmD._meta, brD._meta, orD._meta, atD._meta]} />
      </PageBody>
    </>
  )
}
