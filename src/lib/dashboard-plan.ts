/** A dashboard is a selection of trusted calculations, never executable AI code. */
export const DASHBOARD_COLOURS = ['blue', 'teal', 'violet', 'amber'] as const
export type DashboardColour = typeof DASHBOARD_COLOURS[number]
export type DashboardManifest = {
  measures: { id: string; label: string; unit: string; definition: string }[]
  dimensions: { id: string; label: string; temporal: boolean }[]
}
export type DashboardPlan = {
  version: 1
  title: string
  cards: { measure: string; colour: DashboardColour }[]
  charts: { measure: string; dimension: string; type: 'bar' | 'line' | 'area'; colour: DashboardColour }[]
}
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const only = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every(k => keys.includes(k))
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max
export function validDashboardManifest(v: unknown): v is DashboardManifest {
  if (!isRecord(v) || !only(v, ['measures', 'dimensions']) || !Array.isArray(v.measures) || !Array.isArray(v.dimensions)) return false
  if (!v.measures.length || v.measures.length > 24 || v.dimensions.length > 24) return false
  return v.measures.every(m => isRecord(m) && only(m, ['id', 'label', 'unit', 'definition']) && text(m.id, 100) && text(m.label, 160) && typeof m.unit === 'string' && m.unit.length <= 50 && text(m.definition, 600))
    && v.dimensions.every(d => isRecord(d) && only(d, ['id', 'label', 'temporal']) && text(d.id, 100) && text(d.label, 160) && typeof d.temporal === 'boolean')
    && new Set(v.measures.map(m => m.id)).size === v.measures.length && new Set(v.dimensions.map(d => d.id)).size === v.dimensions.length
}
export function validateDashboardPlan(value: unknown, manifest: DashboardManifest): DashboardPlan {
  if (!isRecord(value) || !only(value, ['version', 'title', 'cards', 'charts']) || value.version !== 1 || !text(value.title, 100)
    || !Array.isArray(value.cards) || !Array.isArray(value.charts) || value.cards.length < 1 || value.cards.length > 4 || value.charts.length > 4) throw new Error('The dashboard layout is invalid. Please request a simpler dashboard.')
  const validMeasure = (v: unknown) => manifest.measures.some(m => m.id === v)
  const validColour = (v: unknown) => DASHBOARD_COLOURS.some(c => c === v)
  if (value.cards.some(c => !isRecord(c) || !only(c, ['measure', 'colour']) || !validMeasure(c.measure) || !validColour(c.colour))) throw new Error('The dashboard requested an unsupported KPI.')
  if (value.charts.some(c => !isRecord(c) || !only(c, ['measure', 'dimension', 'type', 'colour']) || !validMeasure(c.measure) || !validColour(c.colour)
    || !['bar', 'line', 'area'].includes(String(c.type)) || !manifest.dimensions.some(d => d.id === c.dimension && (c.type === 'bar' || d.temporal)))) throw new Error('The dashboard requested an unsupported chart or time dimension.')
  return { version: 1, title: value.title.trim(), cards: value.cards as DashboardPlan['cards'], charts: value.charts as DashboardPlan['charts'] }
}
export function dashboardOutputSchema(manifest: DashboardManifest) {
  const measure = { type: 'string', enum: manifest.measures.map(m => m.id) }, colour = { type: 'string', enum: [...DASHBOARD_COLOURS] }
  return { type: 'object', additionalProperties: false, required: ['version', 'title', 'cards', 'charts'], properties: {
    version: { type: 'integer', enum: [1] }, title: { type: 'string' },
    cards: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['measure', 'colour'], properties: { measure, colour } } },
    charts: { type: 'array', maxItems: manifest.dimensions.length ? 4 : 0, items: { type: 'object', additionalProperties: false, required: ['measure', 'dimension', 'type', 'colour'], properties: { measure, colour, dimension: { type: 'string', enum: manifest.dimensions.length ? manifest.dimensions.map(d => d.id) : ['unavailable'] }, type: { type: 'string', enum: ['bar', 'line', 'area'] } } } },
  } }
}
/** Explicitly labelled rule-based fallback; never represented as a model response. */
export function localDashboardPlan(question: string, manifest: DashboardManifest): DashboardPlan {
  const words = question.toLowerCase().split(/\W+/).filter(w => w.length > 2)
  const score = (label: string) => words.filter(w => label.toLowerCase().includes(w)).length
  const measures = [...manifest.measures].sort((a, b) => score(b.label) - score(a.label)).slice(0, 4)
  const dimensions = [...manifest.dimensions].sort((a, b) => score(b.label) - score(a.label))
  const time = dimensions.find(d => d.temporal), category = dimensions.find(d => !d.temporal)
  const trend = /trend|time|monthly|month|evolution/i.test(question)
  const chosen = trend ? [time, category] : [dimensions[0], time ?? dimensions[1]]
  const dims = [...new Set(chosen.filter(d => d !== undefined))]
  return validateDashboardPlan({ version: 1, title: 'Selected report dashboard', cards: measures.map((m, i) => ({ measure: m.id, colour: DASHBOARD_COLOURS[i] })),
    charts: dims.map((d, i) => ({ measure: measures[0].id, dimension: d.id, type: d.temporal ? 'line' : 'bar', colour: DASHBOARD_COLOURS[i] })),
  }, manifest)
}
