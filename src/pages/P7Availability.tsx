import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable from '@/components/DataTable'
import { n0, n1, pct, useDataset } from '@/lib/data'

export default function P7Availability() {
  const bsD = useDataset('availability_by_store'); const bs: any[] = bsD.data
  const bcD = useDataset('availability_by_category')
  const srD = useDataset('stock_refresh')
  const best = bs[0]; const worst = bs[bs.length - 1]

  return (
    <>
      <PageHead title="Availability"
        dek="Stock status for every product × store pair at the time of extraction. 385,920 pairs."
        chips={<Chip meta={bsD._meta} />} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Product × store pairs" v={n0(bs.reduce((a, r) => a + r.skus, 0))}
               d={<Chip meta={{ data_label: 'REAL DATA' }} />} />
          <Kpi k="Best availability" v={best?.store_name.replace('Selgros ', '') ?? '—'}
               status="green" d={<span>{pct(best?.oos_pct)} out of stock</span>} />
          <Kpi k="Lowest availability" v={worst?.store_name.replace('Selgros ', '') ?? '—'}
               status="red" d={<span>{pct(worst?.oos_pct)} out of stock</span>} />
          <Kpi k="Network range" v={`${n1((worst?.oos_pct ?? 0) - (best?.oos_pct ?? 0))} pp`}
               status="yellow" d={<span>between the extremes</span>} />
        </div>

        <Card title="Out-of-stock products by store" sub="% of catalog · ascending order" chips={<Chip meta={bsD._meta} />}>
          <BarList rows={bs} label="store_name" value="oos_pct" sub="out_of_stock" fmt={pct} subFmt={n0}
                   strip={/^Selgros /} head={['Store', 'Out of stock', 'SKUs']}
                   color={(r) => (r.oos_pct > 45 ? 'var(--bar-bad)' : r.oos_pct > 36 ? 'var(--bar-warn)' : 'var(--bar)')} />
        </Card>

        <Card title="Out-of-stock products by category" sub="% of category pairs" chips={<Chip meta={bcD._meta} />}>
          <BarList rows={bcD.data} label="cat_l1" value="oos_pct" sub="skus" fmt={pct} subFmt={n0}
                   head={['Category', 'Out of stock', 'SKUs']} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Stock-export cadence" sub="freshness timestamps" chips={<Chip meta={srD._meta} />}>
            <DataTable rows={srD.data} max={330} cols={[
              { h: 'Plant', render: (r: any) => r.plant },
              { h: 'Date', render: (r: any) => r.stock_updated_date },
              { h: 'Time', render: (r: any) => r.stock_updated_time },
              { h: 'Minutes from first', num: true, render: (r: any) => r.minutes_from_first },
            ]} />
          </Card>
          <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2 self-start">
            <b className="text-ink">What the table shows.</b> The 24 timestamps cover 20 distinct minute marks,
            increasing monotonically by plant code, with four stores sharing a minute with the preceding store.
            A sequential export explains the pattern better than a real-time inventory API — but the timestamps
            come from one product page, so this remains an inference from a single observation.
          </div>
        </div>
        <Ledger metas={[bsD._meta, bcD._meta, srD._meta]} />
      </PageBody>
    </>
  )
}
