import { FormEvent, useEffect, useRef, useState } from 'react'

export type AppAccount = Readonly<{
  email: string
  initials: string
  name: string
  role: string
}>

const AUTH_STORAGE_KEY = 'selgros-local-account-v1'

export const APP_ACCOUNTS: readonly AppAccount[] = [
  { email: 'admin@admin.com', initials: 'AD', name: 'Admin', role: 'Demo profile' },
]

function accountForEmail(value: string): AppAccount | null {
  const normalised = value.trim().toLowerCase()
  return APP_ACCOUNTS.find((account) => account.email === normalised) ?? null
}

export function readStoredAccount(): AppAccount | null {
  try {
    return accountForEmail(window.sessionStorage.getItem(AUTH_STORAGE_KEY) ?? '')
  } catch {
    return null
  }
}

export function clearStoredAccount(): void {
  try {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    Object.keys(window.sessionStorage).filter(key => key.startsWith('analyst-history:')).forEach(key => window.sessionStorage.removeItem(key))
  } catch {
    // The current runtime still signs out when storage is unavailable.
  }
}

function rememberAccount(account: AppAccount): void {
  try {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, account.email)
  } catch {
    // The session remains valid for this runtime when storage is unavailable.
  }
}

export default function AppIntro(
  { onAuthenticate }: { onAuthenticate: (account: AppAccount) => void },
) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [exiting, setExiting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const finishTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    document.body.classList.add('login-open')
    emailRef.current?.focus()
    return () => {
      document.body.classList.remove('login-open')
      if (finishTimer.current !== undefined) window.clearTimeout(finishTimer.current)
    }
  }, [])

  const chooseAccount = (account: AppAccount) => {
    setEmail(account.email)
    setError('')
    emailRef.current?.focus()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const account = accountForEmail(email)
    if (!account) {
      setError('This email does not have access to the workspace.')
      emailRef.current?.focus()
      return
    }

    rememberAccount(account)
    setError('')
    setExiting(true)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      onAuthenticate(account)
      return
    }
    finishTimer.current = window.setTimeout(() => onAuthenticate(account), 420)
  }

  return (
    <div className={`app-login ${exiting ? 'app-login--exit' : ''}`} role="dialog"
      aria-modal="true" aria-labelledby="login-title" aria-describedby="login-copy">
      <div className="app-login__glow" aria-hidden="true" />
      <div className="app-login__frame">
        <section className="app-login__story" aria-label="Selgros Control Room">
          <div className="app-login__brandline">
            <span className="app-login__mark" aria-hidden="true">S</span>
            <span><b>SELGROS</b><small>Control Room</small></span>
          </div>
          <div className="app-login__headline">
            <p className="app-login__eyebrow">Operational intelligence</p>
            <h1 id="login-title">Welcome back.</h1>
            <p id="login-copy">
              One clear workspace for decisions, exceptions and the data behind them.
            </p>
          </div>
          <p className="app-login__footnote">Clear decisions. Verifiable data.</p>
        </section>

        <section className="app-login__card" aria-label="Workspace sign in">
          <header>
            <p>Workspace preview</p>
            <h2>Choose a demo profile</h2>
            <span>No identity verification is performed in this public preview.</span>
          </header>

          <div className="app-login__accounts" aria-label="Authorised profiles">
            {APP_ACCOUNTS.map((account) => {
              const selected = email.trim().toLowerCase() === account.email
              return (
                <button key={account.email} type="button"
                  className={`app-login__account ${selected ? 'is-selected' : ''}`}
                  aria-pressed={selected} onClick={() => chooseAccount(account)}>
                  <span className="app-login__avatar" aria-hidden="true">{account.initials}</span>
                  <span className="app-login__identity">
                    <b>{account.name}</b>
                    <small>{account.email}</small>
                  </span>
                  <span className="app-login__role">{account.role}</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              )
            })}
          </div>

          <form onSubmit={submit} noValidate>
            <label htmlFor="login-email">Work email</label>
            <div className={`app-login__input-wrap ${error ? 'has-error' : ''}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
              <input ref={emailRef} id="login-email" name="email" type="email"
                value={email} onChange={(event) => { setEmail(event.target.value); setError('') }}
                autoComplete="email" autoCapitalize="none" spellCheck={false}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : 'login-note'}
                placeholder="name@company.com" />
            </div>
            <p id="login-error" className="app-login__error" role="alert" aria-live="polite">
              {error || '\u00a0'}
            </p>
            <button className="app-login__submit" type="submit" disabled={exiting}>
              <span>{exiting ? 'Opening workspace…' : 'Open preview'}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>

          <p id="login-note" className="app-login__note">
            Demo preview · no identity verification · remembered for this browser tab.
          </p>
        </section>
      </div>
    </div>
  )
}
