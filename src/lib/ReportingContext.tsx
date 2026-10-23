import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_REPORT_CONTEXT, dayCount, filterPeriod, lastSnapshot, rowInterval, type ReportContext } from './reporting'
import { useDatasetStore, type DatasetStore } from './data'

const Context = createContext({ context: DEFAULT_REPORT_CONTEXT, setContext: (_: ReportContext) => {} })
export function ReportingProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState(DEFAULT_REPORT_CONTEXT)
  return <Context.Provider value={{ context, setContext }}>{children}</Context.Provider>
}
export const useReporting = () => useContext(Context)
export function useReportStore(): DatasetStore {
  const raw = useDatasetStore(), { context } = useReporting()
  return useMemo(() => Object.fromEntries(Object.entries(raw).map(([name, d]) => [name, {
    _meta: { ...d._meta, report_context: JSON.stringify(context) },
    data: d._meta.time_kind === 'snapshot' ? dayCount(context.start, context.end) ? lastSnapshot(d.data, context.end) : [] : name.startsWith('ref_') && !d.data.some(rowInterval) ? d.data : filterPeriod(d.data, context.start, context.end),
  }])), [context, raw])
}
