import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable, { Pill } from '@/components/DataTable'
import { n0, pct, sgn, useDataset } from '@/lib/data'

export default function P17Forecast() {
  const kD = useDataset('ops_forecast_kpi'); const k: any = kD.data[0] ?? {}
  const horizonD = useDataset('ops_forecast_horizon'); const plannerD = useDataset('ops_forecast_planner')
  const methodD = useDataset('ops_forecast_method'); const catD = useDataset('ops_forecast_category')

  return (
    <>
      <PageHead title="Forecast accuracy"
        dek="How error grows across the horizon, where bias appears and which planner carries the most difficult portfolio."
        chips={<><Chip meta={kD._meta} /><Chip meta={plannerD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Backtest rows" v={n0(k.forecast_rows)} d={<span>{n0(k.skus)} distinct items</span>} />
          <Kpi k="WAPE · shortest horizon" v={pct(k.best_horizon_wape_pct)} status="green" d={<span>sum of errors ÷ sum observed</span>} />
          <Kpi k="WAPE · longest horizon" v={pct(k.worst_horizon_wape_pct)} status="red" d={<span>degradation with distance</span>} />
          <Kpi k="Lowest planner WAPE" v={pct(k.best_planner_wape_pct)} d={<span>volume-weighted</span>} />
          <Kpi k="Most difficult portfolio" v={pct(k.worst_planner_wape_pct)} status="yellow" d={<span>volume-weighted WAPE</span>} />
          <Kpi k="Bias at longest horizon" v={sgn(k.longest_horizon_bias_pct)} status={Math.abs(k.longest_horizon_bias_pct ?? 0) > 5 ? 'red' : 'green'}
               d={<span>forecast minus observed</span>} />
        </div>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">WAPE and average line accuracy answer different questions.</b> WAPE keeps
          volume in the denominator and is the comparison metric. Average line accuracy remains in the table
          only as a diagnostic; low-volume items do not receive the same weight as high-volume items.
        </div>

        <Card title="Degradation by horizon" sub="the same items and eight forecast weeks" chips={<Chip meta={horizonD._meta} />}>
          <DataTable caption="Forecast accuracy by horizon" rows={horizonD.data} max={260} cols={[
            { h: 'Horizon', render: (r: any) => `${n0(r.horizon_weeks)} wk` },
            { h: 'Version', wide: true, render: (r: any) => r.forecast_version },
            { h: 'Rows', num: true, render: (r: any) => n0(r.rows) },
            { h: 'Items', num: true, render: (r: any) => n0(r.skus) },
            { h: 'WAPE', render: (r: any) => <Pill status={r.wape_pct < 8 ? 'green' : r.wape_pct < 15 ? 'yellow' : 'red'}>{pct(r.wape_pct)}</Pill> },
            { h: 'Bias', num: true, render: (r: any) => sgn(r.bias_pct) },
            { h: 'Average line accuracy', num: true, render: (r: any) => pct(r.avg_line_accuracy_pct) },
          ]} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Planner portfolios" sub="weighted WAPE" chips={<Chip meta={plannerD._meta} />}>
            <BarList rows={plannerD.data} label="planner_name" value="wape_pct" sub="bias_pct"
              fmt={pct} subFmt={sgn} head={['Planner', 'WAPE', 'Bias']}
              color={(r: any) => r.wape_pct > 14 ? 'var(--bar-bad)' : r.wape_pct > 9 ? 'var(--bar-warn)' : 'var(--bar)'} />
          </Card>
          <Card title="Method used" sub="descriptive, not a causal experiment" chips={<Chip meta={methodD._meta} />}>
            <DataTable caption="Forecast accuracy by method" rows={methodD.data} max={260} cols={[
              { h: 'Method', wide: true, render: (r: any) => r.method },
              { h: 'Rows', num: true, render: (r: any) => n0(r.rows) },
              { h: 'Items', num: true, render: (r: any) => n0(r.skus) },
              { h: 'WAPE', num: true, render: (r: any) => pct(r.wape_pct) },
              { h: 'Bias', num: true, render: (r: any) => sgn(r.bias_pct) },
            ]} />
          </Card>
        </div>

        <Card title="Most difficult categories to forecast" sub="WAPE on observed volume" chips={<Chip meta={catD._meta} />}>
          <BarList rows={catD.data} label="cat_l1" value="wape_pct" sub="bias_pct" fmt={pct} subFmt={sgn}
            head={['Category', 'WAPE', 'Bias']}
            color={(r: any) => r.wape_pct > 15 ? 'var(--bar-bad)' : r.wape_pct > 10 ? 'var(--bar-warn)' : 'var(--bar)'} />
        </Card>

        <Ledger metas={[kD._meta, horizonD._meta, plannerD._meta]} />
      </PageBody>
    </>
  )
}
