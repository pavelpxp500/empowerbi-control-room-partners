import { PageBody, PageHead } from '@/components/layout/AppLayout'
import { Link } from 'react-router'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Assumptions, Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { Legend, StackedChart, TrendChart } from '@/components/charts/Charts'
import { SERIES, mil, mld, n0, n2, pct, sgn, useDataset, useRows } from '@/lib/data'

export default function P1Executive() {
  const kpiD = useDataset('kpi_executive'); const k: any = kpiD.data[0] ?? {}
  const salesD = useDataset('sales_by_month')
  const segD = useDataset('segments'); const segmD = useDataset('segment_month')
  const dqD = useDataset('dq_gate'); const anchD = useDataset('anchors'); const extD = useDataset('ext_sources')
  const seg: any[] = segD.data

  const months = [...new Set(segmD.data.map((r: any) => r.month))].slice(-24)
  const piv = months.map((m) => {
    const o: any = { month: String(m).slice(2) }
    seg.forEach((s) => { o[s.segment_code] = segmD.data.find((r: any) => r.month === m && r.segment_code === s.segment_code)?.net_ron ?? 0 })
    return o
  })
  const pass = dqD.data.filter((r: any) => r.verdict === 'PASS').length

  return (
    <>
      <PageHead title="Executive Control Room"
        dek="Compare periods, investigate the drivers and assign the next evidence-based action. Demonstration, reviewed reference data and original diagnostics remain separate."
        chips={<><Chip meta={kpiD._meta} /><Chip meta={useRows('assortment_mix').length ? { data_label: 'REAL DATA' } : { data_label: '' }} /></>} />
      <PageBody>
        <div className="grid gap-3.5 md:grid-cols-[1fr_auto] items-center border border-line rounded-lg bg-surface px-4 py-3">
          <div>
            <b className="text-[13px]">New: external benchmark cockpit</b>
            <p className="text-[11.5px] text-ink3 mt-0.5">172 reports inventoried, 74 solution cards, a three-sprint roadmap and coverage across every route — kept separate from Selgros indicators.</p>
          </div>
          <Link to="/benchmark" className="inline-flex justify-center rounded-sm bg-accent text-[var(--on-accent)] px-3 py-2 text-[12px] font-semibold no-underline hover:bg-accent2">
            Open benchmark →
          </Link>
        </div>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Net sales · 12 months" v={`${mld(k.net_sales_ron)} RON`} status={k.net_sales_status}
               d={<span>{sgn(k.net_sales_yoy_pct)} year on year</span>} />
          <Kpi k="Gross margin" v={pct(k.gross_margin_pct)} status={k.gross_margin_status}
               d={<span>{mil(k.gross_margin_ron)} RON</span>} />
          <Kpi k="Average OTIF" v={pct(k.otif_pct)} status={k.otif_status} d={<span>on-time, in-full delivery</span>} />
          <Kpi k="Stock cover" v={`${n0(k.avg_stock_cover_days)} days`} status={k.stock_status} d={<span>category average</span>} />
          <Kpi k="Active SKUs" v={n0(k.active_skus)} d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="Stores" v={n0(k.stores)} d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="Out-of-stock products" v={pct(k.avg_oos_pct)} d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="Catalog on offer" v={pct(k.pct_catalog_on_offer)} d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
        </div>

        <Card title="Net sales and margin by month" sub="43 months · 2023-01 → 2026-07" chips={<Chip meta={salesD._meta} />}>
          <TrendChart rows={salesD.data} x="month" fmt={mil}
            series={[{ k: 'net_ron', name: 'Net sales (RON)' }, { k: 'gm_ron', name: 'Gross margin (RON)' }]} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Segment mix" sub="latest 24 months" chips={<Chip meta={segmD._meta} />}>
            <Legend names={seg.map((s) => s.segment_name)} />
            <StackedChart rows={piv} x="month" keys={seg.map((s) => s.segment_code)}
                          names={seg.map((s) => s.segment_name)} fmt={mil} />
          </Card>
          <Card title="The four segments" sub="latest 12 completed months" chips={<Chip meta={segD._meta} />}>
            <Legend names={seg.map((s) => s.segment_name)} />
            <BarList rows={seg} label="segment_name" value="net_ron" sub="share_pct" fmt={mil} subFmt={pct}
                     head={['Segment', 'Sales RON', 'Share']}
                     color={(r) => SERIES[seg.findIndex((s) => s.segment_code === r.segment_code) % 4]} />
          </Card>
        </div>

        <Assumptions metas={[kpiD._meta, salesD._meta, segD._meta]} />

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          <Card title="Data-quality gate" sub="complete extract" chips={<Chip meta={dqD._meta} />}>
            <div className="text-[26px] font-bold mb-2">{pass}<span className="text-ink3">/{dqD.data.length}</span></div>
            <DataTable rows={dqD.data} max={250} cols={[
              { h: 'Rule', wide: true, render: (r: any) => r.rule },
              { h: '', render: (r: any) => <Pill status={r.verdict === 'PASS' ? 'green' : 'red'}>{r.verdict}</Pill> },
            ]} />
          </Card>
          <Card title="Control anchors" sub="mismatch = major finding" chips={<Chip meta={anchD._meta} />}>
            <DataTable rows={anchD.data} max={250} cols={[
              { h: 'Anchor', wide: true, render: (r: any) => r.anchor },
              { h: 'Value', num: true, render: (r: any) => Number.isInteger(r.value) ? n0(r.value) : n2(r.value) },
              { h: '', render: (r: any) => <span className="font-mono text-[9px] uppercase text-ink3">{r.kind}</span> },
            ]} />
          </Card>
          <Card title="Third-party sources" sub="explicitly cited" chips={<Chip meta={extD._meta} />}>
            <DataTable rows={extD.data} max={250} cols={[
              { h: 'Metric', wide: true, render: (r: any) => r.key },
              { h: 'Value', num: true, render: (r: any) => typeof r.value === 'number' ? n0(r.value) : r.value },
              { h: 'Source', render: (r: any) => <a className="text-accent" href={r.url} target="_blank" rel="noopener">{r.source}</a> },
            ]} />
          </Card>
        </div>
        <Ledger metas={[kpiD._meta, salesD._meta, segD._meta, segmD._meta, dqD._meta, anchD._meta, extD._meta]} />
      </PageBody>
    </>
  )
}
