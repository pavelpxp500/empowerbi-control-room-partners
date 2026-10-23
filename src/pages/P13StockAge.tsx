import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { mil, n0, n1, n2, pct, useDataset } from '@/lib/data'

export default function P13StockAge() {
  const kD = useDataset('ops_stock_age_kpi'); const k: any = kD.data[0] ?? {}
  const ageD = useDataset('ops_stock_age_bucket'); const reasonD = useDataset('ops_stock_reason')
  const palD = useDataset('ops_pallet_reconcile'); const oldD = useDataset('ops_stock_old_category')

  return (
    <>
      <PageHead title="Stock ageing"
        dek="Where slow-moving inventory accumulates and why the physical pallet list differs from the total calculated from the snapshot."
        chips={<><Chip meta={kD._meta} /><Chip meta={palD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Snapshot value" v={`${mil(k.value_ron)} RON`} d={<span>{n0(k.skus)} distinct items</span>} />
          <Kpi k="Calculated pallets" v={n0(k.calculated_pallets)} d={<span>quantity ÷ conversion</span>} />
          <Kpi k="Physical pallets" v={n0(k.physical_pallets)} d={<span>pallet list</span>} />
          <Kpi k="Physical − calculated variance" v={n0(k.pallet_difference)} status="yellow"
               d={<span>intentional · mixed receipts</span>} />
          <Kpi k="Value over 90 days" v={pct(k.value_over_90_pct)} status="red"
               d={<span>{mil(k.value_over_90_ron)} RON of total</span>} />
          <Kpi k="Weighted age" v={`${n1(k.age_weighted_days)} days`} d={<span>weighted by value</span>} />
        </div>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">The {n0(k.pallet_difference)}-pallet variance is not an arithmetic error.</b>{' '}
          {pct(k.mixed_receipts_pct)} of physical pallets combine receipts from different days. The snapshot applies
          the declared rule by item × status, while the physical list counts handled units. Both totals remain
          visible specifically to avoid a false reconciliation.
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Inventory by age band" sub="value and pallets" chips={<Chip meta={ageD._meta} />}>
            <BarList rows={ageD.data} label="age_bucket" value="value_ron" sub="pallets"
              fmt={(v) => `${mil(v)} RON`} subFmt={n0} head={['Age', 'Value', 'Pallets']}
              color={(r: any) => String(r.age_bucket).startsWith('91') || String(r.age_bucket).startsWith('>')
                ? 'var(--bar-bad)' : 'var(--bar)'} />
          </Card>
          <Card title="Old inventory by category" sub="over 90 days" chips={<Chip meta={oldD._meta} />}>
            <BarList rows={oldD.data.slice(0, 16)} label="cat_l1" value="value_ron" sub="pallets"
              fmt={(v) => `${mil(v)} RON`} subFmt={n0} head={['Category', 'Value', 'Pallets']} />
          </Card>
        </div>

        <Card title="Why inventory is not saleable" sub="operational status and value" chips={<Chip meta={reasonD._meta} />}>
          <DataTable caption="Inventory by status code" rows={reasonD.data} max={360} cols={[
            { h: 'Code', render: (r: any) => r.reason_code },
            { h: 'Status', wide: true, render: (r: any) => r.reason_label },
            { h: 'Group', render: (r: any) => r.reason_group },
            { h: 'Saleable', render: (r: any) => <Pill status={r.blocks_sale ? 'red' : 'green'}>{r.blocks_sale ? 'No' : 'Yes'}</Pill> },
            { h: 'Items', num: true, render: (r: any) => n0(r.skus) },
            { h: 'Pallets', num: true, render: (r: any) => n1(r.pallets) },
            { h: 'Value RON', num: true, render: (r: any) => n2(r.value_ron) },
          ]} />
        </Card>

        <Card title="Physical-list reconciliation" sub="single receipt versus mixed receipts" chips={<Chip meta={palD._meta} />}>
          <DataTable caption="Pallets by receipt pattern" rows={palD.data} max={240} cols={[
            { h: 'Pattern', wide: true, render: (r: any) => r.receipt_pattern },
            { h: 'Pallets', num: true, render: (r: any) => n0(r.pallets) },
            { h: 'Value RON', num: true, render: (r: any) => n2(r.value_ron) },
            { h: 'Average receipt span', num: true, render: (r: any) => `${n1(r.avg_receipt_span_days)} days` },
          ]} />
        </Card>

        <Ledger metas={[kD._meta, ageD._meta, palD._meta]} />
      </PageBody>
    </>
  )
}
