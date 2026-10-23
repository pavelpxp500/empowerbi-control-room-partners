/** Presentation only: never use this window for filtering, aggregation or exports. */
export function fitColumnCount(width: number, fontSize = 16): number {
  const available = Number.isFinite(width) ? Math.max(0,width) : 320
  const font = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16
  return Math.max(2, Math.min(9, Math.floor((available - 48) / (9.5 * font))))
}

export function columnWindow<T>(columns: readonly T[], capacity: number, requestedPage: number) {
  if (!columns.length) return { page:0,count:1,start:0,end:0,columns:[] as T[] }
  const size = Number.isFinite(capacity) ? Math.max(1, Math.floor(capacity) - 1) : 1
  const count = Math.max(1, Math.ceil((columns.length - 1) / size))
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(Math.floor(requestedPage), count - 1)) : 0
  const start = 1 + page * size
  return { page, count, start, end: Math.min(start + size, columns.length), columns: columns.length ? [columns[0], ...columns.slice(start, start + size)] : [] }
}
