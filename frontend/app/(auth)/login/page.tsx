/**
 * @file        app/(auth)/login/page.tsx
 * @description Polished login page for Groundr.
 *              Split screen: dark brand panel left, form right.
 *              No inline <style> tags, no auto-redirect effects.
 *              Uses window.location.href for navigation to avoid
 *              router race conditions with auth context.
 */

'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/lib/services/AuthService'
import {
  type Role,
  type TokenResponse,
  ROLE_DASHBOARD,
  ROLE_LABEL,
} from '@/lib/types/user'

const C = {
  green:    '#059669',
  greenDk:  '#047857',
  greenLt:  '#ECFDF5',
  greenRim: 'rgba(5,150,105,0.2)',
  ink:      '#0B1320',
  inkMid:   '#44546A',
  inkLt:    '#8A9BB0',
  bg:       '#F4F6F9',
  bg2:      '#F8FAFB',
  white:    '#FFFFFF',
  border:   '#E2E5EA',
  danger:   '#DC2626',
  dangerLt: '#FEF2F2',
  dangerRim:'rgba(220,38,38,0.2)',
}

const ROLE_ICONS: Record<Role, string> = {
  admin:     '⚙',
  agent:     '🏠',
  appraiser: '📋',
  notary:    '✍',
  buyer:     '🔍',
  seller:    '📢',
}

const ROLE_DESC: Record<Role, string> = {
  admin:     'Full platform access',
  agent:     'Listings, viewings & bids',
  appraiser: 'Taxatie reports & valuations',
  notary:    'Documents & signing',
  buyer:     'Your dossier & viewings',
  seller:    'Track your submission',
}

const TEST_ACCOUNTS = [
  { email: 'admin@groundr.nl',     pw: 'Adminsaas',     label: '3 roles',  desc: 'Admin + Agent + Appraiser' },
  { email: 'agent@groundr.nl',     pw: 'Agentsaas',     label: 'Agent',    desc: 'Makelaar dashboard' },
  { email: 'appraiser@groundr.nl', pw: 'Appraisersaas', label: 'Appraiser',desc: 'Taxatie module' },
  { email: 'buyer@groundr.nl',     pw: 'Buyersaas',     label: 'Buyer',    desc: 'Client portal' },
]

const FEATURES = [
  'Viewing scheduler',
  'Bid management',
  'Taxatie module',
  'Client portal',
  'Market intelligence',
]

function LoginForm() {
  const searchParams = useSearchParams()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [pendingRoles, setPendingRoles] = useState<Role[]>([])

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response: TokenResponse = await authService.login(email, password)

      if (response.roles.length === 0) {
        setError('Your account has no roles assigned. Contact your administrator.')
        setLoading(false)
        return
      }

      if (response.roles.length === 1) {
        const role = response.roles[0]
        authService.setActiveRole(role)
        const afterLogin = searchParams.get('after_login')
        window.location.href = afterLogin ?? ROLE_DASHBOARD[role]
        return
      }

      // Multiple roles — show selector
      setPendingRoles(response.roles)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
      setLoading(false)
    }
  }

  function handleRoleSelect(role: Role) {
    authService.setActiveRole(role)
    const afterLogin = searchParams.get('after_login')
    window.location.href = afterLogin ?? ROLE_DASHBOARD[role]
  }

  // ── Role selector full-screen view ────────────────────────────────────────

  if (pendingRoles.length > 0) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     C.bg,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px',
        fontFamily:     "'DM Sans', sans-serif",
      }}>
        <div style={{
          background:    C.white,
          padding:       '40px',
          borderRadius:  '12px',
          maxWidth:      '460px',
          width:         '100%',
          boxShadow:     '0 8px 32px rgba(11,19,32,0.12)',
          border:        `1px solid ${C.border}`,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ width: '28px', height: '28px', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Times New Roman', serif", fontSize: '18px', color: C.ink }}>Groundr</span>
          </div>

          <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: '28px', fontWeight: 400, color: C.ink, marginBottom: '8px', letterSpacing: '-0.3px' }}>
            Select your role
          </h2>
          <p style={{ fontSize: '13.5px', color: C.inkMid, marginBottom: '24px', lineHeight: 1.55 }}>
            Your account has multiple roles. Choose which one to use now.
            You can switch between them at any time from the dashboard.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingRoles.map(role => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '14px',
                  padding:        '14px 16px',
                  background:     C.white,
                  border:         `1px solid ${C.border}`,
                  borderRadius:   '8px',
                  cursor:         'pointer',
                  fontFamily:     "'DM Sans', sans-serif",
                  textAlign:      'left',
                  width:          '100%',
                  transition:     'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.green
                  e.currentTarget.style.background  = C.greenLt
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.border
                  e.currentTarget.style.background  = C.white
                }}
              >
                <div style={{
                  width:          '38px',
                  height:         '38px',
                  background:     C.greenLt,
                  border:         `1px solid ${C.greenRim}`,
                  borderRadius:   '6px',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       '17px',
                  flexShrink:     0,
                }}>
                  {ROLE_ICONS[role]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: C.ink, marginBottom: '2px' }}>
                    {ROLE_LABEL[role]}
                  </div>
                  <div style={{ fontSize: '12px', color: C.inkLt }}>
                    {ROLE_DESC[role]}
                  </div>
                </div>
                <span style={{ color: C.inkLt, fontSize: '17px', flexShrink: 0 }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Login form ────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight:           '100vh',
      display:             'grid',
      gridTemplateColumns: '1fr 1fr',
      fontFamily:          "'DM Sans', sans-serif",
    }}>

      {/* ── Brand panel ── */}
      <div style={{
        background:   C.ink,
        padding:      '48px',
        display:      'flex',
        flexDirection:'column',
        justifyContent:'space-between',
        position:     'relative',
        overflow:     'hidden',
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(5,150,105,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(5,150,105,0.08) 0%, transparent 40%)`,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <div style={{ width: '28px', height: '28px', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Times New Roman', serif", fontSize: '20px', color: C.white, letterSpacing: '-0.3px' }}>
            Groundr
          </span>
        </div>

        {/* Main copy */}
        <div style={{ position: 'relative' }}>
          <h1 style={{
            fontFamily:   "'Times New Roman', serif",
            fontSize:     'clamp(34px, 3.8vw, 48px)',
            fontWeight:   400,
            color:        C.white,
            lineHeight:   1.1,
            letterSpacing:'-1px',
            marginBottom: '18px',
          }}>
            The operating system for Dutch real estate professionals.
          </h1>
          <p style={{
            fontSize:   '15px',
            color:      'rgba(255,255,255,0.55)',
            lineHeight: 1.7,
            maxWidth:   '420px',
            marginBottom: '24px',
          }}>
            Automate your workflow, digitalise your dossiers, and deliver
            better outcomes for your clients — all from one platform.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {FEATURES.map(feature => (
              <span key={feature} style={{
                padding:      '4px 12px',
                background:   'rgba(255,255,255,0.06)',
                border:       '1px solid rgba(255,255,255,0.1)',
                borderRadius: '999px',
                fontSize:     '12px',
                color:        'rgba(255,255,255,0.6)',
              }}>
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Footer tagline */}
        <div style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Complements Funda — doesn't compete with it.
            Built on BAG, CBS, PDOK open data.
          </p>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px',
        background:     C.white,
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontFamily:    "'Times New Roman', serif",
              fontSize:      '32px',
              fontWeight:    400,
              color:         C.ink,
              letterSpacing: '-0.5px',
              marginBottom:  '8px',
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: '14px', color: C.inkMid }}>
              Welcome back. Enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: C.inkLt, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="agent@groundr.nl"
                autoComplete="email"
                required
                style={{
                  width:        '100%',
                  height:       '44px',
                  padding:      '0 12px',
                  background:   C.white,
                  border:       `1px solid ${error ? C.danger : C.border}`,
                  borderRadius: '6px',
                  fontSize:     '14px',
                  color:        C.ink,
                  fontFamily:   'inherit',
                  outline:      'none',
                  transition:   'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = C.green)}
                onBlur={e  => (e.target.style.borderColor = error ? C.danger : C.border)}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: C.inkLt, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Password
                </label>
                <a href="/forgot-password" style={{ fontSize: '12px', color: C.green, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{
                  width:        '100%',
                  height:       '44px',
                  padding:      '0 12px',
                  background:   C.white,
                  border:       `1px solid ${error ? C.danger : C.border}`,
                  borderRadius: '6px',
                  fontSize:     '14px',
                  color:        C.ink,
                  fontFamily:   'inherit',
                  outline:      'none',
                  transition:   'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = C.green)}
                onBlur={e  => (e.target.style.borderColor = error ? C.danger : C.border)}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding:      '11px 14px',
                background:   C.dangerLt,
                border:       `1px solid ${C.dangerRim}`,
                borderRadius: '6px',
                fontSize:     '13px',
                color:        C.danger,
                lineHeight:   1.5,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:        '100%',
                height:       '44px',
                background:   loading ? C.greenLt : C.green,
                border:       `1px solid ${loading ? C.greenRim : C.green}`,
                borderRadius: '6px',
                fontSize:     '14px',
                fontWeight:   500,
                color:        loading ? C.greenDk : C.white,
                fontFamily:   'inherit',
                cursor:       loading ? 'not-allowed' : 'pointer',
                marginTop:    '4px',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '28px 0 18px' }}>
            <div style={{ flex: 1, height: '1px', background: C.border }} />
            <span style={{ fontSize: '11px', color: C.inkLt, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Test accounts
            </span>
            <div style={{ flex: 1, height: '1px', background: C.border }} />
          </div>

          {/* Quick-fill test accounts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {TEST_ACCOUNTS.map(a => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(a.pw); setError('') }}
                style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  padding:        '9px 12px',
                  background:     C.bg2,
                  border:         `1px solid ${C.border}`,
                  borderRadius:   '6px',
                  cursor:         'pointer',
                  fontFamily:     'inherit',
                  textAlign:      'left',
                  transition:     'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.green
                  e.currentTarget.style.background  = C.greenLt
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.border
                  e.currentTarget.style.background  = C.bg2
                }}
              >
                <div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '11.5px', color: C.ink, marginBottom: '1px' }}>
                    {a.email}
                  </div>
                  <div style={{ fontSize: '10.5px', color: C.inkLt }}>
                    {a.desc}
                  </div>
                </div>
                <span style={{
                  fontSize:     '10px',
                  fontWeight:   500,
                  color:        C.greenDk,
                  background:   C.greenLt,
                  padding:      '2px 8px',
                  borderRadius: '999px',
                  border:       `1px solid ${C.greenRim}`,
                  flexShrink:   0,
                  marginLeft:   '10px',
                }}>
                  {a.label}
                </span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '12.5px', color: C.inkLt }}>
            New to Groundr?{' '}
            <a href="/register" style={{ color: C.green, textDecoration: 'none', fontWeight: 500 }}>
              Request a demo
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// useSearchParams() opts the subtree into client-side rendering, so it needs a
// Suspense boundary or `next build` fails when it prerenders /login.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
      <LoginForm />
    </Suspense>
  )
}
