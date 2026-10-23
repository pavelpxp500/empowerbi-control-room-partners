import type { AnalystBrief } from './analytics'

export type ReportTable = Readonly<{
  id: string
  title: string
  dataset: string
  headers: readonly string[]
  rows: readonly (readonly unknown[])[]
  contextHash: string
  viewFingerprint: string
  viewState: string
  grain: string
  source: string
  sourceRowCount?: number
}>

export type ReportExport = Readonly<{
  reportTitle: string
  route: string
  brief: AnalystBrief
  sections: readonly ReportTable[]
}>

const MAX_EXPORT_ROWS = 10000
const MAX_EXPORT_COLUMNS = 16384
const MAX_EXPORT_CELLS = 500_000

function safeFileName(value: string, extension: string): string {
  const base = value.trim().replace(/[\u0000-\u001f\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 96) || 'report'
  return `${base.toLocaleLowerCase('en-GB')}.${extension}`
}

function safeText(value: unknown): string {
  let text: string
  if (value === null || value === undefined) text = ''
  else if (value instanceof Date) text = Number.isNaN(value.getTime()) ? '' : value.toISOString()
  else if (typeof value === 'object') {
    try { text = JSON.stringify(value) } catch { text = String(value) }
  } else text = String(value)
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text
}

function boundedTable(section: ReportTable): ReportTable {
  const headers = section.headers.slice(0, MAX_EXPORT_COLUMNS)
  const rowLimit = Math.min(MAX_EXPORT_ROWS, Math.floor(MAX_EXPORT_CELLS / Math.max(1, headers.length)))
  return {
    ...section,
    headers: headers.map(safeText),
    rows: section.rows.slice(0, rowLimit).map((row) => row.slice(0, headers.length)),
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function xml(value: unknown, protectFormula = true): string {
  const text = protectFormula ? safeText(value) : String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function columnName(index: number): string {
  let value = index + 1
  let result = ''
  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }
  return result
}

function worksheetXml(rows: readonly (readonly unknown[])[]): string {
  const safeRows = rows.slice(0, MAX_EXPORT_ROWS + 1).map((row) => row.slice(0, MAX_EXPORT_COLUMNS))
  const maxColumns = Math.max(1, ...safeRows.map((row) => row.length))
  const sheetRows = safeRows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`
      const style = rowIndex === 0 ? ' s="1"' : ''
      if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`
      return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const endRef = `${columnName(maxColumns - 1)}${Math.max(1, safeRows.length)}`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${endRef}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${sheetRows}</sheetData>${safeRows.length > 1 ? `<autoFilter ref="A1:${columnName(maxColumns - 1)}${safeRows.length}"/>` : ''}</worksheet>`
}

function uint16(value: number): Uint8Array {
  return new Uint8Array([value & 255, (value >>> 8) & 255])
}

function uint32(value: number): Uint8Array {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255])
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(size)
  let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
  return result
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let value = n
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[n] = value >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function zipStore(files: Readonly<Record<string, string>>): Uint8Array {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0
  const entries = Object.entries(files)
  for (const [name, content] of entries) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const crc = crc32(data)
    const local = concat([
      uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0),
      uint32(crc), uint32(data.length), uint32(data.length), uint16(nameBytes.length), uint16(0), nameBytes, data,
    ])
    localParts.push(local)
    centralParts.push(concat([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0),
      uint32(crc), uint32(data.length), uint32(data.length), uint16(nameBytes.length), uint16(0), uint16(0),
      uint16(0), uint16(0), uint32(0), uint32(offset), nameBytes,
    ]))
    offset += local.length
  }
  const localData = concat(localParts)
  const centralData = concat(centralParts)
  const end = concat([
    uint32(0x06054b50), uint16(0), uint16(0), uint16(entries.length), uint16(entries.length),
    uint32(centralData.length), uint32(localData.length), uint16(0),
  ])
  return concat([localData, centralData, end])
}

function uniqueSheetNames(sections: readonly ReportTable[]): string[] {
  const used = new Set<string>()
  return sections.map((section, index) => {
    const clean = section.title.replace(/[\u0000-\u001f\\/*?:\[\]]/g, ' ').replace(/^[\s']+|[\s']+$/g, '').slice(0, 26).replace(/^[\s']+|[\s']+$/g, '')
    const base = /^history$/i.test(clean) ? 'History view' : clean || `View ${index + 1}`
    let name = base
    let suffix = 2
    while (used.has(name.toLowerCase())) { name = `${base.slice(0, 30 - String(suffix).length)} ${suffix}`; suffix += 1 }
    used.add(name.toLowerCase())
    return name
  })
}

export function buildExcelBytes(payload: ReportExport): Uint8Array {
  const sections = payload.sections.map(boundedTable)
  const findingsRows = payload.brief.findings.flatMap((finding) => [
    ['Finding', finding.title], ['What we observe', finding.observation], ['Why it matters', finding.whyItMatters],
    ['What to check now', finding.checks.join(' ')], ['Recommended action', finding.action],
    ['Confidence', finding.confidence], ['Limitations', finding.limitations.join(' ')],
    ['Evidence', finding.evidence.map((item) => `${item.label}: ${item.value} [${item.dataset}; ${item.grain}]`).join(' | ')], ['',''],
  ])
  const reportTables: ReportTable[] = [{
    id: 'analysis', title: 'Analysis', dataset: 'Analytical evidence packet', contextHash: payload.brief.contextHash,
    viewFingerprint: payload.brief.contextHash, viewState: 'Route-level analytical interpretation',
    grain: 'Route-level interpretation', source: payload.brief.sourceLabels.join(' | '),
    headers: ['Control Room analytical report', payload.reportTitle],
    rows: [
      ['Route', payload.route], ['Context fingerprint', payload.brief.contextHash], ['Generated at', payload.brief.generatedAt],
      ['Business question', payload.brief.question], ['Executive summary', payload.brief.summary],
      ['Rows in route context', payload.brief.rowCount], ['Sampled completeness', `${payload.brief.completeness.toFixed(1)}%`],
      ...findingsRows,
    ],
  }, ...sections, {
    id: 'provenance', title: 'View provenance', dataset: 'Captured view metadata', contextHash: payload.brief.contextHash,
    viewFingerprint: payload.brief.contextHash, viewState: 'Each view retains its captured reporting context', grain: 'one captured view', source: 'Report composer',
    headers: ['View', 'Dataset', 'Grain and time context', 'Source', 'Filters and columns', 'Source rows', 'Exported rows', 'Context fingerprint', 'View fingerprint'],
    rows: sections.map(s => [s.title, s.dataset, s.grain, s.source, s.viewState, s.sourceRowCount ?? s.rows.length, s.rows.length, s.contextHash, s.viewFingerprint]),
  }]
  const sheetNames = uniqueSheetNames(reportTables)
  const created = new Date().toISOString()
  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${reportTables.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>',
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(payload.reportTitle)}</dc:title><dc:creator>Pavel Mihai Lucian - EMPOWERBI</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created></cp:coreProperties>`,
    'docProps/app.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Control Room</Application></Properties>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNames.map((name, index) => `<sheet name="${xml(name, false)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${reportTables.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${reportTables.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE20026"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>',
  }
  files['xl/styles.xml']=files['xl/styles.xml'].replace('</styleSheet>','<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
  reportTables.forEach((section, index) => {
    const dataRows = [section.headers, ...section.rows]
    files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(dataRows)
  })
  return zipStore(files)
}

export async function exportExcel(payload: ReportExport): Promise<void> {
  const zip = buildExcelBytes(payload)
  downloadBlob(new Blob([zip.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    safeFileName(payload.reportTitle, 'xlsx'))
}

function pdfText(value: unknown): string {
  // Spreadsheet formula protection must not add apostrophes to PDF negatives.
  const text = typeof value === 'number' ? Number.isFinite(value) ? value.toLocaleString('en-GB', { maximumFractionDigits: 2 }) : 'Unavailable' : value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/Δ/g, 'Delta').replace(/→/g, 'to').replace(/[−–—]/g, '-').replace(/×/g, 'x')
}

export type PdfFonts = { normal: string; bold: string }
let pdfFonts: Promise<PdfFonts> | undefined
function loadPdfFonts(): Promise<PdfFonts> {
  if (!pdfFonts) pdfFonts = Promise.all(['Regular', 'Bold'].map(async style => {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/NotoSans-${style}.ttf`, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error('PDF fonts could not be loaded. Please retry the export.')
    const bytes = new Uint8Array(await response.arrayBuffer())
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
    return btoa(binary)
  })).then(([normal, bold]) => ({ normal, bold })).catch(error => { pdfFonts = undefined; throw error })
  return pdfFonts
}

export async function buildPdfBytes(payload: ReportExport, fonts?: PdfFonts): Promise<Uint8Array> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const fontData = fonts ?? await loadPdfFonts()
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', putOnlyUsedFonts: true })
  doc.addFileToVFS('NotoSans-Regular.ttf', fontData.normal)
  doc.addFileToVFS('NotoSans-Bold.ttf', fontData.bold)
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold')
  doc.setFont('NotoSans', 'normal')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  doc.setFillColor(226, 0, 38)
  doc.rect(0, 0, pageWidth, 5, 'F')
  doc.setTextColor(29, 29, 31)
  let y=20
  const textBlock=(text:string,size=9,bold=false,gap=3)=>{
    doc.setFont('NotoSans',bold?'bold':'normal');doc.setFontSize(size)
    const lines=doc.splitTextToSize(pdfText(text),pageWidth-margin*2) as string[]
    const lineHeight=size*.44
    for(const line of lines){if(y+lineHeight>doc.internal.pageSize.getHeight()-16){doc.addPage();y=18}doc.text(line,margin,y);y+=lineHeight}
    y+=gap
  }
  textBlock(payload.reportTitle,22,true)
  doc.setTextColor(81,81,84)
  textBlock(`Context ${payload.brief.contextHash} | generated ${new Date(payload.brief.generatedAt).toLocaleString('en-GB')}`,9)
  doc.setTextColor(29,29,31)
  textBlock(payload.brief.summary,11,false,6)
  for (const finding of payload.brief.findings.slice(0, 3)) {
    if (y > 165) { doc.addPage(); y = 18 }
    textBlock(finding.title,12,true)
    const lines = [
      `What we observe: ${finding.observation}`,
      `Why it matters: ${finding.whyItMatters}`,
      `What to check now: ${finding.checks.join(' ')}`,
      `Confidence and limitations: ${finding.confidence}. ${finding.limitations.join(' ') || 'No additional limitation supplied.'}`,
      `Recommended reversible action: ${finding.action}`,
      `Evidence: ${finding.evidence.map(e=>`${e.label}: ${e.value} (${e.grain}; ${e.source})`).join(' · ')||'No additional evidence supplied.'}`,
    ]
    for (const line of lines) {
      textBlock(line)
    }
  }
  for (const rawSection of payload.sections) {
    const section = boundedTable(rawSection)
    doc.addPage()
    y=16;doc.setTextColor(29,29,31)
    textBlock(section.title,15,true)
    doc.setTextColor(81,81,84)
    textBlock(`${section.dataset} | ${section.grain} | ${section.viewFingerprint}`,8)
    textBlock(`Showing ${Math.min(500,section.rows.length)} of ${section.sourceRowCount??section.rows.length} scoped rows. View: ${section.viewState} | Source: ${section.source}`,8)
    if(y>160){doc.addPage();y=18}
    autoTable(doc, {
      startY:y,
      head: [section.headers.map(pdfText)],
      body: section.rows.slice(0, 500).map((row) => row.map(pdfText)),
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
      theme: 'grid',
      styles: { font: 'NotoSans', fontSize: 6.5, cellPadding: 1.4, overflow: 'linebreak' },
      headStyles: { fillColor: [226, 0, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: margin, right: margin, bottom: 14 },
    })
  }
  if (payload.sections.length === 0) {
    doc.setFontSize(9); doc.setTextColor(110, 110, 115)
    doc.text('No grid views were captured. The export contains the current analytical interpretation only.', margin, Math.min(184, y + 4))
  }
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page); doc.setFontSize(7); doc.setTextColor(110, 110, 115)
    doc.text('Pavel Mihai Lucian - EMPOWERBI', margin, doc.internal.pageSize.getHeight() - 6)
    doc.text(`Page ${page} / ${pages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' })
  }
  return new Uint8Array(doc.output('arraybuffer'))
}

export async function exportPdf(payload: ReportExport): Promise<void> {
  const pdf = await buildPdfBytes(payload)
  downloadBlob(new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' }), safeFileName(payload.reportTitle, 'pdf'))
}
