import { PageBody, PageHead } from '@/components/layout/AppLayout'
import Card from '@/components/Card'
import Kpi from '@/components/Kpi'
import Chip, { Ledger } from '@/components/Chip'
import BarList from '@/components/BarList'
import DataTable from '@/components/DataTable'
import { mil, n0, n2, pct, useDataset } from '@/lib/data'

export default function P19Finance() {
  const kD = useDataset('ops_finance_kpi'); const k: any = kD.data[0] ?? {}
  const glD = useDataset('ops_gl_account'); const poD = useDataset('ops_po_match')
  const whD = useDataset('ops_warehouse_cost'); const feeD = useDataset('ops_supplier_fee')

  return (
    <>
      <PageHead title="Finance"
        dek="Where inventory postings reconcile — and where purchase invoices, receipts, warehouse costs and supplier fees still require attention."
        chips={<><Chip meta={kD._meta} /><Chip meta={poD._meta} /></>} />
      <PageBody>
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi k="Accounting postings" v={n0(k.posting_rows)} d={<span>debit + credit per movement</span>} />
          <Kpi k="Debit − credit" v={`${n2(k.balance_diff_ron)} RON`} status={Math.abs(k.balance_diff_ron ?? 0) < 0.01 ? 'green' : 'red'}
               d={<span>{mil(k.debit_ron)} RON on each side</span>} />
          <Kpi k="PO lines with mismatch" v={n0(k.mismatch_lines)} status="yellow"
               d={<span>of {n0(k.po_lines)} purchase-order lines</span>} />
          <Kpi k="Absolute PO variance" v={`${mil(k.mismatch_abs_ron)} RON`} status="red"
               d={<span>without offsetting positives and negatives</span>} />
          <Kpi k="Allocated warehouse cost" v={`${mil(k.warehouse_cost_ron)} RON`} d={<span>May–July 2026</span>} />
          <Kpi k="Open supplier fees" v={`${mil(k.fee_open_ron)} RON`} status="yellow"
               d={<span>of {mil(k.fee_due_ron)} RON due</span>} />
        </div>

        <div className="bg-surface2 border-l-[3px] border-accent rounded-r-md px-4 py-3 text-[12.5px] text-ink2">
          <b className="text-ink">Two controls that must not be confused.</b> The posting balance tests double-entry
          accounting and closes net to zero. PO reconciliation tests the invoice against the receipt; it reports
          the absolute variance because positive and negative differences must not conceal one another.
        </div>

        <Card title="Balance by account" sub="debit, credit and net" chips={<Chip meta={glD._meta} />}>
          <DataTable caption="Accounting postings by account" rows={glD.data} max={360} cols={[
            { h: 'Account', render: (r: any) => r.account },
            { h: 'Name', wide: true, render: (r: any) => r.account_name },
            { h: 'Type', render: (r: any) => r.account_type },
            { h: 'Postings', num: true, render: (r: any) => n0(r.posting_rows) },
            { h: 'Debit RON', num: true, render: (r: any) => n2(r.debit_ron) },
            { h: 'Credit RON', num: true, render: (r: any) => n2(r.credit_ron) },
            { h: 'Net RON', num: true, render: (r: any) => n2(r.net_ron) },
          ]} />
        </Card>

        <Card title="Invoice versus receipt" sub="net and absolute variance by category" chips={<Chip meta={poD._meta} />}>
          <DataTable caption="Purchase-order reconciliation" rows={poD.data} max={450} cols={[
            { h: 'Category', wide: true, render: (r: any) => r.cat_l1 },
            { h: 'Lines', num: true, render: (r: any) => n0(r.lines) },
            { h: 'Mismatches', num: true, render: (r: any) => n0(r.mismatch_lines) },
            { h: 'Received RON', num: true, render: (r: any) => n2(r.received_ron) },
            { h: 'Invoiced RON', num: true, render: (r: any) => n2(r.invoiced_ron) },
            { h: 'Net variance RON', num: true, render: (r: any) => n2(r.net_diff_ron) },
            { h: 'Absolute variance RON', num: true, render: (r: any) => n2(r.abs_diff_ron) },
          ]} />
        </Card>

        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))]">
          <Card title="Warehouse cost" sub="allocation by location" chips={<Chip meta={whD._meta} />}>
            <BarList rows={whD.data} label="warehouse_id" value="cost_ron" sub="categories"
              fmt={(v) => `${mil(v)} RON`} subFmt={n0} head={['Warehouse', 'Cost', 'Categories']} />
          </Card>
          <Card title="Supplier fees" sub="due, invoiced and open" chips={<Chip meta={feeD._meta} />}>
            <DataTable caption="Supplier fees by type" rows={feeD.data} max={260} cols={[
              { h: 'Type', wide: true, render: (r: any) => r.fee_type },
              { h: 'Suppliers', num: true, render: (r: any) => n0(r.suppliers) },
              { h: 'Due RON', num: true, render: (r: any) => n2(r.fee_due_ron) },
              { h: 'Invoiced RON', num: true, render: (r: any) => n2(r.fee_invoiced_ron) },
              { h: 'Open RON', num: true, render: (r: any) => n2(r.fee_open_ron) },
              { h: 'Open', num: true, render: (r: any) => pct(r.open_pct) },
            ]} />
          </Card>
        </div>

        <Ledger metas={[kD._meta, poD._meta, whD._meta, feeD._meta]} />
      </PageBody>
    </>
  )
}
