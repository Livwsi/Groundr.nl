'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function JoinPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') || ''

  const [email,     setEmail]     = useState('')
  const [fullName,  setFullName]  = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [checking,  setChecking]  = useState(true)
  const [error,     setError]     = useState('')
  const [tokenError, setTokenError] = useState('')

  // Validate token on mount and pre-fill email
  useEffect(() => {
    if (!token) {
      setTokenError('Geen uitnodigingslink gevonden.')
      setChecking(false)
      return
    }

    fetch(`${API_BASE}/api/auth/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.email) setEmail(data.email)
        else setTokenError(data.detail || 'Ongeldige uitnodigingslink.')
      })
      .catch(() => setTokenError('Kon de uitnodiging niet laden.'))
      .finally(() => setChecking(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== password2) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(API_BASE+'/api/auth/join', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password, full_name: fullName }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Er is een fout opgetreden.')
        return
      }

      // Store dossier token and redirect
      localStorage.setItem('dossier_token', data.access_token)
      localStorage.setItem('dossier_user_id', String(data.user_id))
      localStorage.setItem('dossier_email', data.email)
      router.push('/dossier/dashboard')

    } catch {
      setError('Verbindingsfout. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#061a11' }}>
        <p style={{ color: '#2fc586' }}>Uitnodiging laden...</p>
      </div>
    )
  }

  // ── Invalid token ──────────────────────────────────────────
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#061a11' }}>
        <div className="text-center p-8 border max-w-sm w-full"
          style={{ borderColor: 'rgba(47,197,134,0.2)', background: 'rgba(255,255,255,0.03)' }}>
          <div className="text-2xl mb-3">⚠️</div>
          <p className="font-bold mb-2" style={{ color: '#fff' }}>Ongeldige uitnodiging</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{tokenError}</p>
        </div>
      </div>
    )
  }

  // ── Join form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#061a11' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight" style={{ color: '#2fc586' }}>
            Groundr
          </span>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Maak uw account aan
          </p>
        </div>

        <div className="p-8 border"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(47,197,134,0.15)' }}>

          {/* Email (read-only, pre-filled from token) */}
          <div className="mb-4 p-3 text-sm"
            style={{ background: 'rgba(47,197,134,0.08)', border: '1px solid rgba(47,197,134,0.2)', color: '#2fc586' }}>
            Uitgenodigd als: <strong>{email}</strong>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Volledige naam
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jan de Vries"
                className="w-full px-3 py-2 text-sm outline-none"
                style={{
                  background:   'rgba(255,255,255,0.05)',
                  border:       '1px solid rgba(255,255,255,0.1)',
                  color:        '#fff',
                }}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimaal 8 tekens"
                required
                className="w-full px-3 py-2 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border:     '1px solid rgba(255,255,255,0.1)',
                  color:      '#fff',
                }}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Herhaal wachtwoord
              </label>
              <input
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                placeholder="Herhaal wachtwoord"
                required
                className="w-full px-3 py-2 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border:     '1px solid rgba(255,255,255,0.1)',
                  color:      '#fff',
                }}
              />
            </div>

            {error && (
              <p className="text-xs p-3"
                style={{ background: 'rgba(184,64,51,0.1)', border: '1px solid rgba(184,64,51,0.3)', color: '#e07070' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: '#0e3b28', color: '#2fc586' }}
            >
              {loading ? 'Account aanmaken...' : 'Account aanmaken →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}