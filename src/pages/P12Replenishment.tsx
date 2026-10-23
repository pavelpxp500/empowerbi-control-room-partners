import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { n0, n1, n2, pct, useDataset } from '@/lib/data'

const ORDER: Record<string, number> = { naive: 0, 'shelf-life cap': 1, 'promotion-aware': 2 }

export default function P12Replenishment() {
  const kD = useDataset('sol_replenishment_kpi'); const k: any = kD.data[0] ?? {}
  const smD = useDataset('sol_replenishment_summary')
  const scD = useDataset('sol_shelf_classes'); const csD = useDataset('sol_case_sizes')

  const uf = smD.data.filter((r: any) => String(r.shelf_class).startsWith('ultra'))
  const naive: any = uf.find((r: any) => r.policy === 'naive') ?? {}
  const cap: any = uf.find((r: any) => r.policy === 'shelf-life cap') ?? {}
  const promo: any = uf.find((r: any) => r.policy === 'promotion-aware') ?? {}
  const sorted = [...smD.data].sort((a: any, b: any) =>
    String(a.shelf_class).localeCompare(String(b.shelf_class)) || ORDER[a.policy] - ORDER[b.policy])

  return (
    <>
      <PageHead title="Replenishment policy"
        dek="Three replenishment policies run against the same demand paths. Physical attributes are real; demand is generated — which limits what the result can prove."
        chips={<><Chip meta={kD._meta} /><Chip meta={scD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="With declared shelf life" v={n0(k.with_shelf_life)} d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="With case size" v={n0(k.with_case_qty)} d={<span>from quantity thresholds</span>} />
          <Kpi k="Ultra-fresh" v={n0(k.ultra_fresh)} status="red" d={<span>under 7 days</span>} />
          <Kpi k="Series tested" v={n0(k.skus_tested * k.stores_tested)}
               d={<span>{k.skus_tested} SKUs × {k.stores_tested} stores × 180 days</span>} />
        </div>

        <Card title="Backtest result" sub="three policies, identical demand paths" chips={<Chip meta={smD._meta} />}>
          <DataTable rows={sorted} max={460} cols={[
            { h: 'Shelf-life class', wide: true, render: (r: any) => r.shelf_class },
            { h: 'Policy', render: (r: any) => <code>{r.policy}</code> },
            { h: 'Service', num: true, render: (r: any) => pct(r.service_pct) },
            { h: 'Waste', render: (r: any) => (
              <Pill status={r.waste_pct > 10 ? 'red' : r.waste_pct > 0.5 ? 'yellow' : 'green'}>
                {n2(r.waste_pct)}%
              </Pill>) },
            { h: 'Cover', num: true, render: (r: any) => `${n2(r.cover_days)} d` },
            { h: 'Series', num: true, render: (r: any) => r.series },
          ]} />
        </Card>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">The result that matters — and the one that does not.</b> In three of four
          shelf-life classes, all policies deliver over 99.3% service with virtually zero waste. Added
          sophistication buys nothing there. The value sits in one class — ultra-fresh below 7 days — where
          the shelf-life cap cuts waste from {n2(naive.waste_pct)}% to {n2(cap.waste_pct)}% and raises service
          by {n1(cap.service_pct - naive.service_pct)} points.
        </div>

        <div className="border border-bad rounded-lg px-4 py-3 text-[12.5px]" style={{ background: 'var(--bad-bg)' }}>
          <b className="block mb-0.5">How large the critical class really is</b>
          Only {n0(k.ultra_fresh)} of 16,080 SKUs declare a shelf life below 7 days. This is not because Selgros
          does not sell ultra-fresh products, but because weighed-counter items are largely absent from the
          online catalog. The policy mechanics are demonstrated; the size of the prize is not.
        </div>

        <div className="border border-bad rounded-lg px-4 py-3 text-[12.5px]" style={{ background: 'var(--bad-bg)' }}>
          <b className="block mb-0.5">The negative result, deliberately kept visible</b>
          The promotion-aware layer — the sophisticated part that reads the promotion calendar — adds only{' '}
          {n1(promo.service_pct - cap.service_pct)} service points over the simple cap for ultra-fresh items,
          with no waste benefit ({n2(cap.waste_pct)}% → {n2(promo.waste_pct)}%). The simple rule does nearly all
          the work. A forecast model here sells the final tenths, not the main gain.
        </div>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Shelf-life classes" sub="from the shelf life declared on the product page" chips={<Chip meta={scD._meta} />}>
            <DataTable rows={scD.data} max={280} cols={[
              { h: 'Class', wide: true, render: (r: any) => r.shelf_class },
              { h: 'SKUs', num: true, render: (r: any) => n0(r.skus) },
              { h: 'Median', num: true, render: (r: any) => (r.median_days == null ? '—' : `${n0(r.median_days)} d`) },
              { h: 'Share', num: true, render: (r: any) => pct(r.share_pct) },
              { h: 'Median price', num: true, render: (r: any) => n2(r.median_price) },
              { h: 'With case size', num: true, render: (r: any) => n0(r.with_case_qty) },
            ]} />
          </Card>
          <Card title="Case sizes" sub="read from quantity thresholds" chips={<Chip meta={csD._meta} />}>
            <BarList rows={csD.data.slice(0, 12)} label="case_qty" value="skus" sub="fresh_skus"
                     fmt={n0} subFmt={n0} head={['From … units', 'SKUs', 'Fresh subset']} />
          </Card>
        </div>

        <Ledger metas={[kD._meta, smD._meta]} />
      </PageBody>
    </>
  )
}
