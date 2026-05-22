'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Eye, Calendar, AlertTriangle, Home, MapPin, ChevronDown, ChevronUp } from 'lucide-react'

interface Submission {
  id:                 number
  reference:          string
  street:             string
  house_number:       string
  city:               string
  area_m2:            number | null
  asking_price:       number | null
  urgency:            string
  status:             string
  created_at:         string
  bid_count:          number
  highest_bid:        number | null
  viewing_count:      number
  confirmed_viewings: number
  melding_count:      number
  conversion_rate:    number
}

interface Listing {
  id:             number
  street:         string
  house_number:   string
  city:           string
  asking_price:   number | null
  status:         string
  days_on_market: number
}

interface Totals {
  listings:             number
  submissions:          number
  total_bids:           number
  total_viewings:       number
  total_meldingen:      number
  avg_days_on_market:   number
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price)
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-g800 border border-g700 p-5">
      <div className="text-xs text-g300 opacity-40 mb-1 uppercase tracking-wider">{label}</div>
      <div className="font-mono text-3xl font-semibold mb-1" style={{ color: color || 'white' }}>{value}</div>
      {sub && <div className="text-xs text-g300 opacity-40">{sub}</div>}
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-g900 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs text-g300 opacity-60 w-6 text-right">{value}</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [totals,      setTotals]      = useState<Totals | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [listings,    setListings]    = useState<Listing[]>([])
  const [loading,     setLoading]     = useState(true)
  const [expanded,    setExpanded]    = useState<number | null>(null)
  const [sortBy,      setSortBy]      = useState<'bids' | 'viewings' | 'date'>('date')

  useEffect(() => { loadAnalytics() }, [])

  async function loadAnalytics() {
    setLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res  = await fetch('http://localhost:8000/api/listings/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setTotals(data.totals)
      setSubmissions(data.submissions || [])
      setListings(data.listings || [])
    } catch {}
    finally { setLoading(false) }
  }

  const sorted = [...submissions].sort((a, b) => {
    if (sortBy === 'bids')     return b.bid_count - a.bid_count
    if (sortBy === 'viewings') return b.viewing_count - a.viewing_count
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const maxBids     = Math.max(...submissions.map(s => s.bid_count), 1)
  const maxViewings = Math.max(...submissions.map(s => s.viewing_count), 1)

  return (
    <div className="min-h-screen bg-g900">

      {/* Nav */}
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center gap-4">
        <Link href="/dashboard" className="text-g300 opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} />
        </Link>
        <img src="/logo.svg" alt="Groundr" className="h-10 w-auto" />
        <span className="text-g300 opacity-30 text-sm">/ Analytics</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Prestatie overzicht
          </h1>
          <p className="text-sm text-g300 opacity-50 mt-1">
            Biedingen, bezichtigingen en conversies per woning
          </p>
        </div>

        {loading && (
          <div className="text-center py-16 text-g300 opacity-40 text-sm">Laden...</div>
        )}

        {!loading && totals && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Totaal biedingen"
                value={totals.total_bids}
                sub={`${totals.submissions} actieve woningen`}
                color="#2fc586"
              />
              <StatCard
                label="Bezichtigingen aangevraagd"
                value={totals.total_viewings}
                sub="via viewing scheduler"
                color="#2fc586"
              />
              <StatCard
                label="Gem. dagen op markt"
                value={totals.avg_days_on_market}
                sub={`${totals.listings} listings totaal`}
                color={totals.avg_days_on_market > 30 ? '#c47c1a' : '#2fc586'}
              />
            </div>

            {/* Submissions performance */}
            {submissions.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-white">Woning prestaties</h2>
                  <div className="flex gap-1">
                    {(['date', 'bids', 'viewings'] as const).map(s => (
                      <button key={s} onClick={() => setSortBy(s)}
                        className="text-xs px-3 py-1.5 font-semibold transition-all"
                        style={{
                          background: sortBy === s ? 'rgba(47,197,134,0.15)' : 'rgba(255,255,255,0.03)',
                          color:      sortBy === s ? '#2fc586' : 'rgba(255,255,255,0.3)',
                          border:     sortBy === s ? '1px solid rgba(47,197,134,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        }}>
                        {s === 'date' ? 'Datum' : s === 'bids' ? 'Biedingen' : 'Bezichtigingen'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {sorted.map(sub => (
                    <div key={sub.id} className="bg-g800 border border-g700 overflow-hidden">

                      {/* Row header */}
                      <div
                        className="p-5 flex items-center gap-4 cursor-pointer hover:bg-g700/20 transition-colors"
                        onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-white">
                              {sub.street} {sub.house_number}
                            </span>
                            <span className="text-xs font-mono text-g400 opacity-50">{sub.reference}</span>
                            {sub.urgency !== 'normal' && (
                              <span className="text-xs font-bold px-1.5 py-0.5"
                                style={{
                                  background: sub.urgency === 'asap' ? 'rgba(184,64,51,0.15)' : 'rgba(196,124,26,0.15)',
                                  color:      sub.urgency === 'asap' ? '#b84033' : '#c47c1a',
                                }}>
                                {sub.urgency === 'asap' ? 'Moet weg' : 'Urgent'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-g300 opacity-40">
                            <MapPin size={10} /> {sub.city}
                            {sub.area_m2 && <span className="ml-2">{sub.area_m2} m²</span>}
                            {sub.asking_price && <span className="ml-2">{formatPrice(sub.asking_price)}</span>}
                          </div>
                        </div>

                        {/* Mini stats */}
                        <div className="grid grid-cols-3 gap-6 flex-shrink-0">
                          <div className="text-center w-20">
                            <div className="font-mono text-xl font-semibold" style={{ color: '#2fc586' }}>
                              {sub.bid_count}
                            </div>
                            <div className="text-xs text-g300 opacity-40">biedingen</div>
                            <MiniBar value={sub.bid_count} max={maxBids} color="#2fc586" />
                          </div>
                          <div className="text-center w-20">
                            <div className="font-mono text-xl font-semibold text-white">
                              {sub.viewing_count}
                            </div>
                            <div className="text-xs text-g300 opacity-40">bezichtigingen</div>
                            <MiniBar value={sub.viewing_count} max={maxViewings} color="#1a6fc4" />
                          </div>
                          <div className="text-center w-20">
                            <div className="font-mono text-xl font-semibold"
                              style={{ color: sub.conversion_rate >= 50 ? '#2fc586' : sub.conversion_rate > 0 ? '#c47c1a' : 'rgba(255,255,255,0.3)' }}>
                              {sub.conversion_rate}%
                            </div>
                            <div className="text-xs text-g300 opacity-40">conversie</div>
                          </div>
                        </div>

                        <div className="text-g300 opacity-30">
                          {expanded === sub.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expanded === sub.id && (
                        <div className="border-t border-g700 px-5 py-4 grid grid-cols-4 gap-4"
                          style={{ background: 'rgba(0,0,0,0.2)' }}>
                          <div>
                            <div className="text-xs text-g300 opacity-40 mb-1">Hoogste bod</div>
                            <div className="font-mono font-semibold" style={{ color: sub.highest_bid ? '#2fc586' : 'rgba(255,255,255,0.3)' }}>
                              {sub.highest_bid ? formatPrice(sub.highest_bid) : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-g300 opacity-40 mb-1">Bevestigde bezichtigingen</div>
                            <div className="font-mono font-semibold text-white">{sub.confirmed_viewings}</div>
                          </div>
                          <div>
                            <div className="text-xs text-g300 opacity-40 mb-1">Meldingen</div>
                            <div className="font-mono font-semibold"
                              style={{ color: sub.melding_count > 0 ? '#c47c1a' : 'rgba(255,255,255,0.3)' }}>
                              {sub.melding_count}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-g300 opacity-40 mb-1">Status</div>
                            <div className="text-xs font-semibold"
                              style={{ color: sub.status === 'approved' ? '#2fc586' : '#c47c1a' }}>
                              {sub.status === 'approved' ? 'Goedgekeurd' : sub.status}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market listings days on market */}
            {listings.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-white mb-4">Listings — dagen op markt</h2>
                <div className="flex flex-col gap-2">
                  {listings.map(l => (
                    <div key={l.id} className="bg-g800 border border-g700 px-5 py-3 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-white">
                          {l.street} {l.house_number}
                        </div>
                        <div className="text-xs text-g300 opacity-40">{l.city}</div>
                      </div>
                      {l.asking_price && (
                        <div className="font-mono text-sm text-white">{formatPrice(l.asking_price)}</div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-g900 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{
                              width: `${Math.min(l.days_on_market / 90 * 100, 100)}%`,
                              background: l.days_on_market > 60 ? '#b84033' : l.days_on_market > 30 ? '#c47c1a' : '#2fc586',
                            }} />
                        </div>
                        <span className="font-mono text-xs w-16 text-right"
                          style={{ color: l.days_on_market > 60 ? '#b84033' : l.days_on_market > 30 ? '#c47c1a' : '#2fc586' }}>
                          {l.days_on_market}d
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submissions.length === 0 && listings.length === 0 && (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="w-14 h-14 bg-g800 border border-g700 flex items-center justify-center mb-4">
                  <TrendingUp size={22} className="text-g400" />
                </div>
                <p className="text-white font-semibold mb-1">Nog geen data</p>
                <p className="text-g300 opacity-40 text-sm">
                  Voeg listings toe en keur aanmeldingen goed om analytics te zien.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}