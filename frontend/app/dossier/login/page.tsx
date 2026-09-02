'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Shield } from 'lucide-react'

export default function DossierLoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(API_BASE+'/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Inloggen mislukt.')
        return
      }

      // Store token with dossier prefix to distinguish from makelaar
      localStorage.setItem('dossier_token',   data.access_token)
      localStorage.setItem('dossier_user_id', String(data.user_id))
      localStorage.setItem('dossier_email',   data.email)

      router.push('/dossier/dashboard')

    } catch {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#f0faf5' }}
    >
      {/* Subtle dot grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(14,59,40,0.08) 1px, transparent 1px)',
          backgroundSize:  '24px 24px',
        }}
      />

      <div className="relative w-full max-w-md">

        {/* Logo + agency name */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 mb-4"
            style={{ background: '#0e3b28', borderRadius: '4px' }}
          >
            <Home size={24} color="#2fc586" />
          </div>
          <div
            className="font-display text-2xl font-bold tracking-tight mb-1"
            style={{ color: '#0e3b28' }}
          >
            Mijn Dossier
          </div>
          <p className="text-sm" style={{ color: 'rgba(14,59,40,0.5)' }}>
            Uw persoonlijk transactieportaal
          </p>
        </div>

        {/* Card */}
        <div
          className="p-8"
          style={{
            background:   'white',
            border:       '1px solid rgba(14,59,40,0.1)',
            boxShadow:    '0 4px 24px rgba(14,59,40,0.08)',
          }}
        >
          <h1
            className="font-display text-xl font-bold mb-1"
            style={{ color: '#0e3b28' }}
          >
            Inloggen
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(14,59,40,0.45)' }}>
            Gebruik de gegevens die uw makelaar heeft aangemaakt.
          </p>

          {error && (
            <div
              className="text-sm px-4 py-3 mb-4"
              style={{ background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: 'rgba(14,59,40,0.5)' }}
              >
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="uw@email.nl"
                required
                className="w-full px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background:  '#f7faf8',
                  border:      '1px solid rgba(14,59,40,0.15)',
                  color:       '#0e3b28',
                }}
                onFocus={e => e.target.style.borderColor = '#2fc586'}
                onBlur={e  => e.target.style.borderColor = 'rgba(14,59,40,0.15)'}
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: 'rgba(14,59,40,0.5)' }}
              >
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background:  '#f7faf8',
                  border:      '1px solid rgba(14,59,40,0.15)',
                  color:       '#0e3b28',
                }}
                onFocus={e => e.target.style.borderColor = '#2fc586'}
                onBlur={e  => e.target.style.borderColor = 'rgba(14,59,40,0.15)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold mt-2 transition-opacity disabled:opacity-50"
              style={{ background: '#0e3b28', color: '#2fc586' }}
            >
              {loading ? 'Bezig...' : 'Inloggen →'}
            </button>
          </form>

          {/* Security note */}
          <div
            className="flex items-center gap-2 mt-6 pt-5 text-xs"
            style={{ borderTop: '1px solid rgba(14,59,40,0.08)', color: 'rgba(14,59,40,0.35)' }}
          >
            <Shield size={12} />
            Beveiligde verbinding · Uw gegevens zijn beschermd
          </div>
        </div>

        {/* Powered by */}
        <div className="text-center mt-6 text-xs" style={{ color: 'rgba(14,59,40,0.3)' }}>
          Mogelijk gemaakt door{' '}
          <span className="font-bold" style={{ color: '#0e3b28' }}>
            Groun<span style={{ color: '#2fc586' }}>dr</span>
          </span>
        </div>
      </div>
    </div>
  )
}