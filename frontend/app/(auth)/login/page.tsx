'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
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
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Login mislukt. Probeer opnieuw.')
        return
      }

      localStorage.setItem('token',   data.access_token)
      localStorage.setItem('user_id', String(data.user_id))
      localStorage.setItem('email',   data.email)

      // Read redirect destination set before login
      const redirectTo = sessionStorage.getItem('after_login')
      sessionStorage.removeItem('after_login')
      router.push(redirectTo || '/dashboard')

    } catch (err) {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

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

      {/* Login card */}
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
            Inloggen
          </h1>
          <p className="text-sm text-g300 opacity-60 mb-6">
            Welkom terug. Vul uw gegevens in.
          </p>

          {/* Error message */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">

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

            <div>
              <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-g400 text-g900 font-bold py-3 text-sm mt-2 hover:bg-g300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Bezig...' : 'Inloggen →'}
            </button>

          </form>

          <p className="text-center text-sm text-g300 opacity-50 mt-6">
            Nog geen account?{' '}
            <Link href="/register" className="text-g400 hover:text-g300 transition-colors">
              Registreer hier
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}