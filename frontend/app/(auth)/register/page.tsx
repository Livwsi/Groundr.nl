'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  red: '#DC2626', redLt: '#FEF2F2',
  shadow: '0 1px 3px rgba(11,19,32,0.06)', shadowLg: '0 8px 32px rgba(11,19,32,0.10)',
}

const inp = {
  width: '100%', height: '42px', padding: '0 14px',
  background: S.surface, border: `1px solid ${S.border}`,
  fontFamily: 'inherit', fontSize: '14px', color: S.t1,
  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
}

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    if (password.length < 8) { setError('Wachtwoord moet minimaal 8 tekens zijn.'); setLoading(false); return }
    try {
      const res  = await fetch('http://localhost:8000/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, full_name: fullName }) })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Registratie mislukt.'); return }
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user_id', String(data.user_id))
      localStorage.setItem('email', data.email)
      const redirectTo = sessionStorage.getItem('after_login')
      sessionStorage.removeItem('after_login')
      router.push(redirectTo || '/dashboard')
    } catch { setError('Kan geen verbinding maken met de server.') }
    finally { setLoading(false) }
  }

  const focusStyle = (e: any) => { e.target.style.borderColor = S.green; e.target.style.boxShadow = `0 0 0 3px rgba(5,150,105,0.1)` }
  const blurStyle  = (e: any) => { e.target.style.borderColor = S.border; e.target.style.boxShadow = 'none' }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: "'DM Sans', sans-serif",
      backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(5,150,105,0.06) 0%, transparent 60%), linear-gradient(rgba(5,150,105,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,0.02) 1px, transparent 1px)',
      backgroundSize: '100% 100%, 48px 48px, 48px 48px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: S.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            </div>
            <span style={{ fontSize: '22px', fontWeight: 600, color: S.t1, letterSpacing: '-0.5px' }}>Groundr</span>
          </div>
          <p style={{ fontSize: '13px', color: S.t3 }}>Dutch Real Estate Intelligence</p>
        </div>

        <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadowLg, padding: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: S.t1, marginBottom: '4px' }}>Account aanmaken</h1>
          <p style={{ fontSize: '13px', color: S.t3, marginBottom: '24px' }}>Start gratis. Geen creditcard nodig.</p>

          {error && (
            <div style={{ background: S.redLt, border: `1px solid rgba(220,38,38,0.2)`, color: S.red, fontSize: '13.5px', padding: '10px 14px', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Volledige naam</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jan van Dijk" required style={inp} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>E-mailadres</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jan@stadsmakelaars.nl" required style={inp} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Wachtwoord</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimaal 8 tekens" required style={inp} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            {/* Plan info */}
            <div style={{ background: S.surface2, border: `1px solid ${S.border}`, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle size={15} color={S.green} style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '12.5px', color: S.t2, lineHeight: 1.5 }}>
                U start met het <strong style={{ color: S.t1 }}>gratis plan</strong>. Upgrade op elk moment naar Pro (€299/mo).
              </p>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', height: '42px', background: loading ? '#6EE7B7' : S.green,
              color: 'white', border: `1px solid ${S.green}`, fontFamily: 'inherit',
              fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px', transition: 'background 0.15s',
            }}>
              {loading ? 'Account aanmaken...' : 'Account aanmaken →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: S.t3, marginTop: '20px' }}>
            Al een account?{' '}
            <Link href="/login" style={{ color: S.green, textDecoration: 'none', fontWeight: 500 }}>Inloggen</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11.5px', color: S.t3, marginTop: '16px' }}>
          Door te registreren gaat u akkoord met onze{' '}
          <a href="#" style={{ color: S.t2, textDecoration: 'none' }}>Gebruiksvoorwaarden</a> en{' '}
          <a href="#" style={{ color: S.t2, textDecoration: 'none' }}>Privacybeleid</a>.
        </p>
      </div>
    </div>
  )
}