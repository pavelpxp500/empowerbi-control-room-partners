import { SOURCE_COVERAGE } from '@/lib/coverage-data'
import AdvancedDataGrid, { type AdvancedDataGridColumn } from './AdvancedDataGrid'

type Definition={kind:string;name:string;status:string}
const columns:AdvancedDataGridColumn<Definition>[]=[{id:'kind',header:'Type',value:r=>r.kind},{id:'name',header:'Metric / attribute definition',value:r=>r.name},{id:'status',header:'Evidence status',value:r=>r.status}]
export default function SourceCoverage({reportId}:{reportId:string}) {
  const report=SOURCE_COVERAGE.reports.find(r=>r.stableId===reportId)
  if(!report)return null
  return <details className="cr-requirements"><summary>Reference coverage · {report.metrics.length} metric definitions · {report.attributes.length} attributes</summary><p>{report.sourceGap}</p><p>Definitions below retain the supplied report concepts. They are not a claim that every measure has usable source facts. Populated source-column examples are available in the Evidence layer selector; operational demo calculations remain separate.</p><AdvancedDataGrid<Definition> caption="Report metric and attribute dictionary" rows={SOURCE_COVERAGE.dictionary.filter(d=>d.report_id===reportId)} columns={columns} getRowId={r=>`${r.kind}:${r.name}`} csvFileName={`report-${reportId}-definitions.csv`}/></details>
}
