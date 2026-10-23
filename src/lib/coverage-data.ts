import coverage from './source-coverage.json'
import { REPORT_PAGES } from './report-portfolio'
import { SOURCE_SCHEMAS } from './source-schema'
import type { DatasetStore } from './data'

export const SOURCE_COVERAGE=coverage
export function coverageDatasets():DatasetStore {
  const meta={data_label:'REPORT DEFINITION INVENTORY',source:'Reviewed supplied report schemas and training definitions',caveat:'Definitions and schema coverage, not evidence of populated operational measures. Use the relevant report evidence layer for calculations.',grain:'One documented definition'}
  return {
    cr_report_catalog:{_meta:{...meta,grain:'One report route',table_title:'Current report portfolio'},data:REPORT_PAGES.map(p=>{const c=coverage.reports.find(r=>r.stableId===p.id);return {report_number:p.number,report:p.title,business_group:p.group,path:p.path,decision:p.focus,visual_designs:p.visuals.join(' · '),reference_visual_count:c?.visualCount??0,source_schema_count:SOURCE_SCHEMAS.filter(s=>s.routes.includes(p.path)).length,evidence_gap:c?.sourceGap??'',grid:'Page-specific dynamic workbench',export:'PDF / Excel / CSV'}})},
    cr_source_fields:{_meta:{...meta,table_title:'Complete supplied table fields'},data:SOURCE_SCHEMAS.flatMap(s=>s.headers.map(c=>({table:s.publicLabel,field:c.sourceHeader,type:c.type,unit:c.unit??'Not specified',aggregation:c.aggregation,canonical_alias:c.canonicalAlias,report_routes:s.routes.join(' · '),grain:s.grain,limitations:s.caveat})))},
    cr_visual_definitions:{_meta:{...meta,table_title:'Reference visual metrics and attributes'},data:coverage.dictionary.map(d=>{const p=REPORT_PAGES.find(p=>p.id===d.report_id)!;return {report_number:p.number,report:p.title,business_group:p.group,kind:d.kind,definition:d.name,status:d.status}})},
  }
}
