import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Assumptions, Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable from '@/components/DataTable'
import { StoreMap } from '@/components/charts/Charts'
import { mil, n0, pct, useDataset } from '@/lib/data'

const SVC: [string, string][] = [
  ['svc_carmangerie', 'Butchery'], ['svc_pescarie', 'Fish counter'], ['svc_scan_and_go', 'Scan&Go'],
  ['svc_wifi', 'Free WiFi'], ['svc_ev_charging', 'EV charging'],
]

export default function P4Network() {
  const mkD = useDataset('market_master')
  const mk: any[] = mkD.data.filter((r: any) => r.is_store === 1)
  const spD = useDataset('store_performance'); const sp: any[] = spD.data
  const svcRows = SVC.map(([k, name]) => ({ name, cnt: mk.filter((r) => r[k] === 1).length }))
  const cities = new Set(mk.map((r) => (/Bucure|Pantelimon|Băneasa/.test(r.city) ? 'București' : r.city)))

  return (
    <>
      <PageHead title="Network & geography"
        dek="24 stores with real locations, opening hours and services. Sales by store are modelled."
        chips={<><Chip meta={mkD._meta} /><Chip meta={spD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Stores" v={n0(mk.length)} d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="Cities covered" v={n0(cities.size)} d={<span>Bucharest counted once</span>} />
          <Kpi k="Stores in Bucharest" v={n0(mk.filter((r) => /Bucure|Pantelimon|Băneasa/.test(r.city)).length)} d={<span>plus Ilfov</span>} />
          <Kpi k="With EV charging" v={n0(mk.filter((r) => r.svc_ev_charging === 1).length)} d={<span>out of 24</span>} />
        </div>

        <Card title="Network map" sub="location is real; bubble size represents modelled sales"
              chips={<><Chip meta={mkD._meta} /><Chip meta={spD._meta} /></>}>
          <StoreMap rows={sp} sizeKey="net_ron" labelKey="store_name" fmt={(v) => `${mil(v)} RON`} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Sales by store" sub="12 months · modelled" chips={<Chip meta={spD._meta} />}>
            <BarList rows={[...sp].sort((a, b) => b.net_ron - a.net_ron)} label="store_name" value="net_ron"
                     sub="share_pct" fmt={mil} subFmt={pct} strip={/^Selgros /}
                     head={['Store', 'Sales RON', 'Share']} />
          </Card>
          <Card title="In-store services" sub="number of stores offering each service" chips={<Chip meta={mkD._meta} />}>
            <BarList rows={svcRows} label="name" value="cnt" fmt={n0} head={['Service', 'Stores', '']} />
          </Card>
        </div>

        <Assumptions metas={[spD._meta]} />

        <Card title="Store register" sub="plant, address, coordinates and opening hours" chips={<Chip meta={mkD._meta} />}>
          <DataTable rows={mk} cols={[
            { h: 'Plant', render: (r: any) => r.plant },
            { h: 'Store', wide: true, render: (r: any) => r.name },
            { h: 'City', render: (r: any) => r.city },
            { h: 'Postcode', render: (r: any) => r.zip },
            { h: 'Coordinates', render: (r: any) => `${Number(r.lat).toFixed(4)}, ${Number(r.lon).toFixed(4)}` },
            { h: 'L–S', render: (r: any) => r.hours_mon_sat },
            { h: 'Sunday', render: (r: any) => r.hours_sun ?? '—' },
            { h: 'Phone', wide: true, render: (r: any) => r.tel },
          ]} />
        </Card>
        <Ledger metas={[mkD._meta, spD._meta]} />
      </PageBody>
    </>
  )
}
