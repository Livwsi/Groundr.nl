'use client'

import { useState } from 'react'

interface Props {
  onClose: () => void
}

export default function InviteModal({ onClose }: Props) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<{ url: string; email: string } | null>(null)
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:8000/api/auth/invite', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Er is een fout opgetreden.')
        return
      }

      setResult({ url: data.invite_url, email: data.email })

    } catch {
      setError('Verbindingsfout. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    if (!result) return
    navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md p-6 border"
        style={{ background: '#0a1f12', borderColor: 'rgba(47,197,134,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-base" style={{ color: '#fff' }}>
              Klant uitnodigen
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              De klant ontvangt een link om een dossier aan te maken.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            ✕
          </button>
        </div>

        {!result ? (
          // ── Input form ──────────────────────────────────
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                E-mailadres klant
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="klant@email.nl"
                required
                autoFocus
                className="w-full px-3 py-2 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border:     '1px solid rgba(255,255,255,0.1)',
                  color:      '#fff',
                }}
              />
            </div>

            {error && (
              <p className="text-xs p-2"
                style={{ background: 'rgba(184,64,51,0.1)', border: '1px solid rgba(184,64,51,0.3)', color: '#e07070' }}>
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-sm border"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 text-sm font-bold disabled:opacity-50"
                style={{ background: '#0e3b28', color: '#2fc586' }}
              >
                {loading ? 'Bezig...' : 'Uitnodiging aanmaken →'}
              </button>
            </div>
          </form>

        ) : (
          // ── Success — show invite link ───────────────────
          <div className="space-y-4">
            <div className="p-3 text-sm"
              style={{ background: 'rgba(47,197,134,0.08)', border: '1px solid rgba(47,197,134,0.2)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Uitnodigingslink voor {result.email}
              </p>
              <p className="text-xs break-all font-mono" style={{ color: '#2fc586' }}>
                {result.url}
              </p>
            </div>

            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Stuur deze link naar de klant. De link is 7 dagen geldig.
            </p>

            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className="flex-1 py-2 text-sm font-bold"
                style={{ background: '#0e3b28', color: '#2fc586' }}
              >
                {copied ? '✓ Gekopieerd!' : '🔗 Link kopiëren'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm border"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
              >
                Sluiten
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}