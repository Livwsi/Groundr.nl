'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, TrendingUp, Home, LogOut } from 'lucide-react'
import dynamic from 'next/dynamic'
import InviteModal from '@/components/invite/InviteModal'

const PropertyMap = dynamic(
  () => import('@/components/map/PropertyMap'),
  { ssr: false }
)

interface ScoreResult {
  score:    number
  factors:  Record<string, number>
  property: { street: string; house_number: string; city: string }
  neighborhood: {
    total_properties:       number
    avg_price_per_m2:       number | null
    estimated_rental_yield: number | null
    pct_apartments:         number
    pct_houses:             number
  }
  amenities: { name: string; type: string; distance_m: number }[]
}

interface Badges {
  pending_viewings: number
  pending_bids:     number
  open_meldingen:   number
  pending_approvals:number
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      className="ml-1.5 font-mono text-xs font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: 'rgba(196,124,26,0.2)', color: '#c47c1a', border: '1px solid rgba(196,124,26,0.3)' }}
    >
      {count}
    </span>
  )
}

export default function DashboardPage() {
  const router = useRouter()

  const [address,     setAddress]     = useState('')
  const [radius,      setRadius]      = useState('2.0')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<ScoreResult | null>(null)
  const [error,       setError]       = useState('')
  const [email,       setEmail]       = useState('gebruiker')
  const [properties,  setProperties]  = useState<any[]>([])
  const [showInvite,  setShowInvite]  = useState(false)
  const [badges,      setBadges]      = useState<Badges>({
    pending_viewings:  0,
    pending_bids:      0,
    open_meldingen:    0,
    pending_approvals: 0,
  })

  function generateExplanation(result: ScoreResult): { icon: string; text: string }[] {
    const lines: { icon: string; text: string }[] = []
    const f = result.factors

    if (f.rental_yield >= 70)
      lines.push({ icon: '📈', text: 'Uitstekend huurrendement in deze buurt' })
    else if (f.rental_yield >= 40)
      lines.push({ icon: '📊', text: 'Gemiddeld huurrendement' })
    else
      lines.push({ icon: '📉', text: 'Laag huurrendement' })

    if (f.price_trend_6m >= 70)
      lines.push({ icon: '🏠', text: 'Sterke prijsstijging afgelopen 6 maanden' })
    else if (f.price_trend_6m >= 40)
      lines.push({ icon: '🏠', text: 'Stabiele prijsontwikkeling' })
    else
      lines.push({ icon: '🏠', text: 'Prijzen onder druk in dit gebied' })

    if (f.woz_delta >= 70)
      lines.push({ icon: '💰', text: 'WOZ-waarde stijgt sterk — goed teken' })
    else if (f.woz_delta < 30)
      lines.push({ icon: '💰', text: 'WOZ-waarde stagnatie' })

    if (f.energy_label >= 80)
      lines.push({ icon: '⚡', text: 'Energiezuinig pand (label A of B)' })
    else if (f.energy_label < 40)
      lines.push({ icon: '⚡', text: 'Energielabel matig — verduurzaming gewenst' })

    const transit = result.amenities.find(a =>
      ['bus_stop','train_station','subway_entrance','tram_stop'].includes(a.type))
    if (transit) {
      const dist = transit.distance_m < 1000
        ? `${Math.round(transit.distance_m)}m`
        : `${(transit.distance_m / 1000).toFixed(1)}km`
      lines.push({ icon: '🚌', text: `Openbaar vervoer op ${dist} afstand` })
    }

    const school = result.amenities.find(a =>
      ['school','kindergarten','university'].includes(a.type))
    if (school) {
      const dist = school.distance_m < 1000
        ? `${Math.round(school.distance_m)}m`
        : `${(school.distance_m / 1000).toFixed(1)}km`
      lines.push({ icon: '🎓', text: `School binnen ${dist}` })
    }

    const supermarket = result.amenities.find(a => a.type === 'supermarket')
    if (supermarket) {
      const dist = supermarket.distance_m < 1000
        ? `${Math.round(supermarket.distance_m)}m`
        : `${(supermarket.distance_m / 1000).toFixed(1)}km`
      lines.push({ icon: '🛒', text: `Supermarkt op ${dist}` })
    }

    if (result.neighborhood.pct_houses >= 60)
      lines.push({ icon: '🏡', text: 'Rustige woonwijk — overwegend eengezinswoningen' })
    else if (result.neighborhood.pct_apartments >= 60)
      lines.push({ icon: '🏢', text: 'Stedelijk gebied — veel appartementen' })

    return lines.slice(0, 5)
  }

  useEffect(() => {
    setEmail(localStorage.getItem('email') || 'gebruiker')
    loadProperties()
    loadBadges()
  }, [])

  async function loadBadges() {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const [viewRes, melRes, subRes] = await Promise.all([
        fetch('http://localhost:8000/api/viewings/requests',
          { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/meldingen/',
          { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/submissions/pending',
          { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [viewData, melData, subData] = await Promise.all([
        viewRes.json(), melRes.json(), subRes.json(),
      ])
      setBadges({
        pending_viewings:  (viewData.requests || []).filter((r: any) => r.status === 'pending').length,
        pending_bids:      0,
        open_meldingen:    (melData.meldingen || []).filter((m: any) => m.status === 'open').length,
        pending_approvals: (subData.submissions || []).length,
      })
    } catch {}
  }

  async function loadProperties() {
    try {
      const res  = await fetch(
        'http://localhost:8000/api/properties/search?q=Achterom%20Eindhoven&radius=10'
      )
      const data = await res.json()
      const mapped = (data.results || []).map((p: any) => ({
        id:            p.id,
        street:        p.street,
        house_number:  p.house_number || '',
        city:          p.city,
        latitude:      p.latitude,
        longitude:     p.longitude,
        woz_value:     p.woz_value,
        area_m2:       p.area_m2,
        property_type: p.property_type,
      })).filter((p: any) => p.latitude && p.longitude)
      setProperties(mapped)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `http://localhost:8000/api/analytics/score?address=${encodeURIComponent(address)}&radius=${radius}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Adres niet gevonden.'); return }
      setResult(data)
    } catch {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

  function scoreColor(score: number) {
    if (score >= 70) return 'text-g400'
    if (score >= 50) return 'text-amber'
    return 'text-terra'
  }

  const totalAlerts = badges.pending_viewings + badges.open_meldingen + badges.pending_approvals

  return (
    <div className="min-h-screen bg-g900">

      {/* Invite modal */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      {/* Nav */}
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img src="/logo.svg" alt="Groundr" className="h-10 w-auto" />

          <Link href="/listings"
            className="text-sm text-g300 opacity-50 hover:opacity-100 transition-opacity">
            Mijn listings
          </Link>

          <Link href="/approvals"
            className="text-sm text-g300 opacity-50 hover:opacity-100 transition-opacity flex items-center">
            Aanmeldingen
            <Badge count={badges.pending_approvals} />
          </Link>

          <Link href="/bids"
            className="text-sm text-g300 opacity-50 hover:opacity-100 transition-opacity">
            Biedingen
          </Link>

          <Link href="/viewings"
            className="text-sm text-g300 opacity-50 hover:opacity-100 transition-opacity flex items-center">
            Bezichtigingen
            <Badge count={badges.pending_viewings} />
          </Link>

          <Link href="/meldingen"
            className="text-sm text-g300 opacity-50 hover:opacity-100 transition-opacity flex items-center">
            Meldingen
            <Badge count={badges.open_meldingen} />
          </Link>

          <Link href="/analytics"
            className="text-sm text-g300 opacity-50 hover:opacity-100 transition-opacity">
            Analytics
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {totalAlerts > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1"
              style={{ background: 'rgba(196,124,26,0.1)', color: '#c47c1a', border: '1px solid rgba(196,124,26,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#c47c1a' }}/>
              {totalAlerts} actie{totalAlerts > 1 ? 's' : ''} vereist
            </div>
          )}

          {/* Invite button */}
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 transition-opacity"
            style={{ background: 'rgba(47,197,134,0.1)', color: '#2fc586', border: '1px solid rgba(47,197,134,0.25)' }}
          >
            + Klant uitnodigen
          </button>

          <span className="text-sm text-g300 opacity-60">{email}</span>
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/login' }}
            className="flex items-center gap-1 text-xs text-g300 opacity-50 hover:opacity-100 transition-opacity"
          >
            <LogOut size={14} />
            Uitloggen
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Intelligence dashboard
          </h1>
          <p className="text-sm text-g300 opacity-50 mt-1">
            Voer een adres in om de investeringsscore en buurtanalyse te bekijken
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="flex-1 flex items-center gap-3 bg-g800 border border-g700 px-4 focus-within:border-g400 transition-colors">
            <Search size={16} className="text-g400 flex-shrink-0" />
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Zoek een adres — bijv. Stratumsedijk 23 Eindhoven"
              className="flex-1 bg-transparent text-white placeholder-white/25 py-3 text-sm outline-none"
            />
          </div>
          <select
            value={radius}
            onChange={e => setRadius(e.target.value)}
            className="bg-g800 border border-g700 text-white text-sm px-3 outline-none focus:border-g400 transition-colors"
          >
            <option value="0.5">0.5 km</option>
            <option value="1.0">1.0 km</option>
            <option value="2.0">2.0 km</option>
            <option value="5.0">5.0 km</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-g400 text-g900 font-bold px-6 text-sm hover:bg-g300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Laden...' : 'Analyseer'}
          </button>
        </form>

        {error && (
          <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-g800 border border-g700 p-6 flex flex-col items-center justify-center">
                <div className="text-xs font-semibold text-g300 opacity-50 uppercase tracking-wider mb-2">
                  Investeringsscore
                </div>
                <div className={`font-mono text-6xl font-semibold ${scoreColor(result.score)}`}>
                  {result.score}
                </div>
                <div className="text-xs text-g300 opacity-40 mt-1 mb-4">/100</div>
                <div className="w-full flex flex-col gap-1.5 border-t border-g700 pt-4">
                  {generateExplanation(result).map((line, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-g300 opacity-70">
                      <span style={{ color: '#2fc586' }}>{line.icon}</span>
                      <span>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-g800 border border-g700 p-6 col-span-2">
                <div className="flex items-start gap-2 mb-4">
                  <MapPin size={16} className="text-g400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-display font-bold text-white">
                      {result.property.street} {result.property.house_number}
                    </div>
                    <div className="text-sm text-g300 opacity-50">{result.property.city}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {Object.entries(result.factors).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-g300 opacity-50 w-28 capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <div className="flex-1 h-1.5 bg-g900">
                        <div className="h-full bg-g400 transition-all duration-500"
                          style={{ width: `${value}%` }} />
                      </div>
                      <span className="font-mono text-xs text-g400 w-8 text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-g800 border border-g700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-g400" />
                <span className="font-display font-bold text-white text-sm">
                  Buurtstatistieken — {radius} km radius
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="font-mono text-2xl font-semibold text-white">
                    {result.neighborhood.total_properties}
                  </div>
                  <div className="text-xs text-g300 opacity-50 mt-1">Woningen in buurt</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-white">
                    {result.neighborhood.avg_price_per_m2
                      ? `€${result.neighborhood.avg_price_per_m2.toFixed(0)}` : '—'}
                  </div>
                  <div className="text-xs text-g300 opacity-50 mt-1">Gem. prijs per m²</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-white">
                    {result.neighborhood.estimated_rental_yield
                      ? `${result.neighborhood.estimated_rental_yield.toFixed(1)}%` : '—'}
                  </div>
                  <div className="text-xs text-g300 opacity-50 mt-1">Geschat rendement</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-white">
                    {result.neighborhood.pct_apartments.toFixed(0)}%
                  </div>
                  <div className="text-xs text-g300 opacity-50 mt-1">Appartementen</div>
                </div>
              </div>
            </div>

            {result.amenities.length > 0 && (
              <div className="bg-g800 border border-g700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Home size={16} className="text-g400" />
                  <span className="font-display font-bold text-white text-sm">
                    Voorzieningen in de buurt
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {result.amenities.map((a, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-g700/50">
                      <span className="text-sm text-g300 opacity-70">{a.name}</span>
                      <span className="font-mono text-xs text-g400">
                        {a.distance_m < 1000
                          ? `${a.distance_m.toFixed(0)}m`
                          : `${(a.distance_m / 1000).toFixed(1)}km`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="w-full h-96 bg-g800 border border-g700 mb-8">
            <PropertyMap
              properties={properties}
              onSelect={prop => router.push(`/property/${prop.id}`)}
            />
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-g800 border border-g700 flex items-center justify-center mb-4">
              <MapPin size={24} className="text-g400" />
            </div>
            <p className="text-g300 opacity-40 text-sm">Voer een adres in om te beginnen</p>
          </div>
        )}

      </div>
    </div>
  )
}