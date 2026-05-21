// ─────────────────────────────────────────────────────────
// app/(auth)/register/page.tsx
//
// PURPOSE:
//   Registration page for new Groundr users.
//   After registering, user is immediately logged in
//   and redirected to the dashboard.
//
// URL: /register
// ─────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()

  // ── Form state ────────────────────────────────────────
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')


  // ── Handle form submit ────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Basic password length check
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('http://localhost:8000/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Registratie mislukt. Probeer opnieuw.')
        return
      }

      // ── Save token and redirect ────────────────────
      localStorage.setItem('token',   data.access_token)
      localStorage.setItem('user_id', String(data.user_id))
      localStorage.setItem('email',   data.email)

      // Read redirect destination set before registration
      const redirectTo = sessionStorage.getItem('after_login')
      sessionStorage.removeItem('after_login')
      router.push(redirectTo || '/dashboard')

    } catch (err) {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }


  // ── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-g900 flex items-center justify-center px-4">

      {/* Background dot grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(47,197,134,0.15) 1px, transparent 1px)',
          backgroundSize:  '28px 28px',
        }}
      />

      {/* Register card */}
      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-display text-3xl font-bold text-white tracking-tight">
            Groun<span className="text-g400">dr</span>
          </span>
          <p className="text-sm text-g300 mt-2 opacity-60">
            Dutch Real Estate Intelligence
          </p>
        </div>

        {/* Card */}
        <div className="bg-g800 border border-g700 p-8">

          <h1 className="font-display text-xl font-bold text-white mb-1">
            Account aanmaken
          </h1>
          <p className="text-sm text-g300 opacity-60 mb-6">
            Start gratis. Geen creditcard nodig.
          </p>

          {/* Error message */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="flex flex-col gap-4">

            {/* Full name */}
            <div>
              <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                Volledige naam
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jan van Dijk"
                required
                className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jan@stadsmakelaars.nl"
                required
                className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimaal 8 tekens"
                required
                className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
              />
            </div>

            {/* Plan info */}
            <div className="bg-g900/50 border border-g700 px-4 py-3 flex items-center gap-3">
              <div className="w-2 h-2 bg-g400 rounded-full flex-shrink-0" />
              <p className="text-xs text-g300 opacity-60">
                U start met het <strong className="text-g400">gratis plan</strong>.
                Upgrade op elk moment naar Pro.
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-g400 text-g900 font-bold py-3 text-sm mt-1 hover:bg-g300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Account aanmaken...' : 'Account aanmaken →'}
            </button>

          </form>

          {/* Login link */}
          <p className="text-center text-sm text-g300 opacity-50 mt-6">
            Al een account?{' '}
            <Link href="/login" className="text-g400 hover:text-g300 transition-colors">
              Inloggen
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}