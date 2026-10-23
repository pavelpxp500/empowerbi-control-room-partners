import { build } from 'rolldown'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const output = path.resolve('node_modules/.cache/controlroom-dashboard-tests.mjs')
await build({ input: 'checkpoints/dashboard-tests.ts', platform: 'node', output: { file: output, format: 'esm' } })
await import(pathToFileURL(output).href)
