'use client'

import { useState, useEffect } from 'react'
import { X, TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react'

interface BidModalProps {
  submissionId:  number
  street:        string
  city:          string
  askingPrice:   number | null
  showPrice:     boolean
  bidDeadline:   string | null
  onClose:       () => void
  onSuccess:     (result: BidResult) => void
}

interface BidResult {
  your_bid:    number
  highest_bid: number
  bid_count:   number
  is_highest:  boolean
  message:     string
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price)
}

function timeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return 'Verlopen'
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days} dag${days > 1 ? 'en' : ''} ${hours}u`
  return `${hours} uur`
}

export default function BidModal({
  submissionId, street, city, askingPrice,
  showPrice, bidDeadline, onClose, onSuccess,
}: BidModalProps) {

  const [amount,      setAmount]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [currentBids, setCurrentBids] = useState<{ count: number; highest: number | null } | null>(null)
  const [isLoggedIn,  setIsLoggedIn]  = useState(false)
  const [success,     setSuccess]     = useState<BidResult | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dossier_token')
    setIsLoggedIn(!!token)
    loadBids()
  }, [])

  async function loadBids() {
    try {
      const res  = await fetch(`http://localhost:8000/api/submissions/${submissionId}/bids`)
      const data = await res.json()
      setCurrentBids({ count: data.count, highest: data.highest_bid })
    } catch {}
  }

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isLoggedIn) {
      sessionStorage.setItem('after_login', window.location.pathname)
      window.location.href = '/register'
      return
    }

    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      setError('Voer een geldig bedrag in.')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('dossier_token')
      const res   = await fetch(`http://localhost:8000/api/submissions/${submissionId}/bid`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Bod plaatsen mislukt.')
        return
      }
      setSuccess(data)
      onSuccess(data)
    } catch {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

  const deadlineExpired = bidDeadline && new Date(bidDeadline) < new Date()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md"
        style={{ background: 'white', border: '1px solid #e5e5e5', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <div className="font-semibold text-base" style={{ color: '#0a0a0a', letterSpacing: '-0.2px' }}>
              {street}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#888' }}>{city}</div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-60 transition-opacity">
            <X size={18} color="#888" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border-b border-gray-100">
          {showPrice && askingPrice && (
            <div className="p-4 border-r border-gray-100">
              <div className="text-xs font-medium mb-1" style={{ color: '#888' }}>Vraagprijs</div>
              <div className="font-bold text-sm" style={{ color: '#0a0a0a' }}>{formatPrice(askingPrice)}</div>
            </div>
          )}
          <div className={`p-4 ${showPrice && askingPrice ? 'border-r border-gray-100' : 'col-span-2 border-r border-gray-100'}`}>
            <div className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: '#888' }}>
              <Users size={10} /> Biedingen
            </div>
            <div className="font-bold text-sm" style={{ color: '#0a0a0a' }}>
              {currentBids ? currentBids.count : '—'}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: '#888' }}>
              <TrendingUp size={10} /> Hoogste bod
            </div>
            <div className="font-bold text-sm" style={{ color: '#00b37e' }}>
              {currentBids?.highest ? formatPrice(currentBids.highest) : '—'}
            </div>
          </div>
        </div>

        {/* Deadline */}
        {bidDeadline && (
          <div
            className="flex items-center gap-2 px-5 py-3 text-xs font-medium"
            style={{
              background: deadlineExpired ? '#fbeaea' : '#fff8e6',
              color:      deadlineExpired ? '#b84033' : '#c47c1a',
              borderBottom: '1px solid #e5e5e5',
            }}
          >
            <Clock size={12} />
            {deadlineExpired
              ? 'Biedingstermijn verlopen — bieden niet meer mogelijk'
              : `Sluit over: ${timeLeft(bidDeadline)}`}
          </div>
        )}

        {/* Success state */}
        {success ? (
          <div className="p-6 text-center">
            <div
              className="w-14 h-14 flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ background: '#e6f7f1' }}
            >
              {success.is_highest ? '🏆' : '✓'}
            </div>
            <div className="font-bold text-base mb-1" style={{ color: '#0a0a0a' }}>
              {success.is_highest ? 'U heeft het hoogste bod!' : 'Bod geplaatst'}
            </div>
            <div className="text-sm mb-1" style={{ color: '#888' }}>{success.message}</div>
            <div className="font-mono font-bold text-lg mt-3" style={{ color: '#00b37e' }}>
              {formatPrice(success.your_bid)}
            </div>
            <div className="text-xs mt-1" style={{ color: '#888' }}>
              {success.bid_count} biedingen totaal · hoogste: {formatPrice(success.highest_bid)}
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full py-3 text-sm font-semibold"
              style={{ background: '#0a0a0a', color: 'white' }}
            >
              Sluiten
            </button>
          </div>
        ) : (
          <div className="p-5">
            {!isLoggedIn && (
              <div
                className="flex items-start gap-2 p-3 mb-4 text-xs"
                style={{ background: '#fff8e6', border: '1px solid rgba(196,124,26,0.3)', color: '#c47c1a' }}
              >
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                U moet ingelogd zijn om te bieden.{' '}
                <a href="/register" style={{ color: '#0a0a0a', fontWeight: 600, textDecoration: 'underline' }}>
                  Registreer gratis
                </a>
              </div>
            )}

            <form onSubmit={handleBid}>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#888' }}>
                Uw bod (€)
              </label>

              {/* Quick amount suggestions */}
              {currentBids?.highest && (
                <div className="flex gap-2 mb-3">
                  {[0, 5000, 10000, 20000].map(bump => (
                    <button
                      key={bump}
                      type="button"
                      onClick={() => setAmount(String(currentBids.highest! + bump))}
                      className="flex-1 text-xs py-1.5 border transition-colors"
                      style={{
                        borderColor: '#e5e5e5',
                        color: '#555',
                        background: amount === String(currentBids.highest! + bump) ? '#0a0a0a' : 'white',
                        color: amount === String(currentBids.highest! + bump) ? 'white' : '#555',
                      }}
                    >
                      {bump === 0 ? 'Gelijk' : `+€${(bump/1000).toFixed(0)}K`}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center border" style={{ borderColor: '#e5e5e5' }}>
                <span className="px-3 py-3 text-sm font-semibold border-r" style={{ borderColor: '#e5e5e5', color: '#888' }}>€</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={askingPrice ? String(askingPrice) : '450000'}
                  required
                  disabled={!!deadlineExpired}
                  className="flex-1 px-4 py-3 text-sm outline-none"
                  style={{ color: '#0a0a0a', background: 'transparent' }}
                />
              </div>

              {amount && parseFloat(amount) > 0 && (
                <div className="text-xs mt-2" style={{ color: '#888' }}>
                  Uw bod: <strong style={{ color: '#0a0a0a' }}>{formatPrice(parseFloat(amount))}</strong>
                  {currentBids?.highest && parseFloat(amount) > currentBids.highest && (
                    <span style={{ color: '#00b37e' }}> · hoger dan huidig hoogste bod</span>
                  )}
                  {currentBids?.highest && parseFloat(amount) < currentBids.highest && (
                    <span style={{ color: '#c47c1a' }}> · lager dan huidig hoogste bod</span>
                  )}
                </div>
              )}

              {error && (
                <div className="text-xs mt-3 p-3" style={{ background: '#fbeaea', color: '#b84033' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!deadlineExpired}
                className="w-full mt-4 py-3 text-sm font-bold transition-opacity disabled:opacity-40"
                style={{ background: '#0a0a0a', color: 'white' }}
              >
                {loading ? 'Bezig...' : deadlineExpired ? 'Biedingstermijn verlopen' : 'Bod plaatsen'}
              </button>

              <p className="text-center text-xs mt-3" style={{ color: '#aaa' }}>
                Anoniem · U kunt uw bod later aanpassen
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}