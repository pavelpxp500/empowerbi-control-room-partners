import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable from '@/components/DataTable'
import { n0, n1, n2, pct, useDataset } from '@/lib/data'

export default function P6Pricing() {
  const otD = useDataset('offer_types'); const piD = useDataset('price_instruments')
  const qbD = useDataset('quantity_breaks'); const ldD = useDataset('local_deviations')
  const sibD = useDataset('sibiu_campaign')
  const tot = Number(piD._meta.total_skus ?? 1)
  const leg: Record<string, string> = (otD._meta.legend as any) ?? {}

  return (
    <>
      <PageHead title="Pricing & promotions"
        dek="The complete pricing architecture read from the public page: four instruments, time windows, quantity thresholds and local deviations."
        chips={<Chip meta={otD._meta} />} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          {piD.data.slice(0, 4).map((r: any) => (
            <Kpi key={r.instrument} k={r.instrument} v={n0(r.skus)} d={<span>{pct((100 * r.skus) / tot)} of catalog</span>} />
          ))}
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="The two offer regimes" sub="recalculated from the catalog" chips={<Chip meta={otD._meta} />}>
            <DataTable rows={otD.data} max={200} cols={[
              { h: 'Type', render: (r: any) => r.offer_type },
              { h: 'Definition', wide: true, render: (r: any) => leg[r.offer_type] ?? '—' },
              { h: 'SKUs', num: true, render: (r: any) => n0(r.sku_count) },
              { h: 'Window', num: true, render: (r: any) => `${n0(r.avg_window_days)} d` },
              { h: 'Median discount', num: true, render: (r: any) => pct(r.median_discount_pct) },
              { h: 'P90', num: true, render: (r: any) => pct(r.p90_discount_pct) },
            ]} />
          </Card>
          <Card title="Pricing instruments" sub="SKUs covered by each instrument" chips={<Chip meta={piD._meta} />}>
            <BarList rows={piD.data} label="instrument" value="skus" sub="skus" fmt={n0}
                     subFmt={(v: any) => pct((100 * v) / tot)} head={['Instrument', 'SKUs', '% of catalog']} />
          </Card>
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Quantity thresholds" sub="higher volume, lower unit price" chips={<Chip meta={qbD._meta} />}>
            <BarList rows={qbD.data.slice(0, 12)} label="qty_from" value="breaks" sub="median_break_price"
                     fmt={n0} subFmt={n2} head={['From … units', 'Thresholds', 'Median price']} />
          </Card>
          <Card title="Local price deviations" sub="store-specific offers by location" chips={<Chip meta={ldD._meta} />}>
            <BarList rows={[...ldD.data].sort((a: any, b: any) => b.deviations - a.deviations)}
                     label="store_name" value="deviations" sub="campaigns" fmt={n0} subFmt={n0}
                     strip={/^Selgros /} head={['Store', 'Deviations', 'Campaigns']}
                     color={(r: any) => (r.plant === '371' ? 'var(--bar-bad)' : 'var(--bar)')} />
          </Card>
        </div>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">Sibiu breaks the pattern.</b> Plant 371 has 1,910 local deviations versus a
          median of 22 across the rest of the network. Of these, 1,570 are offers on products with no offer
          at any other store, with a median discount of 31.9%, grouped under separately numbered campaigns.
          Sibiu is the 24th store and the first opened since 2019. This suggests an opening campaign — a hypothesis, not a conclusion.
        </div>

        <Card title="Sibiu campaign" sub="deepest percentage discounts" chips={<Chip meta={sibD._meta} />}>
          <DataTable rows={sibD.data.slice(0, 60)} cols={[
            { h: 'SKU', render: (r: any) => r.sku },
            { h: 'Product', wide: true, render: (r: any) => r.name },
            { h: 'Category', render: (r: any) => r.cat_l1 },
            { h: 'Net price', num: true, render: (r: any) => n2(r.price_net) },
            { h: 'Sibiu price', num: true, render: (r: any) => n2(r.offer_net) },
            { h: 'Discount', num: true, render: (r: any) => `−${n1(r.discount_pct)}%` },
            { h: 'Campaign', render: (r: any) => r.offer_catalog },
          ]} />
        </Card>
        <Ledger metas={[otD._meta, piD._meta, qbD._meta, ldD._meta, sibD._meta]} />
      </PageBody>
    </>
  )
}
