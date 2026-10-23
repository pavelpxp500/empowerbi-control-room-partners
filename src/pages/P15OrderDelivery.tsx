import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { mil, n0, n1, n2, pct, useDataset } from '@/lib/data'

export default function P15OrderDelivery() {
  const kD = useDataset('ops_delivery_kpi'); const k: any = kD.data[0] ?? {}
  const catD = useDataset('ops_open_category'); const overdueD = useDataset('ops_overdue_orders')
  const whD = useDataset('ops_receiving_warehouse'); const peakD = useDataset('ops_receiving_peak')

  return (
    <>
      <PageHead title="Order & delivery"
        dek="What has been promised but not delivered, how much of the backlog has allocated stock and when receiving bays exceed declared capacity."
        chips={<><Chip meta={kD._meta} /><Chip meta={whD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Open lines" v={n0(k.open_lines)} d={<span>{n2(k.qty_open)} outstanding units</span>} />
          <Kpi k="Overdue" v={n0(k.overdue_lines)} status="red"
               d={<span>{pct(100 * (k.overdue_lines ?? 0) / (k.open_lines || 1))} of open lines</span>} />
          <Kpi k="Open value" v={`${mil(k.open_value_ron)} RON`} status="yellow" d={<span>at line net price</span>} />
          <Kpi k="Allocation cover" v={pct(k.allocation_cover_pct)} status={k.allocation_cover_pct >= 95 ? 'green' : 'yellow'}
               d={<span>allocation capped at outstanding quantity</span>} />
          <Kpi k="Overloaded slots" v={n0(k.overloaded_slots)} status={k.overloaded_slots ? 'red' : 'green'}
               d={<span>of {n0(k.slots)} warehouse × day × time slots</span>} />
          <Kpi k="Peak bay utilisation" v={pct(k.peak_utilisation_pct)} status={k.peak_utilisation_pct > 100 ? 'red' : 'green'}
               d={<span>average across all slots: {pct(k.avg_utilisation_pct)}</span>} />
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Backlog by category" sub="value and allocation cover" chips={<Chip meta={catD._meta} />}>
            <BarList rows={catD.data.slice(0, 18)} label="cat_l1" value="open_value_ron" sub="allocation_cover_pct"
              fmt={(v) => `${mil(v)} RON`} subFmt={pct} head={['Category', 'Value', 'Coverage']}
              color={(r: any) => r.allocation_cover_pct < 70 ? 'var(--bar-bad)' : r.allocation_cover_pct < 90 ? 'var(--bar-warn)' : 'var(--bar)'} />
          </Card>
          <Card title="Receiving bays by location" sub="peak utilisation and slots above 100% bay capacity" chips={<Chip meta={whD._meta} />}>
            <BarList rows={whD.data} label="warehouse_id" value="peak_utilisation_pct" sub="overloaded_slots"
              fmt={pct} subFmt={n0} head={['Warehouse', 'Peak utilisation', 'Over-capacity slots']}
              color={(r: any) => r.peak_utilisation_pct > 100 ? 'var(--bar-bad)' : 'var(--bar)'} />
          </Card>
        </div>

        <Card title="What is overdue" sub="top 120 by open value" chips={<Chip meta={overdueD._meta} />}>
          <DataTable caption="Overdue order lines" rows={overdueD.data} max={480} cols={[
            { h: 'Order', render: (r: any) => r.order_id },
            { h: 'Line', num: true, render: (r: any) => n0(r.line_no) },
            { h: 'Plant', render: (r: any) => r.plant },
            { h: 'Customer', render: (r: any) => r.customer_id },
            { h: 'SKU', render: (r: any) => r.sku },
            { h: 'Category', wide: true, render: (r: any) => r.cat_l1 },
            { h: 'Promised', render: (r: any) => r.promised_date },
            { h: 'Outstanding', num: true, render: (r: any) => n2(r.qty_open) },
            { h: 'Allocated', num: true, render: (r: any) => n2(r.qty_allocated) },
            { h: 'Value RON', num: true, render: (r: any) => n2(r.value_open_ron) },
          ]} />
        </Card>

        <Card title="Most constrained slots" sub="warehouse × day × time window" chips={<Chip meta={peakD._meta} />}>
          <DataTable caption="Receiving slots with the highest utilisation" rows={peakD.data} max={420} cols={[
            { h: 'Warehouse', render: (r: any) => r.warehouse_id },
            { h: 'Date', render: (r: any) => r.date },
            { h: 'Window', render: (r: any) => r.time_window },
            { h: 'Bays', num: true, render: (r: any) => n0(r.ramps) },
            { h: 'Pallet capacity', num: true, render: (r: any) => n0(r.capacity_pallets) },
            { h: 'Booked', num: true, render: (r: any) => n0(r.booked_pallets) },
            { h: 'Utilisation', render: (r: any) => <Pill status={r.utilisation_pct > 100 ? 'red' : r.utilisation_pct > 85 ? 'yellow' : 'green'}>{pct(r.utilisation_pct)}</Pill> },
            { h: 'Estimated labour hours', num: true, render: (r: any) => n1(r.labour_hours_est) },
          ]} />
        </Card>

        <Ledger metas={[kD._meta, catD._meta, whD._meta]} />
      </PageBody>
    </>
  )
}
