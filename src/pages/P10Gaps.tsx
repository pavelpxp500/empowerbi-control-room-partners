import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { mil, n0, n2, pct, useDataset } from '@/lib/data'

export default function P10Gaps() {
  const kD = useDataset('sol_stock_kpi'); const k: any = kD.data[0] ?? {}
  const gsD = useDataset('sol_gap_store'); const gs: any[] = gsD.data
  const gcD = useDataset('sol_gap_category'); const arD = useDataset('sol_store_archetype')
  const tlD = useDataset('sol_tail_category'); const gtD = useDataset('sol_gap_top')

  return (
    <>
      <PageHead title="Assortment gaps"
        dek="Products that belong to the network assortment but are missing from a store shelf. Detected entirely from real data and valued using modelled velocity."
        chips={<><Chip meta={kD._meta} /><Chip meta={arD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Network assortment" v={n0(k.core_range)} d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="Product × store gaps" v={n0(k.gaps)} status="red" d={<span>counted from the stock matrix</span>} />
          <Kpi k="Value at risk" v={`${n0(k.value_week_ron)} RON`} status="yellow"
               d={<span>per week · {mil(k.value_year_ron)} RON/year</span>} />
          <Kpi k="Share of published revenue" v={`${n2((100 * k.value_year_ron) / 4.46e9)}%`} d={<span>relative to FY2025</span>} />
          <Kpi k="Average fill rate" v={pct(k.avg_fill_rate_pct)} status="yellow" d={<span>of the network assortment</span>} />
          <Kpi k="Lowest-performing store" v={pct(k.worst_fill_rate_pct)} status="red"
               d={<span>{gs[0]?.store_name?.replace('Selgros ', '')}</span>} />
          <Kpi k="Long tail" v={n0(k.tail_skus)} d={<span>present in 1–3 stores</span>} />
          <Kpi k="Out of stock everywhere" v={n0(k.zero_stock_skus)} d={<span>across the full catalog</span>} />
        </div>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">Two opposing actions in the same table.</b> Gaps concentrate in food,
          where velocity is high and absence is costly. The long tail concentrates in non-food, where velocity
          is low and stock sits. The first calls for replenishment; the second for rationalisation — different
          exercises usually handled by the same team and budget.
        </div>

        <Card title="Gaps by store" sub="network-assortment products missing from the shelf" chips={<Chip meta={gsD._meta} />}>
          <BarList rows={gs} label="store_name" value="gaps" sub="fill_rate_pct" fmt={n0} subFmt={pct}
                   strip={/^Selgros /} head={['Store', 'Gaps', 'Fill rate']}
                   color={(r) => (r.gaps > 900 ? 'var(--bar-bad)' : r.gaps > 350 ? 'var(--bar-warn)' : 'var(--bar)')} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Gap value by category" sub="RON per week" chips={<Chip meta={gcD._meta} />}>
            <BarList rows={gcD.data.slice(0, 16)} label="cat_l1" value="value_week_ron" sub="gaps"
                     fmt={n0} subFmt={n0} head={['Category', 'RON/week', 'Gaps']} />
          </Card>
          <Card title="Long tail by category" sub="products carried in 1–3 of 24 stores" chips={<Chip meta={tlD._meta} />}>
            <BarList rows={tlD.data.slice(0, 16)} label="cat_l1" value="skus" sub="median_price"
                     fmt={n0} subFmt={n2} head={['Category', 'SKUs', 'Median price']} />
          </Card>
        </div>

        <Card title="Store archetypes" sub="k-means on the category-availability vector" chips={<Chip meta={arD._meta} />}>
          <DataTable rows={arD.data} max={400} cols={[
            { h: 'Plant', render: (r: any) => r.plant },
            { h: 'Store', wide: true, render: (r: any) => r.store_name },
            { h: 'City', render: (r: any) => r.city },
            { h: 'Archetype', render: (r: any) => (
              <Pill status={r.archetype === 'full assortment' ? 'green' : r.archetype === 'mid-size assortment' ? 'yellow' : 'red'}>
                {r.archetype}
              </Pill>) },
            { h: 'Average availability', num: true, render: (r: any) => pct(r.avg_avail_pct) },
          ]} />
        </Card>

        <Card title="Highest-value gaps" sub="top 120 by weekly value" chips={<Chip meta={gtD._meta} />}>
          <DataTable rows={gtD.data} cols={[
            { h: 'Store', render: (r: any) => r.store_name.replace('Selgros ', '') },
            { h: 'SKU', render: (r: any) => r.sku },
            { h: 'Product', wide: true, render: (r: any) => r.name },
            { h: 'Category', render: (r: any) => r.cat_l1 },
            { h: 'Brand', render: (r: any) => r.brand ?? '—' },
            { h: 'Net price', num: true, render: (r: any) => n2(r.price_net) },
            { h: 'Present in', num: true, render: (r: any) => `${r.plants_in_stock}/24` },
            { h: 'RON/week', num: true, render: (r: any) => n2(r.gap_value_week_ron) },
          ]} />
        </Card>

        <Ledger metas={[gsD._meta, arD._meta]} />
      </PageBody>
    </>
  )
}
