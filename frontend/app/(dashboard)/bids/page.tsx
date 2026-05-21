'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Users, Clock, ChevronDown, ChevronUp, Home, MapPin } from 'lucide-react'

interface Bid {
  amount:     number
  placed_at:  string
  updated_at: string | null
}

interface Listing {
  id:           number
  reference:    string
  urgency:      string
  asking_price: number | null
  show_price:   boolean
  bid_deadline: string | null
  bid_count:    number
  highest_bid:  number | null
  bids?:        Bid[]
  loadingBids?: boolean
  expanded?:    boolean
  property: {
    street:       string
    house_number: string
    city:         string
    area_m2:      number | null
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    normal: { label: 'Normaal',   color: '#2fc586', bg: 'rgba(47,197,134,0.1)' },
    urgent: { label: 'Urgent',    color: '#c47c1a', bg: 'rgba(196,124,26,0.1)' },
    asap:   { label: 'Moet weg',  color: '#b84033', bg: 'rgba(184,64,51,0.1)'  },
  }
  const c = cfg[urgency] || cfg.normal
  return (
    <span className="text-xs font-bold px-2 py-0.5"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  )
}

export default function BidsDashboard() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    loadListings()
  }, [])

  async function loadListings() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      // Fetch approved submissions for this makelaar
      const res  = await fetch(`http://localhost:8000/api/submissions/public/1`)
      const data = await res.json()
      setListings((data.listings || []).map((l: any) => ({
        ...l,
        expanded:    false,
        loadingBids: false,
        bids:        [],
      })))
    } catch {
      setError('Kan biedingen niet laden.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleBids(listingId: number) {
    setListings(prev => prev.map(l => {
      if (l.id !== listingId) return l
      if (l.expanded) return { ...l, expanded: false }
      return { ...l, expanded: true, loadingBids: true }
    }))

    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(
        `http://localhost:8000/api/submissions/${listingId}/bids`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      setListings(prev => prev.map(l =>
        l.id === listingId
          ? { ...l, loadingBids: false, bids: data.bids || [], bid_count: data.count, highest_bid: data.highest_bid }
          : l
      ))
    } catch {
      setListings(prev => prev.map(l =>
        l.id === listingId ? { ...l, loadingBids: false } : l
      ))
    }
  }

  const totalBids    = listings.reduce((sum, l) => sum + (l.bid_count || 0), 0)
  const totalListings = listings.length
  const highestBid   = listings.reduce((max, l) => Math.max(max, l.highest_bid || 0), 0)

  return (
    <div className="min-h-screen bg-g900">

      {/* Nav */}
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center gap-4">
        <Link href="/dashboard" className="text-g300 opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} />
        </Link>
        <img src="/logo.svg" alt="Groundr" className="h-10 w-auto" />
        <span className="text-g300 opacity-30 text-sm">/ Biedingen</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Biedingen overzicht
          </h1>
          <p className="text-sm text-g300 opacity-50 mt-1">
            Alle biedingen op uw actieve woningen
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Actieve listings',  value: String(totalListings), icon: <Home size={16} />,       color: '#2fc586' },
            { label: 'Totaal biedingen',  value: String(totalBids),     icon: <Users size={16} />,      color: '#2fc586' },
            { label: 'Hoogste bod ooit',  value: highestBid > 0 ? formatPrice(highestBid) : '—',
              icon: <TrendingUp size={16} />, color: '#2fc586' },
          ].map((stat, i) => (
            <div key={i} className="bg-g800 border border-g700 p-5">
              <div className="flex items-center gap-2 mb-2 text-g400 opacity-70">{stat.icon}
                <span className="text-xs font-semibold text-g300 opacity-50 uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <div className="font-mono text-2xl font-semibold" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-16 text-g300 opacity-40 text-sm">Laden...</div>
        )}

        {!loading && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-g800 border border-g700 flex items-center justify-center mb-4">
              <TrendingUp size={24} className="text-g400" />
            </div>
            <p className="text-white font-display font-bold mb-1">Nog geen actieve listings</p>
            <p className="text-g300 opacity-40 text-sm">
              Keur aanmeldingen goed om biedingen te zien.
            </p>
          </div>
        )}

        {/* Listings with bids */}
        {!loading && listings.length > 0 && (
          <div className="flex flex-col gap-4">
            {listings.map(listing => (
              <div key={listing.id} className="bg-g800 border border-g700 overflow-hidden">

                {/* Listing header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-g700/30 transition-colors"
                  onClick={() => toggleBids(listing.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-g700 flex items-center justify-center flex-shrink-0">
                      <Home size={18} className="text-g400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-display font-bold text-white">
                          {listing.property.street} {listing.property.house_number}
                        </div>
                        <UrgencyBadge urgency={listing.urgency} />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-g300 opacity-50">
                        <MapPin size={10} />
                        {listing.property.city}
                        {listing.property.area_m2 && ` · ${listing.property.area_m2} m²`}
                      </div>
                      {listing.reference && (
                        <div className="font-mono text-xs text-g400 opacity-50 mt-0.5">
                          {listing.reference}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Bid stats */}
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-xs text-g300 opacity-40 mb-0.5">Biedingen</div>
                          <div className="font-mono font-bold text-white text-lg">
                            {listing.bid_count}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-g300 opacity-40 mb-0.5">Hoogste bod</div>
                          <div className="font-mono font-bold text-lg" style={{ color: listing.highest_bid ? '#2fc586' : 'rgba(255,255,255,0.3)' }}>
                            {listing.highest_bid ? formatPrice(listing.highest_bid) : '—'}
                          </div>
                        </div>
                        {listing.asking_price && (
                          <div>
                            <div className="text-xs text-g300 opacity-40 mb-0.5">Vraagprijs</div>
                            <div className="font-mono text-sm text-white">
                              {formatPrice(listing.asking_price)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <div className="text-g300 opacity-50">
                      {listing.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Deadline bar */}
                {listing.bid_deadline && (
                  <div className="px-5 py-2 border-t border-g700/50 flex items-center gap-2 text-xs"
                    style={{ color: new Date(listing.bid_deadline) < new Date() ? '#b84033' : '#c47c1a' }}>
                    <Clock size={11} />
                    {new Date(listing.bid_deadline) < new Date()
                      ? 'Biedingstermijn verlopen'
                      : `Deadline: ${new Date(listing.bid_deadline).toLocaleDateString('nl-NL')}`}
                  </div>
                )}

                {/* Expanded bids table */}
                {listing.expanded && (
                  <div className="border-t border-g700">
                    {listing.loadingBids ? (
                      <div className="text-center py-8 text-g300 opacity-40 text-sm">
                        Biedingen laden...
                      </div>
                    ) : listing.bids && listing.bids.length > 0 ? (
                      <div>
                        {/* Table header */}
                        <div className="grid grid-cols-3 px-5 py-2 border-b border-g700/50"
                          style={{ background: 'rgba(0,0,0,0.2)' }}>
                          <div className="text-xs font-semibold text-g300 opacity-40 uppercase tracking-wider">#</div>
                          <div className="text-xs font-semibold text-g300 opacity-40 uppercase tracking-wider">Bod bedrag</div>
                          <div className="text-xs font-semibold text-g300 opacity-40 uppercase tracking-wider">Geplaatst op</div>
                        </div>

                        {/* Bids — sorted highest first */}
                        {[...listing.bids]
                          .sort((a, b) => b.amount - a.amount)
                          .map((bid, i) => (
                            <div key={i}
                              className="grid grid-cols-3 px-5 py-3 border-b border-g700/30 items-center"
                              style={{ background: i === 0 ? 'rgba(47,197,134,0.05)' : 'transparent' }}>
                              <div className="text-xs text-g300 opacity-40">
                                {i === 0 && (
                                  <span className="text-g400 font-bold mr-2">🏆</span>
                                )}
                                #{i + 1}
                              </div>
                              <div className="font-mono font-bold"
                                style={{ color: i === 0 ? '#2fc586' : 'white', fontSize: i === 0 ? '16px' : '14px' }}>
                                {formatPrice(bid.amount)}
                                {listing.asking_price && bid.amount > listing.asking_price && (
                                  <span className="text-xs ml-2 font-normal" style={{ color: '#2fc586' }}>
                                    +{formatPrice(bid.amount - listing.asking_price)}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-g300 opacity-50">
                                {formatDate(bid.placed_at)}
                                {bid.updated_at && bid.updated_at !== bid.placed_at && (
                                  <span className="ml-2 opacity-60">(bijgewerkt)</span>
                                )}
                              </div>
                            </div>
                          ))}

                        {/* Summary row */}
                        <div className="px-5 py-3 flex items-center justify-between"
                          style={{ background: 'rgba(0,0,0,0.15)' }}>
                          <span className="text-xs text-g300 opacity-40">
                            {listing.bids.length} anonieme biedingen
                          </span>
                          {listing.asking_price && listing.highest_bid && (
                            <span className="text-xs font-semibold"
                              style={{ color: listing.highest_bid >= listing.asking_price ? '#2fc586' : '#c47c1a' }}>
                              {listing.highest_bid >= listing.asking_price
                                ? `${((listing.highest_bid / listing.asking_price - 1) * 100).toFixed(1)}% boven vraagprijs`
                                : `${((1 - listing.highest_bid / listing.asking_price) * 100).toFixed(1)}% onder vraagprijs`}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-g300 opacity-40 text-sm">
                        Nog geen biedingen op deze woning
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}