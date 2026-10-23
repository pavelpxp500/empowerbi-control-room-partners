import type { Measure } from './reporting'

/** Captured reports must retain their meaning after the interactive view changes. */
export function describeGrid(groupBy: string, pivotBy: string, measure: Measure, sourceGrain: string) {
  const measureLabel = `${measure.label}${measure.unit ? ` (${measure.unit})` : ''}`
  return {
    measureLabel,
    grain: groupBy ? `One row per ${groupBy}${pivotBy ? `; columns by ${pivotBy}` : ''}. Source grain: ${sourceGrain}` : sourceGrain,
    definition: groupBy ? JSON.stringify({ groupBy, pivotBy: pivotBy || null, measure }) : 'Detail rows; no grouping',
  }
}

export function groupedColumnLabel(key: string, existingLabel: string, groupBy: string, pivotBy: string, measureLabel: string): string {
  if (!groupBy || key === groupBy) return existingLabel
  if (key === 'records') return 'Source records'
  if (key === 'value') return measureLabel
  if (key === 'total') return `Total · ${measureLabel}`
  return pivotBy ? `${existingLabel} · ${measureLabel}` : existingLabel
}
