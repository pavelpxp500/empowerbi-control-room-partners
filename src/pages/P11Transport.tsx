import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable from '@/components/DataTable'
import { Legend, TrendChart } from '@/components/charts/Charts'
import { n0, n1, n2, pct, useDataset } from '@/lib/data'

export default function P11Transport() {
  const kD = useDataset('sol_transport_kpi'); const k: any = kD.data[0] ?? {}
  const hbD = useDataset('sol_hub_siting'); const tfD = useDataset('sol_truck_fill')
  const rtD = useDataset('sol_routes'); const rsD = useDataset('sol_route_summary')
  const cbD = useDataset('sol_cube_by_category'); const tvD = useDataset('sol_transport_volume_month')
  const saved = (k.km_today ?? 0) - (k.km_milkrun ?? 0)
  const tv = tvD.data.map((r: any) => ({ ...r, month: String(r.month).slice(2) }))

  return (
    <>
      <PageHead title="Transport & routing"
        dek="Putting the geography of 24 stores and actual product cube to work: hub locations, truck fill and consolidation potential."
        chips={<><Chip meta={kD._meta} /><Chip meta={cbD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Weekly volume" v={`${n0(k.weekly_m3)} m³`} d={<span>{n0(k.weekly_pallets)} pallets</span>} />
          <Kpi k="Average truck fill" v={pct(k.avg_fill_pct)} status={k.avg_fill_pct >= 85 ? 'green' : 'yellow'}
               d={<span>{k.freq_constrained} stores constrained by frequency</span>} />
          <Kpi k="Weekly kilometres today" v={n0(k.km_today)} d={<span>direct full loads + direct residual loads</span>} />
          <Kpi k="Consolidation saving" v={`${n0(saved)} km`} status="green"
               d={<span>−{n1((100 * saved) / (k.km_today || 1))}% across the network</span>} />
        </div>

        <Card title="Potential hub locations" sub="k-medoids on existing locations" chips={<Chip meta={hbD._meta} />}>
          <DataTable rows={hbD.data} max={240} cols={[
            { h: 'Scenario', render: (r: any) => (r.hubs === 0 ? 'Today' : `${r.hubs} hub${r.hubs > 1 ? 's' : ''}`) },
            { h: 'Locations', wide: true, render: (r: any) => r.sites },
            { h: 'Average km', num: true, render: (r: any) => n1(r.avg_km_weighted) },
            { h: 'Versus today', num: true, render: (r: any) => (r.vs_brasov_pct === 0 ? '—' : `${n1(r.vs_brasov_pct)}%`) },
          ]} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Truck fill by store" sub="red = constrained by minimum frequency" chips={<Chip meta={tfD._meta} />}>
            <BarList rows={[...tfD.data].sort((a: any, b: any) => a.avg_fill_pct - b.avg_fill_pct)}
                     label="store_name" value="avg_fill_pct" sub="deliveries_week" fmt={pct}
                     subFmt={(v: any) => `${v}/wk`} strip={/^Selgros /}
                     head={['Store', 'Fill', 'Deliveries']}
                     color={(r: any) => (r.constrained_by === 'minimum frequency' ? 'var(--bar-bad)' : 'var(--bar)')} />
          </Card>
          <Card title="Space occupied per unit of value" sub="m³ per 1,000 RON · based on actual dimensions" chips={<Chip meta={cbD._meta} />}>
            <BarList rows={cbD.data.slice(0, 16)} label="cat_l1" value="m3_per_1000_ron"
                     fmt={(v) => `${n2(v)} m³`} sub="cases_per_pallet" subFmt={n0}
                     head={['Category', 'm³/1,000 RON', 'Units/pallet']} />
          </Card>
        </div>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">Consolidation does not affect full trucks.</b> A large store consumes several
          full trucks each week, and those already depart at 100% capacity. The consolidatable portion is each
          store's final, partially filled truck. Savings are 24% of residual-load kilometres, but 3.2% across
          all network kilometres. The gap between those two percentages is exactly what disappears when a
          presentation omits its calculation base.
        </div>

        <Card title="Routing scenarios" sub="kilometres per week" chips={<Chip meta={rsD._meta} />}>
          <DataTable rows={rsD.data} max={250} cols={[
            { h: 'Scenario', wide: true, render: (r: any) => r.scenario },
            { h: 'Km/week', num: true, render: (r: any) => n0(r.km_week) },
            { h: 'Trips', num: true, render: (r: any) => n0(r.routes) },
            { h: 'Note', wide: true, render: (r: any) => r.note },
          ]} />
        </Card>

        <Card title="Consolidation runs" sub="Clarke–Wright on residual loads, departing from Brașov" chips={<Chip meta={rtD._meta} />}>
          <DataTable rows={rtD.data} max={420} cols={[
            { h: 'Run', render: (r: any) => r.route },
            { h: 'Stops', num: true, render: (r: any) => r.stops },
            { h: 'Route', wide: true, render: (r: any) => r.stores },
            { h: 'Km', num: true, render: (r: any) => n1(r.km) },
            { h: 'Load', num: true, render: (r: any) => `${n1(r.load_m3)} m³` },
            { h: 'Fill', num: true, render: (r: any) => pct(r.fill_pct) },
          ]} />
        </Card>

        <Card title="Transport volume by month" sub="trucks at 78% fill" chips={<Chip meta={tvD._meta} />}>
          <Legend names={['Trucks per month']} />
          <TrendChart rows={tv} x="month" fmt={n0} height={200} series={[{ k: 'trucks', name: 'Trucks' }]} />
        </Card>

        <Ledger metas={[kD._meta, hbD._meta, cbD._meta]} />
      </PageBody>
    </>
  )
}
