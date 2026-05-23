'use client'

import PropertyReport from '@/components/report/PropertyReport'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Home, Zap, TrendingUp, Calendar, Ruler, FileText } from 'lucide-react'
import dynamic from 'next/dynamic'


const PropertyMap = dynamic(
  () => import('@/components/map/PropertyMap'),
  { ssr: false }
)

interface Property {
  id:            number 
  street:        string
  house_number:  string
  postal_code:   string
  city:          string
  municipality:  string
  neighborhood:  string | null
  latitude:      number
  longitude:     number
  year_built:    number | null
  area_m2:       number | null
  property_type: string
  energy_label:  string
  woz_value:     number | null
  woz_year:      number | null
  source:        string
  created_at:    string
}

interface ScoreResult {
  score:       number
  factors:     Record<string, number>
  explanation: Record<string, string>
  neighborhood: {
    total_properties:       number
    avg_price_per_m2:       number | null
    estimated_rental_yield: number | null
    pct_apartments:         number
    pct_houses:             number
  }
  amenities: { name: string; type: string; distance_m: number }[]
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price)
}

function scoreColor(score: number) {
  if (score >= 70) return '#2fc586'
  if (score >= 50) return '#c47c1a'
  return '#b84033'
}

// Gradient placeholders until real photos are available
const PHOTO_GRADIENTS = [
  'linear-gradient(135deg, #0e3b28 0%, #165c3e 50%, #1e7d55 100%)',
  'linear-gradient(135deg, #0a2a1e 0%, #0e3b28 50%, #165c3e 100%)',
  'linear-gradient(135deg, #061a11 0%, #0e3b28 50%, #2dbe81 100%)',
]

function PriceHistoryChart({ propertyId }: { propertyId: number }) {
  const [history, setHistory] = useState<{ year: number; price: number }[]>([])

  useEffect(() => {
    fetch(`http://localhost:8000/api/properties/${propertyId}/price-history`)
      .then(r => r.json())
      .then(data => setHistory(data.history || []))
      .catch(() => {})
  }, [propertyId])

  if (history.length === 0) return null

  const max   = Math.max(...history.map(h => h.price))
  const min   = Math.min(...history.map(h => h.price))
  const range = max - min || 1

  const W = 400
  const H = 100
  const pad = { t: 10, r: 10, b: 24, l: 10 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b

  const pts = history.map((h, i) => ({
    x: pad.l + (i / (history.length - 1)) * cw,
    y: pad.t + (1 - (h.price - min) / range) * ch,
    price: h.price,
    year: h.year,
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length-1].x} ${H - pad.b} L ${pts[0].x} ${H - pad.b} Z`

  const pctChange = ((history[history.length-1].price - history[0].price) / history[0].price * 100).toFixed(0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-g300 opacity-40">WOZ 2019–2025</span>
        <span className="text-xs font-mono font-bold" style={{ color: '#2fc586' }}>
          +{pctChange}% in 6 jaar
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '80px' }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2fc586" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2fc586" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaD} fill="url(#chartFill)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#2fc586" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#2fc586" />
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)">
              {p.year}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="font-mono text-xs text-g300 opacity-40">{formatPrice(min)}</span>
        <span className="font-mono text-xs text-g300 opacity-40">{formatPrice(max)}</span>
      </div>
    </div>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [property,   setProperty]   = useState<Property | null>(null)
  const [score,      setScore]      = useState<ScoreResult | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    if (!id) return
    loadProperty()
  }, [id])

  async function loadProperty() {
    setLoading(true)
    try {
      const res  = await fetch(`http://localhost:8000/api/properties/${id}`)
      if (!res.ok) { setError('Woning niet gevonden.'); return }
      const prop = await res.json()
      setProperty(prop)

      const address = `${prop.street} ${prop.house_number} ${prop.city}`
      const res2    = await fetch(
        `http://localhost:8000/api/analytics/score?address=${encodeURIComponent(address)}&radius=2.0`
      )
      if (res2.ok) setScore(await res2.json())
    } catch {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-g900 flex items-center justify-center">
      <div className="text-g300 opacity-40 text-sm">Laden...</div>
    </div>
  )

  if (error || !property) return (
    <div className="min-h-screen bg-g900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-400 text-sm mb-4">{error || 'Woning niet gevonden'}</div>
        <Link href="/dashboard" className="text-g400 text-sm">Terug naar dashboard</Link>
      </div>
    </div>
  )

  const mapProps = [{
    id:            property.id,
    street:        property.street,
    house_number:  property.house_number,
    city:          property.city,
    latitude:      property.latitude,
    longitude:     property.longitude,
    woz_value:     property.woz_value,
    area_m2:       property.area_m2,
    property_type: property.property_type,
  }]

  return (
    <div className="min-h-screen bg-g900">

      {/* Nav — floating over the hero */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 h-14 flex items-center gap-4"
        style={{ background: 'rgba(6,26,17,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(47,197,134,0.1)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-g300 opacity-60 hover:opacity-100 transition-opacity text-sm"
        >
          <ArrowLeft size={16} />
          Terug
        </button>
        <div className="flex-1" />
        <span className="text-white font-semibold text-sm">
          {property.street} {property.house_number}
        </span>
        <div className="flex-1" />
        {score && (
          <PropertyReport property={{
            id:            property.id,
            street:        property.street,
            house_number:  property.house_number,
            postal_code:   property.postal_code,
            city:          property.city,
            area_m2:       property.area_m2,
            year_built:    property.year_built,
            property_type: property.property_type,
            energy_label:  property.energy_label,
            woz_value:     property.woz_value,
          }} score={score} />
        )}
      </nav>

      {/* Hero photo gallery */}
      <div className="relative h-[70vh] mt-0">

        {/* Main photo */}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: PHOTO_GRADIENTS[activePhoto] }}
        >
          {/* Placeholder until real photos */}
          <div className="flex flex-col items-center gap-3 opacity-20">
            <Home size={64} className="text-white" />
            <span className="text-white text-sm font-semibold">
              Foto's worden binnenkort toegevoegd
            </span>
          </div>

          {/* Address overlay — bottom left */}
          <div
            className="absolute bottom-0 left-0 right-0 p-8"
            style={{ background: 'linear-gradient(to top, rgba(6,26,17,0.95) 0%, transparent 100%)' }}
          >
            <div className="max-w-5xl mx-auto">
              <h1 className="font-display text-4xl font-bold text-white tracking-tight mb-2">
                {property.street} {property.house_number}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-g300 opacity-60 text-sm">
                  <MapPin size={13} />
                  {property.postal_code} {property.city}
                  {property.neighborhood && ` · ${property.neighborhood}`}
                </div>
                {property.area_m2 && (
                  <span className="text-g300 opacity-40 text-sm">·  {property.area_m2} m²</span>
                )}
                {property.year_built && (
                  <span className="text-g300 opacity-40 text-sm">· Bouwjaar {property.year_built}</span>
                )}
              </div>
            </div>
          </div>

          {/* Thumbnail nav */}
          <div className="absolute bottom-6 right-8 flex gap-2">
            {PHOTO_GRADIENTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className="w-14 h-10 transition-all"
                style={{
                  background:  PHOTO_GRADIENTS[i],
                  border:      i === activePhoto ? '2px solid #2fc586' : '2px solid rgba(255,255,255,0.2)',
                  opacity:     i === activePhoto ? 1 : 0.6,
                }}
              />
            ))}
          </div>
        </div>

        {/* Score badge — top right */}
        {score && (
          <div
            className="absolute top-20 right-8 flex flex-col items-center px-5 py-4"
            style={{
              background:     'rgba(6,26,17,0.9)',
              border:         `1px solid ${scoreColor(score.score)}40`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="text-xs font-semibold text-g300 opacity-50 uppercase tracking-wider mb-1">
              Investeringsscore
            </div>
            <div
              className="font-mono text-5xl font-semibold leading-none"
              style={{ color: scoreColor(score.score) }}
            >
              {score.score}
            </div>
            <div className="text-xs text-g300 opacity-30 mt-1">/100</div>
          </div>
        )}
      </div>

      {/* Content below the hero */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-3 gap-6">

          {/* Left — 2 columns */}
          <div className="col-span-2 flex flex-col gap-6">

            {/* Key specs bar */}
            <div className="bg-g800 border border-g700 p-5 grid grid-cols-4 gap-4">
              {[
                { icon: <Home size={16}/>,     label: 'Type',         value: property.property_type || '—' },
                { icon: <Ruler size={16}/>,    label: 'Oppervlak',    value: property.area_m2 ? `${property.area_m2} m²` : '—' },
                { icon: <Calendar size={16}/>, label: 'Bouwjaar',     value: String(property.year_built || '—') },
                { icon: <Zap size={16}/>,      label: 'Energielabel', value: property.energy_label !== 'unknown' ? property.energy_label : '—' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-1">
                  <span className="text-g400">{item.icon}</span>
                  <span className="text-xs text-g300 opacity-40">{item.label}</span>
                  <span className="text-sm text-white font-semibold capitalize">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Map */}
            <div>
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider opacity-50 mb-3">
                Locatie
              </h2>
              <div className="h-64 bg-g800 border border-g700 overflow-hidden">
                <PropertyMap
                  properties={mapProps}
                  center={[property.longitude, property.latitude]}
                  zoom={15}
                />
              </div>
            </div>

            {/* WOZ value + price history chart */}
            <div className="bg-g800 border border-g700 p-5">
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider opacity-50 mb-4">
                WOZ-waarde & prijsontwikkeling
              </h2>
              {property.woz_value && (
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="font-mono text-3xl font-semibold text-white">
                      {formatPrice(property.woz_value)}
                    </div>
                    <div className="text-xs text-g300 opacity-40 mt-1">
                      Peildatum {property.woz_year || '—'}
                    </div>
                  </div>
                  <TrendingUp size={32} className="text-g400 opacity-20" />
                </div>
              )}
              <PriceHistoryChart propertyId={property.id} />
            </div>

            {/* Amenities */}
            {score && score.amenities.length > 0 && (
              <div className="bg-g800 border border-g700 p-5">
                <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider opacity-50 mb-4">
                  Voorzieningen in de buurt
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {score.amenities.map((a, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-g700/30">
                      <span className="text-sm text-g300 opacity-70">{a.name}</span>
                      <span className="font-mono text-xs text-g400">
                        {a.distance_m < 1000
                          ? `${Math.round(a.distance_m)}m`
                          : `${(a.distance_m / 1000).toFixed(1)}km`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* Score breakdown */}
            {score && (
              <div className="bg-g800 border border-g700 p-5">
                <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider opacity-50 mb-4">
                  Score breakdown
                </h2>
                <div className="flex flex-col gap-4">
                  {Object.entries(score.factors).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-g300 opacity-50 capitalize">
                          {key.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-xs font-bold" style={{ color: scoreColor(value) }}>
                          {value}
                        </span>
                      </div>
                      <div className="h-1 bg-g900">
                        <div
                          className="h-full transition-all duration-700"
                          style={{ width: `${value}%`, background: scoreColor(value) }}
                        />
                      </div>
                      {score.explanation[key] && (
                        <div className="text-xs text-g300 opacity-25 mt-1 leading-relaxed">
                          {score.explanation[key]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Neighborhood */}
            {score && (
              <div className="bg-g800 border border-g700 p-5">
                <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider opacity-50 mb-4">
                  Buurt (2km)
                </h2>
                <div className="flex flex-col gap-0">
                  {[
                    { label: 'Woningen',     value: String(score.neighborhood.total_properties) },
                    { label: 'Gem. prijs/m²', value: score.neighborhood.avg_price_per_m2 ? `€${Math.round(score.neighborhood.avg_price_per_m2)}` : '—' },
                    { label: 'Rendement',    value: score.neighborhood.estimated_rental_yield ? `${score.neighborhood.estimated_rental_yield.toFixed(1)}%` : '—' },
                    { label: 'Appartementen',value: `${score.neighborhood.pct_apartments.toFixed(0)}%` },
                    { label: 'Woningen %',   value: `${score.neighborhood.pct_houses.toFixed(0)}%` },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5 border-b border-g700/30 last:border-0">
                      <span className="text-xs text-g300 opacity-50">{item.label}</span>
                      <span className="font-mono text-sm text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data source */}
            <div className="bg-g800 border border-g700 p-5">
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider opacity-50 mb-3">
                Databron
              </h2>
              <p className="text-xs text-g300 opacity-30 leading-relaxed">
                Data afkomstig uit de Basisregistratie Adressen en Gebouwen (BAG) via PDOK.
                Bijgewerkt op {new Date(property.created_at).toLocaleDateString('nl-NL')}.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}