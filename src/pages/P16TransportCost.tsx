import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { mil, n0, n1, n2, pct, sgn, useDataset } from '@/lib/data'

export default function P16TransportCost() {
  const kD = useDataset('ops_transport_cost_kpi'); const k: any = kD.data[0] ?? {}
  const typeD = useDataset('ops_transport_cost_type'); const carrierD = useDataset('ops_carrier_cost')
  const varianceD = useDataset('ops_transport_variance'); const accountD = useDataset('ops_transport_account')

  return (
    <>
      <PageHead title="Transport cost"
        dek="Cost by shipment and general-ledger account, retaining the provision-to-invoice variance down to carrier level."
        chips={<><Chip meta={kD._meta} /><Chip meta={carrierD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Provisioned" v={`${mil(k.provisioned_ron)} RON`} d={<span>{n0(k.costed_shipments)} costed shipments</span>} />
          <Kpi k="Invoiced" v={`${mil(k.invoiced_ron)} RON`} d={<span>{n2(k.cost_per_shipment_ron)} RON/shipment</span>} />
          <Kpi k="Invoice − provision" v={`${n2(k.diff_ron)} RON`} status={Math.abs(k.diff_pct ?? 0) > 5 ? 'red' : 'yellow'}
               d={<span>{sgn(k.diff_pct)} of provision</span>} />
          <Kpi k="Shipments" v={n0(k.shipments)} d={<span>{n0(k.late_shipments)} delayed</span>} />
          <Kpi k="Average fill" v={pct(k.avg_fill_pct)} status={k.avg_fill_pct >= 85 ? 'green' : 'yellow'} d={<span>all flows</span>} />
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Cost components" sub="invoiced amount and variance" chips={<Chip meta={typeD._meta} />}>
            <BarList rows={typeD.data} label="cost_type_label" value="invoiced_ron" sub="diff_pct"
              fmt={(v) => `${mil(v)} RON`} subFmt={sgn} head={['Cost type', 'Invoiced', 'Variance']} />
          </Card>
          <Card title="Cost by account" sub="chart of accounts used" chips={<Chip meta={accountD._meta} />}>
            <BarList rows={accountD.data} label="account" value="invoiced_ron" sub="diff_ron"
              fmt={(v) => `${mil(v)} RON`} subFmt={n2} head={['Account', 'Invoiced', 'Variance RON']} />
          </Card>
        </div>

        <Card title="Carriers" sub="cost is pre-aggregated before joining kilometres" chips={<Chip meta={carrierD._meta} />}>
          <DataTable caption="Cost and service by carrier" rows={carrierD.data} max={360} cols={[
            { h: 'Carrier', wide: true, render: (r: any) => r.carrier_name },
            { h: 'Type', render: (r: any) => r.carrier_type },
            { h: 'Shipments', num: true, render: (r: any) => n0(r.shipments) },
            { h: 'Km', num: true, render: (r: any) => n1(r.km_road) },
            { h: 'Invoiced RON', num: true, render: (r: any) => n2(r.invoiced_ron) },
            { h: 'RON/km', num: true, render: (r: any) => n2(r.ron_per_km) },
            { h: 'On time', render: (r: any) => <Pill status={r.on_time_pct >= 95 ? 'green' : r.on_time_pct >= 85 ? 'yellow' : 'red'}>{pct(r.on_time_pct)}</Pill> },
            { h: 'Fill', num: true, render: (r: any) => pct(r.fill_pct) },
            { h: 'Variance RON', num: true, render: (r: any) => n2(r.diff_ron) },
          ]} />
        </Card>

        <Card title="Shipments with the largest variance" sub="invoice versus provision" chips={<Chip meta={varianceD._meta} />}>
          <DataTable caption="Cost variance by shipment" rows={varianceD.data} max={430} cols={[
            { h: 'Shipment', render: (r: any) => r.shipment_id },
            { h: 'Carrier', render: (r: any) => r.carrier_id },
            { h: 'Flow', wide: true, render: (r: any) => r.flow_type },
            { h: 'Provisioned RON', num: true, render: (r: any) => n2(r.provisioned_ron) },
            { h: 'Invoiced RON', num: true, render: (r: any) => n2(r.invoiced_ron) },
            { h: 'Variance RON', num: true, render: (r: any) => n2(r.diff_ron) },
            { h: 'Variance', render: (r: any) => <Pill status={Math.abs(r.diff_pct) > 8 ? 'red' : 'yellow'}>{sgn(r.diff_pct)}</Pill> },
          ]} />
        </Card>

        <Ledger metas={[kD._meta, carrierD._meta, typeD._meta]} />
      </PageBody>
    </>
  )
}
