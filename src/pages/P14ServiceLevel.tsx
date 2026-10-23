import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { mil, n0, n2, pct, useDataset } from '@/lib/data'

export default function P14ServiceLevel() {
  const kD = useDataset('ops_service_kpi'); const k: any = kD.data[0] ?? {}
  const dirD = useDataset('ops_service_direction'); const reasonD = useDataset('ops_service_reason')
  const storeD = useDataset('ops_service_store'); const catD = useDataset('ops_service_category')
  const failed = reasonD.data.filter((r: any) => r.fail_reason !== 'delivered as planned')

  return (
    <>
      <PageHead title="Service level"
        dek="Inbound and outbound OTIF, separated into timeliness, completeness and the exact reason for failure."
        chips={<><Chip meta={kD._meta} /><Chip meta={storeD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Lines evaluated" v={n0(k.lines)} d={<span>inbound + outbound</span>} />
          <Kpi k="Outbound OTIF" v={pct(k.outbound_otif_pct)} status={k.outbound_otif_pct >= 95 ? 'green' : 'yellow'}
               d={<span>customer · denominator: outbound lines</span>} />
          <Kpi k="Inbound OTIF" v={pct(k.inbound_otif_pct)} status={k.inbound_otif_pct >= 95 ? 'green' : 'yellow'}
               d={<span>supplier · denominator: inbound lines</span>} />
          <Kpi k="Non-compliant lines" v={n0(k.failed_lines)} status="red" d={<span>delay, quantity or both</span>} />
          <Kpi k="Missed value" v={`${mil(k.missed_value_ron)} RON`} status="red" d={<span>planned minus actual, positive only</span>} />
        </div>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">OTIF is not the average of “on time” and “in full”.</b> A line passes only when
          both conditions are true. Every percentage displays its population so a denominator change cannot
          masquerade as operational improvement.
        </div>

        <Card title="The two directions" sub="denominator, timeliness and completeness" chips={<Chip meta={dirD._meta} />}>
          <DataTable caption="Service level by direction" rows={dirD.data} max={240} cols={[
            { h: 'Direction', render: (r: any) => r.direction },
            { h: 'Lines', num: true, render: (r: any) => n0(r.lines) },
            { h: 'OTIF', render: (r: any) => <Pill status={r.otif_pct >= 95 ? 'green' : r.otif_pct >= 90 ? 'yellow' : 'red'}>{pct(r.otif_pct)}</Pill> },
            { h: 'On time', num: true, render: (r: any) => pct(r.on_time_pct) },
            { h: 'In full', num: true, render: (r: any) => pct(r.in_full_pct) },
            { h: 'Missed quantity', num: true, render: (r: any) => n2(r.qty_missed) },
            { h: 'Missed value RON', num: true, render: (r: any) => n2(r.missed_value_ron) },
          ]} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Failure reason" sub="non-compliant lines" chips={<Chip meta={reasonD._meta} />}>
            <DataTable caption="OTIF failures by direction and reason" rows={failed} max={320} cols={[
              { h: 'Direction', render: (r: any) => r.direction },
              { h: 'Reason', wide: true, render: (r: any) => r.fail_reason },
              { h: 'Lines', num: true, render: (r: any) => n0(r.lines) },
              { h: 'Direction share', num: true, render: (r: any) => pct(r.share_pct) },
              { h: 'Missed value RON', num: true, render: (r: any) => n2(r.missed_value_ron) },
            ]} />
          </Card>
          <Card title="OTIF by store" sub="outbound lines" chips={<Chip meta={storeD._meta} />}>
            <BarList rows={storeD.data} label="plant" value="otif_pct" sub="lines" fmt={pct} subFmt={n0}
              head={['Plant', 'OTIF', 'Lines']}
              color={(r: any) => r.otif_pct < 90 ? 'var(--bar-bad)' : r.otif_pct < 95 ? 'var(--bar-warn)' : 'var(--bar)'} />
          </Card>
        </div>

        <Card title="Where value is lost" sub="top category × direction" chips={<Chip meta={catD._meta} />}>
          <DataTable caption="Service level by category and direction" rows={catD.data} max={420} cols={[
            { h: 'Direction', render: (r: any) => r.direction },
            { h: 'Category', wide: true, render: (r: any) => r.cat_l1 },
            { h: 'Lines', num: true, render: (r: any) => n0(r.lines) },
            { h: 'OTIF', num: true, render: (r: any) => pct(r.otif_pct) },
            { h: 'Missed value RON', num: true, render: (r: any) => n2(r.missed_value_ron) },
          ]} />
        </Card>

        <Ledger metas={[kD._meta, dirD._meta, storeD._meta]} />
      </PageBody>
    </>
  )
}
