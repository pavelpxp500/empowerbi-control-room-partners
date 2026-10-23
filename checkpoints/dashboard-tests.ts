import assert from 'node:assert/strict'
import { dashboardRegistry, dashboardValue, dashboardSeries, filterDashboardRows } from '../src/lib/dashboard-data'
import { validateDashboardPlan, validDashboardManifest, localDashboardPlan } from '../src/lib/dashboard-plan'
import { SALES_MEASURES, CONTROL_ROOMS, createWorkflowDemo } from '../src/lib/control-room-model'
import { cfoMeasure } from '../src/lib/cfo-comparison'
import { analystApi } from '../src/analyst-api'
import worker from '../src/worker'
import type { RouteAnalytics } from '../src/lib/analytics'

let checks = 0
const check = (f: () => void) => { f(); checks++ }
const config: RouteAnalytics = { title: 'Sales', question: 'Sales by category', defaultDataset: 'cr_sales', datasets: ['cr_sales'], dimension: 'category', metric: 'net_sales', impact: '', action: '', prompts: [], measure: SALES_MEASURES[0] }
const rows = [{ category: 'A', month: '2026-01', net_sales: 100, gross_margin: 10, boxes: 2 }, { category: 'B', month: '2026-02', net_sales: 900, gross_margin: 180, boxes: 3 }]
const meta = { data_label: 'FICTITIOUS DEMONSTRATION', grain: 'Sales line' }
const registry = dashboardRegistry('/', 'cr_sales', rows, meta, config)
const plan = localDashboardPlan('sales by category and monthly trend', registry.manifest)
check(() => assert.equal(dashboardValue(rows, SALES_MEASURES[2]).value, 19))
check(() => assert.equal(dashboardValue([], SALES_MEASURES[0]).value, null))
check(() => assert.equal(dashboardValue([{ net_sales: 0, gross_margin: 20 }], SALES_MEASURES[2]).value, null))
check(() => assert.equal(dashboardValue([{ net_sales: 100, gross_margin: null }], SALES_MEASURES[2]).value, null))
check(() => assert.equal(dashboardValue([{ net_sales: 100, cogs: null }], cfoMeasure('margin_pct')).value, null))
check(() => assert.equal(dashboardValue([{ net_sales: 100, cogs: 70 }], cfoMeasure('margin_pct')).value, 30))
check(() => assert.equal(dashboardValue(rows.map((r, i) => ({ ...r, currency: i ? 'EUR' : 'RON' })), SALES_MEASURES[0]).value, null))
check(() => assert.equal(dashboardValue(rows.map((r, i) => ({ ...r, currency: i ? 'EUR' : 'RON' })), SALES_MEASURES[2]).value, null))
check(() => assert.equal(dashboardValue(rows.map(r => ({ ...r, currency: 'RON' })), { ...SALES_MEASURES[0], unit: 'EUR' }).value, null))
check(() => assert.equal(dashboardValue(rows.map((r, i) => ({ ...r, snapshot_date: `2026-0${i + 1}-28` })), SALES_MEASURES[0]).value, null))
check(() => assert.equal(dashboardValue(rows.map((r, i) => ({ ...r, Stock: i ? 'Allocated' : 'On hand' })), SALES_MEASURES[0]).value, null))
check(() => assert.equal(dashboardValue(filterDashboardRows(rows, { category: 'A' }), SALES_MEASURES[0]).value, 100))
check(() => assert.equal(dashboardValue(filterDashboardRows(rows, { category: 'Missing' }), SALES_MEASURES[0]).value, null))
check(() => assert.equal(dashboardSeries(rows, 'category', SALES_MEASURES[0], false).points[0].value, 900))
check(() => assert.equal(dashboardSeries(rows, 'month', SALES_MEASURES[0], true).points[0].label, '2026-01'))
check(() => assert.equal(validDashboardManifest(registry.manifest), true))
check(() => assert.equal(validateDashboardPlan(plan, registry.manifest).version, 1))
check(() => assert.throws(() => validateDashboardPlan({ ...plan, value: 1e9 }, registry.manifest)))
check(() => assert.throws(() => validateDashboardPlan({ ...plan, cards: [{ measure: 'invented', colour: 'blue' }] }, registry.manifest)))
check(() => assert.throws(() => validateDashboardPlan({ ...plan, cards: [{ measure: plan.cards[0].measure, colour: 'url(secret)' }] }, registry.manifest)))
check(() => assert.throws(() => validateDashboardPlan({ ...plan, charts: [{ measure: plan.cards[0].measure, colour: 'blue', type: 'line', dimension: 'category' }] }, registry.manifest)))
check(() => assert.throws(() => validateDashboardPlan({ ...plan, charts: [{ measure: plan.cards[0].measure, colour: 'blue', type: 'bar', dimension: 'category', sql: 'DROP TABLE' }] }, registry.manifest)))
check(() => assert.throws(() => validateDashboardPlan({ ...plan, cards: Array(5).fill(plan.cards[0]) }, registry.manifest)))
check(() => assert.equal(validDashboardManifest({ ...registry.manifest, rows }), false))
check(() => assert.equal(validDashboardManifest({ ...registry.manifest, measures: [...registry.manifest.measures, registry.manifest.measures[0]] }), false))
check(() => assert.equal(dashboardRegistry('/', 'ref_example', rows, meta, config).measures.some(m => m.id.startsWith('report-')), false))
check(() => assert.equal(dashboardRegistry('/current-reference', 'cr_sales', rows, meta, { ...config, measure: cfoMeasure('margin_pct') }).measures.filter(m => m.id.startsWith('cfo-')).every(m => typeof m.evaluate === 'function'), true))
const store = createWorkflowDemo()
for (const [route, room] of Object.entries(CONTROL_ROOMS)) {
  const source = store[room.dataset]
  if (!source) continue
  const reg = dashboardRegistry(route, room.dataset, source.data, source._meta, { ...config, defaultDataset: room.dataset, measure: room.measures[0], dimension: room.dimensions[0] })
  check(() => assert.equal(validateDashboardPlan(localDashboardPlan('main KPIs and trend', reg.manifest), reg.manifest).cards.length > 0, true))
}
const base = { route: '/', question: 'Show sales by category', classification: 'demonstration', provider: 'cloudflare', manifest: registry.manifest }
const request = (body: unknown, origin = 'https://test.example') => new Request('https://test.example/ControlRoom/api/analyst/dashboard', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
let calls = 0
const env = { ANALYST_LIMIT: { limit: async () => ({ success: true }) }, AI: { run: async (_: string, input: { messages: { content: string }[] }) => { calls++; assert.ok(!input.messages[1].content.includes('net_sales":100')); return { response: JSON.stringify(plan) } } } }
// Mock provider only: no credentials or external data transfer in this suite.
const invoke = (body: unknown, origin?: string) => analystApi(request(body, origin), env as unknown as Parameters<typeof analystApi>[1])
check(() => assert.equal(calls, 0))
assert.equal((await invoke(base, 'https://hostile.example')).status, 403); checks++
assert.equal((await invoke({ ...base, rows })).status, 400); checks++
assert.equal((await invoke({ ...base, question: 'Email secret@example.com' })).status, 400); checks++
assert.equal((await invoke({ ...base, manifest: { ...registry.manifest, measures: [] } })).status, 400); checks++
assert.equal(calls, 0); checks++
const result = await invoke(base)
assert.equal(result.status, 200); checks++
assert.equal((await result.json() as { plan: { version: number } }).plan.version, 1); checks++
assert.equal(calls, 1); checks++
const jsonEnv = { ...env, AI: { run: async () => ({ response: plan }) } }
assert.equal((await analystApi(request(base), jsonEnv as unknown as Parameters<typeof analystApi>[1])).status, 200); checks++
const invalidEnv = { ...env, AI: { run: async () => ({ response: JSON.stringify({ ...plan, cards: [{ measure: 'unknown', colour: 'blue' }] }) }) } }
assert.equal((await analystApi(request(base), invalidEnv as unknown as Parameters<typeof analystApi>[1])).status, 502); checks++
const workerEnv = { ...env, ASSETS: { fetch: async (req: Request) => new Response(new URL(req.url).pathname) } } as unknown as Parameters<typeof worker.fetch>[1]
assert.equal((await worker.fetch(new Request('https://test.example/api/analyst/status'), workerEnv)).status, 200); checks++
assert.equal(await (await worker.fetch(new Request('https://test.example/assets/test.js'), workerEnv)).text(), '/assets/test.js'); checks++
console.log(`${checks} dashboard calculation, schema, route and API boundary checks passed.`)
