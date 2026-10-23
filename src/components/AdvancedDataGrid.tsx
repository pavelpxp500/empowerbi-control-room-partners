import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { columnWindow, fitColumnCount } from '@/lib/grid-layout'
import useSurfaceWidth from './useSurfaceWidth'

export type GridDensity = 'compact' | 'comfortable'
export type SortDirection = 'asc' | 'desc'
export type FacetValue = string | number | boolean | null | undefined

export type AdvancedDataGridColumn<T> = {
  id: string
  header: string
  value: (row: T) => unknown
  render?: (row: T) => ReactNode
  sortValue?: (row: T) => unknown
  searchValue?: (row: T) => unknown
  csvValue?: (row: T) => unknown
  sortable?: boolean
  searchable?: boolean
  hideable?: boolean
  defaultHidden?: boolean
  align?: 'left' | 'center' | 'right'
  width?: number | string
  minWidth?: number | string
  className?: string
  headerClassName?: string
}

export type AdvancedDataGridFacetOption = {
  value: FacetValue
  label: string
}

export type AdvancedDataGridFacet<T> = {
  id: string
  label: string
  value: (row: T) => FacetValue
  options?: readonly AdvancedDataGridFacetOption[]
  formatValue?: (value: FacetValue) => string
  allLabel?: string
}

export type AdvancedDataGridSort = {
  columnId: string
  direction: SortDirection
}

export type AdvancedDataGridProjection<T> = Readonly<{
  rows: readonly T[]
  columns: readonly AdvancedDataGridColumn<T>[]
  query: string
  sort: AdvancedDataGridSort | null
  facets: Readonly<Record<string, string>>
}>

export type AdvancedDataGridProps<T> = {
  rows: readonly T[]
  columns: readonly AdvancedDataGridColumn<T>[]
  getRowId: (row: T, index: number) => string | number
  caption: string
  facets?: readonly AdvancedDataGridFacet<T>[]
  renderDetail?: (row: T) => ReactNode
  initialSort?: AdvancedDataGridSort | null
  initialPageSize?: number
  pageSizeOptions?: readonly number[]
  initialDensity?: GridDensity
  searchPlaceholder?: string
  emptyMessage?: string
  csvFileName?: string
  maxHeight?: number | string
  className?: string
  onProjectionChange?: (projection: AdvancedDataGridProjection<T>) => void
}

type IndexedRow<T> = {
  row: T
  index: number
  id: string
  key: string
}

type FacetChoice = {
  key: string
  label: string
  count: number
}

const ENGLISH_COLLATOR = new Intl.Collator('en-GB', {
  numeric: true,
  sensitivity: 'base',
})

const controlClass =
  'grid-control'

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-GB')
    .trim()
}

function valueToText(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) return value.map((entry) => valueToText(entry, seen)).join(' ')
  if (typeof value === 'object') {
    if (seen.has(value)) return ''
    seen.add(value)
    return Object.values(value).map((entry) => valueToText(entry, seen)).join(' ')
  }
  return typeof value === 'number' ? value.toLocaleString('en-GB', { maximumFractionDigits: 4 }) : String(value)
}

function isNullish(value: unknown): boolean {
  return value === null
    || value === undefined
    || (typeof value === 'number' && Number.isNaN(value))
    || (value instanceof Date && Number.isNaN(value.getTime()))
}

function compareNonNull(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return ENGLISH_COLLATOR.compare(valueToText(a), valueToText(b))
}

function facetKey(value: FacetValue): string {
  if (value === undefined) return 'u:'
  if (value === null) return 'z:'
  if (typeof value === 'boolean') return `b:${value ? '1' : '0'}`
  if (typeof value === 'number') return `n:${String(value)}`
  return `s:${value}`
}

function defaultFacetLabel(value: FacetValue): string {
  if (value === null || value === undefined || value === '') return 'No value'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function buildDefaultVisibility<T>(columns: readonly AdvancedDataGridColumn<T>[]): Record<string, boolean> {
  const visibility: Record<string, boolean> = {}
  for (const column of columns) {
    visibility[column.id] = column.hideable === false || !column.defaultHidden
  }
  if (columns.length > 0 && !Object.values(visibility).some(Boolean)) {
    visibility[columns[0].id] = true
  }
  return visibility
}

function validPageSize(value: number): number {
  return Number.isInteger(value) && value > 0 && value <= 1000 ? value : 25
}

function normalizePageSizes(initialPageSize: number, options: readonly number[]): number[] {
  const values = new Set(
    [initialPageSize, ...options]
      .filter((value) => Number.isInteger(value) && value > 0 && value <= 1000),
  )
  return [...values].sort((a, b) => a - b)
}

function displayValue(value: unknown): ReactNode {
  if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
    return <span className="text-ink3">—</span>
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? <span className="text-ink3">—</span>
      : value.toLocaleDateString('en-GB')
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return valueToText(value)
  return typeof value === 'number' ? value.toLocaleString('en-GB', { maximumFractionDigits: 4 }) : String(value)
}

function csvText(value: unknown): string {
  let raw: string
  if (value === null || value === undefined) raw = ''
  else if (value instanceof Date) raw = Number.isNaN(value.getTime()) ? '' : value.toISOString()
  else if (typeof value === 'object') {
    try {
      raw = JSON.stringify(value)
    } catch {
      raw = valueToText(value)
    }
  } else raw = String(value)

  const protectedValue = typeof value === 'string' && /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${protectedValue.replace(/"/g, '""')}"`
}

function alignmentClass(align: AdvancedDataGridColumn<unknown>['align']): string {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

export default function AdvancedDataGrid<T>({
  rows,
  columns,
  getRowId,
  caption,
  facets,
  renderDetail,
  initialSort = null,
  initialPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  initialDensity = 'comfortable',
  searchPlaceholder = 'Search all columns…',
  emptyMessage = 'No rows match the current selection.',
  csvFileName = 'export.csv',
  maxHeight = 580,
  className = '',
  onProjectionChange,
}: AdvancedDataGridProps<T>) {
  const reactId = useId()
  const domId = `advanced-grid-${reactId.replace(/:/g, '')}`
  const [query, setQuery] = useState('')
  const [columnQuery,setColumnQuery]=useState('')
  const [selectedFacets, setSelectedFacets] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<AdvancedDataGridSort | null>(initialSort)
  const [visibility, setVisibility] = useState<Record<string, boolean>>(
    () => buildDefaultVisibility(columns),
  )
  const [density, setDensity] = useState<GridDensity>(initialDensity)
  const [pageSize, setPageSize] = useState(() => validPageSize(initialPageSize))
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [columnOrder, setColumnOrder] = useState(() => columns.map(c => c.id))
  const [columnPage, setColumnPage] = useState(0)
  const surface = useSurfaceWidth()
  const orderedColumns = useMemo(() => [...columns].sort((a, b) => {
    const ai = columnOrder.indexOf(a.id), bi = columnOrder.indexOf(b.id)
    return (ai < 0 ? columns.length : ai) - (bi < 0 ? columns.length : bi)
  }), [columns, columnOrder])
  const moveColumn = (id: string, step: number) => {
    const order = orderedColumns.map(c => c.id), from = order.indexOf(id), to = from + step
    if (from < 0 || to < 0 || to >= order.length) return
    ;[order[from], order[to]] = [order[to], order[from]]
    setColumnOrder(order)
  }

  const indexedRows = useMemo<IndexedRow<T>[]>(
    () => rows.map((row, index) => {
      const id = String(getRowId(row, index))
      return { row, index, id, key: `${id}::${index}` }
    }),
    [getRowId, rows],
  )

  const searchableColumns = useMemo(
    () => columns.filter((column) => column.searchable !== false),
    [columns],
  )
  const normalizedQuery = useMemo(() => normalizeText(query), [query])

  const matchesSearch = (item: IndexedRow<T>): boolean => {
    if (!normalizedQuery) return true
    const haystack = searchableColumns
      .map((column) => valueToText(
        column.searchValue ? column.searchValue(item.row) : column.value(item.row),
      ))
      .join(' ')
    return normalizeText(haystack).includes(normalizedQuery)
  }

  const filteredRows = useMemo(() => {
    const configuredFacets = facets ?? []
    return indexedRows.filter((item) => {
      if (!matchesSearch(item)) return false
      return configuredFacets.every((facet) => {
        const selected = selectedFacets[facet.id]
        return !selected || facetKey(facet.value(item.row)) === selected
      })
    })
  }, [facets, indexedRows, normalizedQuery, searchableColumns, selectedFacets])

  const facetChoices = useMemo<Record<string, FacetChoice[]>>(() => {
    const configuredFacets = facets ?? []
    const choices: Record<string, FacetChoice[]> = {}

    for (const facet of configuredFacets) {
      const sourceValues = new Map<string, FacetValue>()
      if (facet.options) {
        for (const option of facet.options) sourceValues.set(facetKey(option.value), option.value)
      } else {
        for (const item of indexedRows) {
          const value = facet.value(item.row)
          sourceValues.set(facetKey(value), value)
        }
      }

      const counts = new Map<string, number>()
      for (const item of indexedRows) {
        if (!matchesSearch(item)) continue
        const matchesOtherFacets = configuredFacets.every((otherFacet) => {
          if (otherFacet.id === facet.id) return true
          const selected = selectedFacets[otherFacet.id]
          return !selected || facetKey(otherFacet.value(item.row)) === selected
        })
        if (!matchesOtherFacets) continue
        const key = facetKey(facet.value(item.row))
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      const explicitLabels = new Map(
        (facet.options ?? []).map((option) => [facetKey(option.value), option.label]),
      )
      choices[facet.id] = [...sourceValues.entries()]
        .map(([key, value]) => ({
          key,
          label: explicitLabels.get(key) ?? facet.formatValue?.(value) ?? defaultFacetLabel(value),
          count: counts.get(key) ?? 0,
        }))
        .sort((a, b) => ENGLISH_COLLATOR.compare(a.label, b.label))
    }

    return choices
  }, [facets, indexedRows, normalizedQuery, searchableColumns, selectedFacets])

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows
    const column = columns.find((candidate) => candidate.id === sort.columnId)
    if (!column || column.sortable === false) return filteredRows
    return [...filteredRows].sort((a, b) => {
      const aValue = column.sortValue ? column.sortValue(a.row) : column.value(a.row)
      const bValue = column.sortValue ? column.sortValue(b.row) : column.value(b.row)
      const aIsNull = isNullish(aValue)
      const bIsNull = isNullish(bValue)
      if (aIsNull || bIsNull) {
        if (aIsNull && bIsNull) return a.index - b.index
        return aIsNull ? 1 : -1
      }
      const compared = compareNonNull(aValue, bValue)
      if (compared === 0) return a.index - b.index
      return sort.direction === 'asc' ? compared : -compared
    })
  }, [columns, filteredRows, sort])

  const visibleColumns = useMemo(() => {
    const selected = orderedColumns.filter(
      (column) => visibility[column.id] ?? (column.hideable === false || !column.defaultHidden),
    )
    return selected.length > 0 ? selected : columns.slice(0, 1)
  }, [columns, orderedColumns, visibility])

  // Window only the rendered table. The selected projection remains complete.
  const fieldWindow = columnWindow(visibleColumns, fitColumnCount(surface.width, surface.fontSize), columnPage)
  const screenColumns = fieldWindow.columns
  useEffect(() => setColumnPage(0), [columns, columnOrder, visibility])
  useEffect(() => setColumnPage(current => Math.max(0,Math.min(current,fieldWindow.count - 1))), [fieldWindow.count])
  useEffect(() => setExpanded(new Set()), [rows])

  useEffect(() => {
    onProjectionChange?.({
      rows: sortedRows.map((item) => item.row),
      columns: visibleColumns,
      query,
      sort,
      facets: selectedFacets,
    })
  }, [onProjectionChange, query, selectedFacets, sort, sortedRows, visibleColumns])
  const hideableColumns = useMemo(
    () => orderedColumns.filter((column) => column.hideable !== false),
    [orderedColumns],
  )
  const normalizedPageSizeOptions = useMemo(
    () => normalizePageSizes(pageSize, pageSizeOptions),
    [pageSize, pageSizeOptions],
  )

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageStart = safePage * pageSize
  const pagedRows = sortedRows.slice(pageStart, pageStart + pageSize)
  const firstResult = sortedRows.length === 0 ? 0 : pageStart + 1
  const lastResult = Math.min(pageStart + pageSize, sortedRows.length)
  const firstVisibleColumnId = visibleColumns[0]?.id
  const expansionOffset = 44

  const resetGrid = () => {
    setQuery('')
    setSelectedFacets({})
    setSort(initialSort)
    setVisibility(buildDefaultVisibility(columns))
    setDensity(initialDensity)
    setPageSize(validPageSize(initialPageSize))
    setPage(0)
    setExpanded(new Set())
    setColumnOrder(columns.map(c => c.id))
    setColumnQuery('')
    setColumnPage(0)
  }

  const toggleSort = (column: AdvancedDataGridColumn<T>) => {
    if (column.sortable === false) return
    setSort((current) => {
      if (!current || current.columnId !== column.id) {
        return { columnId: column.id, direction: 'asc' }
      }
      if (current.direction === 'asc') return { columnId: column.id, direction: 'desc' }
      return null
    })
    setPage(0)
  }

  const toggleColumn = (columnId: string) => {
    setVisibility((current) => {
      const isVisible = current[columnId] ?? true
      const visibleCount = columns.filter(
        (column) => current[column.id] ?? (column.hideable === false || !column.defaultHidden),
      ).length
      if (isVisible && visibleCount <= 1) return current
      return { ...current, [columnId]: !isVisible }
    })
    setPage(0)
  }

  const toggleExpanded = (rowKey: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(rowKey)) next.delete(rowKey)
      else next.add(rowKey)
      return next
    })
  }

  const exportCsv = () => {
    const header = visibleColumns.map((column) => csvText(column.header)).join(',')
    const body = sortedRows.map((item) => visibleColumns
      .map((column) => csvText(
        column.csvValue ? column.csvValue(item.row) : column.value(item.row),
      ))
      .join(','))
    const blob = new Blob([`\uFEFF${[header, ...body].join('\r\n')}`], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = csvFileName.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'export.csv'
    link.href = url
    link.download = safeName.toLocaleLowerCase('en-GB').endsWith('.csv') ? safeName : `${safeName}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const tableStyle: CSSProperties = {
    maxHeight,
  }

  return (
    <section className={`responsive-data-grid min-w-0 ${className}`} aria-labelledby={`${domId}-title`}>
      <h3 id={`${domId}-title`} className="sr-only">{caption}</h3>

      <div className="grid-toolbar">
        <label className="grid-search-field min-w-[220px] flex-1">
          <span className="grid-field-label">Search rows</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
            }}
            placeholder={searchPlaceholder}
            className="grid-input placeholder:text-ink3"
          />
        </label>

        {(facets ?? []).map((facet) => (
          <label key={facet.id} className="min-w-[145px]">
            <span className="grid-field-label">
              {facet.label}
            </span>
            <select
              value={selectedFacets[facet.id] ?? ''}
              onChange={(event) => {
                setSelectedFacets((current) => ({ ...current, [facet.id]: event.target.value }))
                setPage(0)
              }}
              className="grid-control w-full"
            >
              <option value="">{facet.allLabel ?? 'All'}</option>
              {(facetChoices[facet.id] ?? []).map((choice) => (
                <option key={choice.key} value={choice.key}>
                  {choice.label} ({choice.count})
                </option>
              ))}
            </select>
          </label>
        ))}

        {hideableColumns.length > 0 && (
          <details className="grid-column-picker group">
            <summary className={`${controlClass} cursor-pointer list-none font-semibold`}>
              Columns · {visibleColumns.length}/{columns.length}
            </summary>
            <fieldset className="grid-column-options">
              <legend className="sr-only">Visible columns</legend>
              <input aria-label="Find a column" type="search" value={columnQuery} onChange={e=>setColumnQuery(e.target.value)} placeholder="Find a column…" className="grid-input"/>
              <button type="button" onClick={()=>setVisibility(Object.fromEntries(columns.map(c=>[c.id,true])))}>Show all {columns.length} columns</button>
              {hideableColumns.filter(c=>c.header.toLowerCase().includes(columnQuery.toLowerCase())).map((column) => {
                const checked = visibility[column.id]
                  ?? (column.hideable === false || !column.defaultHidden)
                return (
                  <div
                    key={column.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-surface2"
                  >
                    <label className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={checked && visibleColumns.length <= 1}
                      onChange={() => toggleColumn(column.id)}
                    />
                    <span>{column.header}</span>
                    </label>
                    <button type="button" onClick={() => moveColumn(column.id, -1)} disabled={orderedColumns[0]?.id === column.id} aria-label={`Move ${column.header} column left`}>←</button>
                    <button type="button" onClick={() => moveColumn(column.id, 1)} disabled={orderedColumns.at(-1)?.id === column.id} aria-label={`Move ${column.header} column right`}>→</button>
                  </div>
                )
              })}
            </fieldset>
          </details>
        )}

        <label>
          <span className="sr-only">Row density</span>
          <select
            value={density}
            onChange={(event) => setDensity(event.target.value as GridDensity)}
            className={controlClass}
            aria-label="Row density"
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>

        <button type="button" onClick={exportCsv} disabled={sortedRows.length === 0} className={controlClass}>
          Export CSV
        </button>
        <button type="button" onClick={resetGrid} className={controlClass}>
          Reset
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {sortedRows.length} {sortedRows.length === 1 ? 'result' : 'results'}, page {safePage + 1} of {pageCount}.
      </p>

      <div className="grid-column-navigation">
        <p><b>{visibleColumns.length} selected fields</b> · exports include all selected fields. Open a row for all {columns.length} fields.</p>
        {sort && <p>Sorted by <b>{columns.find(c=>c.id===sort.columnId)?.header}</b> · {sort.direction === 'asc' ? 'ascending' : 'descending'}</p>}
        {fieldWindow.count > 1 && <div className="grid-column-pages">
          <button type="button" className={controlClass} disabled={fieldWindow.page === 0} onClick={() => setColumnPage(fieldWindow.page - 1)} aria-label="Previous column group">‹</button>
          <label>Column group<select className={controlClass} aria-label="Column group" value={fieldWindow.page} onChange={e => setColumnPage(Number(e.target.value))}>{Array.from({length:fieldWindow.count},(_,i) => { const part = columnWindow(visibleColumns,fitColumnCount(surface.width,surface.fontSize),i); return <option key={i} value={i}>{i + 1} / {fieldWindow.count} · {part.columns[1]?.header} – {part.columns.at(-1)?.header}</option> })}</select></label>
          <button type="button" className={controlClass} disabled={fieldWindow.page === fieldWindow.count - 1} onClick={() => setColumnPage(fieldWindow.page + 1)} aria-label="Next column group">›</button>
          <span>First selected field stays in view</span>
        </div>}
      </div>

      <div
        ref={surface.ref}
        className="data-region advanced-grid-region grid-fit"
        style={tableStyle}
        role="region"
        aria-label={caption}
        tabIndex={0}
      >
        <table className="data-table">
          <colgroup><col style={{width:44}}/>{screenColumns.map(c=><col key={c.id}/>)}</colgroup>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {(
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-40 w-11 border-b border-line2 bg-surface2 px-1 py-2 text-center"
                >
                  <span className="sr-only">Row details</span>
                </th>
              )}
              {screenColumns.map((column) => {
                const isFirst = column.id === firstVisibleColumnId
                const isSorted = sort?.columnId === column.id
                const ariaSort = isSorted
                  ? (sort.direction === 'asc' ? 'ascending' : 'descending')
                  : 'none'
                const columnStyle: CSSProperties = {
                  ...(isFirst ? { left: expansionOffset } : {}),
                }
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={column.sortable === false ? undefined : ariaSort}
                    style={columnStyle}
                    className={`sticky top-0 border-b border-line2 bg-surface2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink3 ${alignmentClass(column.align)} ${isFirst ? 'z-30 shadow-[2px_0_0_var(--line)]' : 'z-20'} ${density === 'compact' ? 'px-2 py-1.5' : 'px-3 py-2.5'} ${column.headerClassName ?? ''}`}
                  >
                    {column.sortable === false ? (
                      column.header
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={`inline-flex min-h-8 w-full items-center gap-1 rounded-sm font-mono uppercase tracking-[0.08em] hover:text-ink ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start'}`}
                        aria-label={`Sort by ${column.header}${isSorted ? (sort.direction === 'asc' ? ', ascending' : ', descending') : ''}`}
                      >
                        <span>{column.header}</span>
                        <span aria-hidden="true" className="text-[8px]">
                          {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(1, screenColumns.length + 1)}
                  className="px-4 py-12 text-center text-ink3"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {pagedRows.map((item) => {
              const isExpanded = expanded.has(item.key)
              const detailId = `${domId}-detail-${item.index}`
              return (
                <Fragment key={item.key}>
                  <tr className="group hover:bg-surface2" data-row-id={item.id}>
                    {(
                      <td className={`sticky left-0 z-20 w-11 border-b border-line bg-surface text-center group-hover:bg-surface2 ${density === 'compact' ? 'px-1 py-1' : 'px-1 py-2'}`}>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line2 text-ink2 hover:bg-surface3"
                          aria-expanded={isExpanded}
                          aria-controls={detailId}
                          aria-label={isExpanded ? 'Close row details' : 'Open row details'}
                          onClick={() => toggleExpanded(item.key)}
                        >
                          <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                        </button>
                      </td>
                    )}
                    {screenColumns.map((column) => {
                      const isFirst = column.id === firstVisibleColumnId
                      const columnStyle: CSSProperties = {
                        ...(isFirst ? { left: expansionOffset } : {}),
                      }
                      return (
                        <td
                          key={column.id}
                          style={columnStyle}
                          className={`border-b border-line ${alignmentClass(column.align)} ${isFirst ? 'sticky z-10 bg-surface shadow-[2px_0_0_var(--line)] group-hover:bg-surface2' : ''} ${density === 'compact' ? 'px-2 py-1.5' : 'px-3 py-2.5'} ${column.className ?? ''}`}
                        >
                          {column.render ? column.render(item.row) : displayValue(column.value(item.row))}
                        </td>
                      )
                    })}
                  </tr>
                  {isExpanded && (
                    <tr id={detailId}>
                      <td
                        colSpan={screenColumns.length + 1}
                        className="border-b border-line bg-navySoft px-4 py-3 text-ink"
                      >
                        {renderDetail?.(item.row)}
                        <div className="grid-record-details"><h4>Complete record · {columns.length} fields</h4><dl>{orderedColumns.map(column=><div key={column.id}><dt>{column.header}</dt><dd>{column.render ? column.render(item.row) : displayValue(column.value(item.row))}</dd></div>)}</dl></div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink3">
        <div>
          <span className="font-semibold text-ink">{firstResult}–{lastResult}</span> of{' '}
          <span className="font-semibold text-ink">{sortedRows.length}</span>
          {sortedRows.length !== rows.length && <span> (of {rows.length} total)</span>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="mr-1 flex items-center gap-1.5">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(0)
              }}
              className="grid-control"
              aria-label="Rows per page"
            >
              {normalizedPageSizeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={controlClass}
            disabled={safePage === 0}
            onClick={() => setPage(0)}
            aria-label="First page"
          >
            «
          </button>
          <button
            type="button"
            className={controlClass}
            disabled={safePage === 0}
            onClick={() => setPage(Math.max(0, safePage - 1))}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="min-w-[78px] text-center text-ink2">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className={controlClass}
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
            aria-label="Next page"
          >
            ›
          </button>
          <button
            type="button"
            className={controlClass}
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(pageCount - 1)}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </footer>
    </section>
  )
}
