import { lazy, Suspense, useCallback, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AppLayout from '@/components/layout/AppLayout'
import AppIntro, {
  clearStoredAccount,
  readStoredAccount,
  type AppAccount,
} from '@/components/layout/AppIntro'
import { DataProvider } from '@/lib/data'
import { ReportingProvider } from '@/lib/ReportingContext'
const PControlRoom = lazy(() => import('@/pages/PControlRoom'))
const PPresentation = lazy(() => import('@/pages/PPresentation'))

const P1Executive = lazy(() => import('@/pages/P1Executive'))
const P2Assortment = lazy(() => import('@/pages/P2Assortment'))
const P3Segments = lazy(() => import('@/pages/P3Segments'))
const P4Network = lazy(() => import('@/pages/P4Network'))
const P5MarginSupply = lazy(() => import('@/pages/P5MarginSupply'))
const P6Pricing = lazy(() => import('@/pages/P6Pricing'))
const P7Availability = lazy(() => import('@/pages/P7Availability'))
const P8Sgr = lazy(() => import('@/pages/P8Sgr'))
const P9OwnBrands = lazy(() => import('@/pages/P9OwnBrands'))
const P10Gaps = lazy(() => import('@/pages/P10Gaps'))
const P11Transport = lazy(() => import('@/pages/P11Transport'))
const P12Replenishment = lazy(() => import('@/pages/P12Replenishment'))
const P13StockAge = lazy(() => import('@/pages/P13StockAge'))
const P14ServiceLevel = lazy(() => import('@/pages/P14ServiceLevel'))
const P15OrderDelivery = lazy(() => import('@/pages/P15OrderDelivery'))
const P16TransportCost = lazy(() => import('@/pages/P16TransportCost'))
const P17Forecast = lazy(() => import('@/pages/P17Forecast'))
const P18Customer = lazy(() => import('@/pages/P18Customer'))
const P19Finance = lazy(() => import('@/pages/P19Finance'))
const PReportPortfolio = lazy(() => import('@/pages/PReportPortfolio'))

function AppWatermark() {
  return (
    <div className="app-watermark" role="note"
      aria-label="Watermark: Pavel Mihai Lucian — EMPOWERBI">
      <span>Pavel Mihai Lucian</span>
      <span className="app-watermark__separator" aria-hidden="true">—</span>
      <strong>EMPOWERBI</strong>
    </div>
  )
}

export default function App() {
  const [account, setAccount] = useState<AppAccount | null>(readStoredAccount)
  const signOut = useCallback(() => {
    clearStoredAccount()
    setAccount(null)
  }, [])

  if (!account) return <AppIntro onAuthenticate={setAccount} />

  return (
    <>
      <ReportingProvider><DataProvider>
        <Suspense fallback={<div className="p-10 text-ink3 font-mono text-[12px]" role="status">Loading page…</div>}>
          <Routes>
            <Route element={<AppLayout account={account} onSignOut={signOut} />}>
              <Route path="/presentation" element={<PPresentation />} />
              <Route path="/" element={<P1Executive />} />
              <Route path="/assortment" element={<P2Assortment />} />
              <Route path="/segments" element={<P3Segments />} />
              <Route path="/network" element={<P4Network />} />
              <Route path="/margin" element={<P5MarginSupply />} />
              <Route path="/pricing" element={<P6Pricing />} />
              <Route path="/availability" element={<P7Availability />} />
              <Route path="/deposit-return" element={<P8Sgr />} />
              <Route path="/own-brands" element={<P9OwnBrands />} />
              <Route path="/assortment-gaps" element={<P10Gaps />} />
              <Route path="/transport" element={<P11Transport />} />
              <Route path="/replenishment" element={<P12Replenishment />} />
              <Route path="/stock-age" element={<P13StockAge />} />
              <Route path="/service-level" element={<P14ServiceLevel />} />
              <Route path="/order-delivery" element={<P15OrderDelivery />} />
              <Route path="/transport-cost" element={<P16TransportCost />} />
              <Route path="/forecast" element={<P17Forecast />} />
              <Route path="/customer" element={<P18Customer />} />
              <Route path="/finance" element={<P19Finance />} />
              <Route path="/benchmark" element={<PReportPortfolio />} />
              <Route path="/catalog" element={<PReportPortfolio catalog />} />
              {['sales', 'stock-analysis', 'otif-inbound', 'otif-outbound', 'purchase-control', 'item-logistics', 'firefighting', 'revenue-quality', 'promotions', 'audit', 'customer-assortment-price', 'sales-boxes-month', 'current-reference', 'theoretical-gross-margin', 'pos-performance-products', 'palletisation-deviations', 'ai-copilot', 'shelf-life-nonmoving', 'shrink-stock-anomalies'].map(path => <Route key={path} path={`/${path}`} element={<PControlRoom />} />)}
              <Route path="/sortiment" element={<Navigate replace to="/assortment" />} />
              <Route path="/segmente" element={<Navigate replace to="/segments" />} />
              <Route path="/retea" element={<Navigate replace to="/network" />} />
              <Route path="/marja" element={<Navigate replace to="/margin" />} />
              <Route path="/pret" element={<Navigate replace to="/pricing" />} />
              <Route path="/disponibilitate" element={<Navigate replace to="/availability" />} />
              <Route path="/sgr" element={<Navigate replace to="/deposit-return" />} />
              <Route path="/marci" element={<Navigate replace to="/own-brands" />} />
              <Route path="/goluri" element={<Navigate replace to="/assortment-gaps" />} />
              <Route path="/comanda" element={<Navigate replace to="/replenishment" />} />
              <Route path="/vechime-stoc" element={<Navigate replace to="/stock-age" />} />
              <Route path="/nivel-serviciu" element={<Navigate replace to="/service-level" />} />
              <Route path="/comanda-livrare" element={<Navigate replace to="/order-delivery" />} />
              <Route path="/cost-transport" element={<Navigate replace to="/transport-cost" />} />
              <Route path="/prognoza" element={<Navigate replace to="/forecast" />} />
              <Route path="/client" element={<Navigate replace to="/customer" />} />
              <Route path="/finante" element={<Navigate replace to="/finance" />} />
              <Route path="*" element={<Navigate replace to="/" />} />
            </Route>
          </Routes>
        </Suspense>
      </DataProvider></ReportingProvider>
      <AppWatermark />
    </>
  )
}
