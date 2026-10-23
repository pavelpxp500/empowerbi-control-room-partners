import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useDataErrors, useReady } from '@/lib/data'
import AnalystWorkbench from '@/components/AnalystWorkbench'
import type { AppAccount } from './AppIntro'
import ReportingTimeBar from '../ReportingTimeBar'
import ControlRoomPanel from '../ControlRoomPanel'
import { CONTROL_ROOMS } from '@/lib/control-room-model'
import { REPORT_PAGES, REPORT_GROUPS, REPORT_BY_PATH } from '@/lib/report-portfolio'
import { OFFLINE_EDITION } from '@/lib/runtime'

const THEME_STORAGE_KEY = 'selgros-theme-v2'

const LEGACY_NAV = [
  { grp: 'Control Room', items: [
    { to: '/', t: 'Executive Control Room' }, { to: '/sales', t: 'Sales drilldown' },
    { to: '/firefighting', t: 'Firefighting & POS' }, { to: '/audit', t: 'Audit & decisions' },
  ]},
  { grp: 'External benchmark', items: [
    { to: '/benchmark', t: 'Portfolio & coverage' },
    { to: '/catalog', t: 'Solution catalog' },
  ]},
  { grp: 'Business', items: [
    { to: '/assortment', t: 'Assortment' },
    { to: '/segments', t: 'Customer segments' },
    { to: '/network', t: 'Network & geography' },
    { to: '/margin', t: 'Margin & supply' },
    { to: '/revenue-quality', t: 'Revenue & margin risk' },
  ]},
  { grp: 'Catalog insights', items: [
    { to: '/pricing', t: 'Pricing & promotions' },
    { to: '/promotions', t: 'Promotion performance' },
    { to: '/availability', t: 'Availability' },
    { to: '/deposit-return', t: 'Deposit return' },
    { to: '/own-brands', t: 'Own brands' },
  ]},
  { grp: 'Solutions', items: [
    { to: '/assortment-gaps', t: 'Assortment gaps' },
    { to: '/transport', t: 'Transport & routes' },
    { to: '/replenishment', t: 'Replenishment policy' },
  ]},
  { grp: 'Operations', items: [
    { to: '/stock-age', t: 'Stock age' },
    { to: '/stock-analysis', t: 'Stock analysis' },
    { to: '/service-level', t: 'Service level' },
    { to: '/otif-inbound', t: 'OTIF inbound' }, { to: '/otif-outbound', t: 'OTIF outbound' },
    { to: '/purchase-control', t: 'Purchase order control' }, { to: '/item-logistics', t: 'Item logistics & pallets' },
    { to: '/order-delivery', t: 'Order & delivery' },
    { to: '/transport-cost', t: 'Transport cost' },
    { to: '/forecast', t: 'Forecast' },
    { to: '/customer', t: 'Customer' },
    { to: '/finance', t: 'Finance' },
  ]},
]

const NAV = [
  { grp: '', items: [{ to: '/presentation', t: 'Presentation' }] },
  ...REPORT_GROUPS.map(group => ({ grp: group.title, items: REPORT_PAGES.filter(p => p.group === group.title).map(p => ({ to: p.path, t: `${p.number}. ${p.title}` })) })),
  { grp: 'Portfolio', items: [{ to: '/benchmark', t: 'Portfolio & coverage' }, { to: '/catalog', t: 'Solution catalog' }] },
  { grp: 'Supporting diagnostics', items: LEGACY_NAV.flatMap(g => g.items).filter(p => !REPORT_BY_PATH[p.to] && !['/benchmark', '/catalog'].includes(p.to)) },
]

function readTheme(): 'light' | 'dark' {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function BrandMark() {
  return <span className="brand-mark bg-[#E20026]" aria-hidden="true">S</span>
}

function ThemeIcon({ theme }: { theme: 'light' | 'dark' }) {
  return theme === 'light' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.2A8.5 8.5 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z" /></svg>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  )
}

export default function AppLayout(
  { account, onSignOut }: { account: AppAccount; onSignOut: () => void },
) {
  const ready = useReady()
  const dataErrors = useDataErrors()
  const location = useLocation()
  const contentReady = ready || location.pathname === '/presentation'
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [contextExpanded, setContextExpanded] = useState(false)
  const [navigationSearch, setNavigationSearch] = useState('')
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const previousPath = useRef(location.pathname)
  const focusedInitialRoute = useRef(false)
  const closeMenuAndRestoreFocus = useCallback(() => {
    setMobileOpen(false)
    window.requestAnimationFrame(() => menuButtonRef.current?.focus())
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'light' ? '#f5f5f7' : '#090d13',
    )
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The selected theme still applies for this runtime when storage is blocked.
    }
  }, [theme])

  useEffect(() => {
    if (!contentReady || focusedInitialRoute.current) return undefined
    focusedInitialRoute.current = true
    const focusTimer = window.setTimeout(() => {
      document.querySelector<HTMLElement>('#content h1')?.focus({ preventScroll: true })
    }, 180)
    return () => window.clearTimeout(focusTimer)
  }, [contentReady])

  useEffect(() => {
    const pathChanged = previousPath.current !== location.pathname
    previousPath.current = location.pathname
    setMobileOpen(false)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const routeLabel = NAV.flatMap((group) => group.items)
      .find((item) => item.to === location.pathname)?.t ?? 'Executive'
    document.title = `${routeLabel} · Selgros Control Room`
    if (!pathChanged) return undefined
    const headingTimer = window.setTimeout(() => {
      document.querySelector<HTMLElement>('#content h1')?.focus({ preventScroll: true })
    }, 180)
    return () => window.clearTimeout(headingTimer)
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('menu-open', mobileOpen)
    let focusFrame: number | undefined
    if (mobileOpen) {
      focusFrame = window.requestAnimationFrame(() => {
        const sidebar = sidebarRef.current
        const target = sidebar?.querySelector<HTMLElement>('.nav-link.is-active')
          ?? sidebar?.querySelector<HTMLElement>('input[type="search"]')
          ?? sidebar?.querySelector<HTMLElement>('button')
        target?.focus()
      })
    }
    const manageDrawerFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileOpen) {
        closeMenuAndRestoreFocus()
        return
      }
      if (event.key !== 'Tab' || !mobileOpen || !sidebarRef.current) return
      const focusable = [...sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!sidebarRef.current.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', manageDrawerFocus)
    return () => {
      document.body.classList.remove('menu-open')
      window.removeEventListener('keydown', manageDrawerFocus)
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame)
    }
  }, [closeMenuAndRestoreFocus, mobileOpen])

  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light')
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const releaseDrawer = () => { if (desktop.matches) setMobileOpen(false) }
    desktop.addEventListener('change', releaseDrawer)
    return () => desktop.removeEventListener('change', releaseDrawer)
  }, [])
  const signOut = () => {
    setMobileOpen(false)
    onSignOut()
  }
  const searchQuery = navigationSearch.trim().toLocaleLowerCase('en-GB')
  const visibleGroups = NAV.map(group => ({ ...group, items: group.items.filter(item => item.t.toLocaleLowerCase('en-GB').includes(searchQuery)) })).filter(group => group.items.length)

  return (
    <>
      <div className="app-shell" aria-busy={!contentReady}>
        <a href="#content" className="skip-link">Skip to content</a>

        <header className="mobile-topbar" inert={mobileOpen}>
          <div className="brand-lockup brand-lockup--mobile">
            <BrandMark />
            <span><b>SELGROS</b><small>Control Room</small></span>
          </div>
          <div className="mobile-actions">
            <span className="mobile-account" title={account.email}
              aria-label={`Signed in as ${account.name}`}>{account.initials}</span>
            <button type="button" className="icon-control" onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              <ThemeIcon theme={theme} />
            </button>
            <button ref={menuButtonRef} type="button" className="icon-control"
              onClick={() => mobileOpen ? closeMenuAndRestoreFocus() : setMobileOpen(true)}
              aria-controls="app-navigation" aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
              <MenuIcon open={mobileOpen} />
            </button>
          </div>
        </header>

        <button type="button" className={`menu-scrim ${mobileOpen ? 'is-open' : ''}`}
          onClick={closeMenuAndRestoreFocus} aria-label="Close menu" tabIndex={-1} />

        <aside ref={sidebarRef} id="app-navigation" className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen ? true : undefined} aria-label={mobileOpen ? 'Report navigation' : undefined}>
          <button type="button" className="drawer-close sidebar-control" onClick={closeMenuAndRestoreFocus}>Close navigation</button>
          <div className="brand-panel">
            <div className="brand-lockup">
              <BrandMark />
              <span>
                <b className="brand-wordmark">SELGROS</b>
                <small>Control Room</small>
              </span>
            </div>
            <p className="brand-promise">End-to-end operational clarity.</p>
            <p className="brand-disclaimer">
              independent analysis, not an official Selgros Romania document
            </p>
          </div>

          <div className="sidebar-controls">
            <button type="button" className="sidebar-control" onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              <ThemeIcon theme={theme} />
              <span>{theme === 'light' ? 'Light theme' : 'Dark theme'}</span>
            </button>
          </div>

          <nav aria-label="Report sections" className="app-nav">
            <label className="report-nav-search">Find a report<input type="search" value={navigationSearch} onChange={e => setNavigationSearch(e.target.value)} placeholder="Name or report number…" /></label>
            {!visibleGroups.length && <div className="nav-search-empty"><p role="status">No reports found.</p><button type="button" className="sidebar-control" onClick={() => setNavigationSearch('')}>Clear search</button></div>}
            {visibleGroups.map((group) => (
              <div key={group.grp} className="nav-section">
                {group.grp && <div className="nav-group-label">{group.grp}</div>}
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'}
                    onClick={() => { setMobileOpen(false); if (item.to === location.pathname) window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#content h1')?.focus({ preventScroll: true })) }}
                    className={({ isActive }) => `nav-link ${item.to === '/presentation' ? 'nav-link--presentation' : ''} ${isActive ? 'is-active' : ''}`}>
                    <span className="nav-dot" />
                    <span>{item.t}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="account-panel">
            <span className="account-avatar" aria-hidden="true">{account.initials}</span>
            <span className="account-copy">
              <b>{account.name}</b>
              <small>{account.email}</small>
            </span>
            <button type="button" className="account-signout" onClick={signOut}>Sign out</button>
          </div>

          <div className="sidebar-meta">
            <b>Catalog snapshot</b>
            <span>28–29 Aug 2026 · 16,080 SKUs</span>
            <span>24 stores · seed 42</span>
          </div>
        </aside>

        <div className="app-stage" inert={mobileOpen}>
          <div className="context-bar">
            <span className="context-badge">{OFFLINE_EDITION ? 'OFFLINE DEMO' : 'DEMO'}</span>
            <span id="context-details" className={`context-copy ${contextExpanded ? 'is-expanded' : ''}`}>
              {!contextExpanded ? (OFFLINE_EDITION ? 'Local dashboards, exports and evidence analysis. External source links require internet.' : 'Demonstration workspace · not live operational data.') : <>Assortment, pricing, promotions and availability are real and extracted from www.selgros.ro.
              Sales, margin, customers and service indicators are synthetic — generated deterministically
              and calibrated to published annual figures. Operational events are generated to test the
              data contract and do not describe Selgros operations. Reviewed historical exports are available locally only and remain a separate reference layer.</>}
            </span>
            <button type="button" className="context-toggle" aria-controls="context-details"
              aria-expanded={contextExpanded} onClick={() => setContextExpanded((expanded) => !expanded)}>
              {contextExpanded ? 'Less' : 'Details'}
            </button>
          </div>

          <main id="content" className="app-main">
            {dataErrors.length ? (
              <div role="alert" className="app-alert app-alert--error">
                <b>Incomplete load:</b> {dataErrors.join(' · ')}
              </div>
            ) : null}
            {contentReady ? (
              <div key={location.pathname} className="route-reveal"><Outlet /></div>
            ) : (
              <div className="app-loading" role="status" aria-live="polite">
                <span /> loading datasets…
              </div>
            )}
          </main>

          <footer className="app-footer">
            independent analysis, not an official Selgros Romania document
          </footer>
        </div>
      </div>
    </>
  )
}

export function PageHead(
  { title, dek, chips }: { title: string; dek: string; chips?: React.ReactNode },
) {
  const { pathname } = useLocation()
  const report = REPORT_BY_PATH[pathname]
  return (
    <div className="app-page-head">
      <div>
        <p className="page-eyebrow">Selgros Control Room</p>
        <h1 tabIndex={-1}>{report?.title ?? title}</h1>
        <p className="page-dek">{report?.focus ?? dek}</p>
      </div>
      <div className="page-chips">
        {chips}
        <button type="button" className="page-grid-link" onClick={() => window.dispatchEvent(new Event('controlroom:open-assistant'))} aria-controls="page-ai-assistant">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2.5h12v8H7l-3.5 3v-3H2zM5 6.5h6" /></svg>
          AI assistant
        </button>
        <a className="page-grid-link" href={['/current-reference','/revenue-quality'].includes(pathname) ? '#cfo-comparison-grid' : '#dynamic-report-grid'}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 2.5h11v11h-11zM2.5 6.2h11M2.5 9.8h11M6.2 2.5v11M9.8 2.5v11" />
          </svg>
          Dynamic grid
        </a>
      </div>
    </div>
  )
}

export function PageBody({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation()
  return <div className="app-page-body"><ReportingTimeBar />{CONTROL_ROOMS[pathname] ? <ControlRoomPanel>{children}</ControlRoomPanel> : <><p className="cr-pivot-note">These original exhibits retain their stated source periods. Reporting controls apply to the dynamic grid below; undated datasets retain their fixed scope.</p>{children}<AnalystWorkbench /></>}</div>
}
