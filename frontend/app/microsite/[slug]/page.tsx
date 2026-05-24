'use client'

import { useState, useEffect } from 'react'
import { MapPin, Home, Phone, Mail, List, Map } from 'lucide-react'
import dynamic from 'next/dynamic'
import BidModal from '@/components/bidding/BidModal'
import ViewingModal from '@/components/viewings/ViewingModal'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const PropertyMap = dynamic(() => import('@/components/map/PropertyMap'), { ssr: false })

const AGENCY = {
  name: 'Stadsmakelaars', tagline_nl: 'Meer dan een makelaar.', tagline_en: 'More than an agent.',
  description_nl: 'Bij Stadsmakelaars weet je precies waar je aan toe bent. Geen verborgen kosten, geen verrassingen.',
  description_en: 'At Stadsmakelaars you know exactly where you stand. No hidden fees, no surprises.',
  phone: '085 080 55 98', email: 'info@stadsmakelaars.nl',
  address: 'Hooghuisstraat 31A, Eindhoven', since: '2008', userId: 1,
}

const GRADIENTS = [
  'from-emerald-900 via-teal-800 to-emerald-950',
  'from-teal-900 via-emerald-800 to-slate-900',
  'from-green-900 via-emerald-700 to-teal-950',
]

const MOCK_LISTINGS = [
  { id: 'm1', street: 'Geldropseweg 90', city: 'Eindhoven', price: 695000, area_m2: 152, bedrooms: 2, energy_label: 'C', status_nl: 'Beschikbaar', status_en: 'Available', type: 'Eengezinswoning', score: 74, gradient: GRADIENTS[0], latitude: 51.4521, longitude: 5.4932, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null },
  { id: 'm2', street: 'Dommelhoefstraat 7', city: 'Eindhoven', price: 745000, area_m2: 106, bedrooms: 3, energy_label: 'B', status_nl: 'Beschikbaar', status_en: 'Available', type: '2-onder-1-kap', score: 71, gradient: GRADIENTS[1], latitude: 51.4389, longitude: 5.4712, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null },
  { id: 'm3', street: 'Achterbeekseweg 2a', city: 'Eindhoven', price: 1650000, area_m2: 400, bedrooms: 6, energy_label: 'A', status_nl: 'Beschikbaar', status_en: 'Available', type: 'Villa', score: 82, gradient: GRADIENTS[2], latitude: 51.4198, longitude: 5.4156, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null },
  { id: 'm4', street: 'Biezenkuilen 50', city: 'Veldhoven', price: 569000, area_m2: 136, bedrooms: 4, energy_label: 'C', status_nl: 'Verkocht', status_en: 'Sold', type: '2-onder-1-kap', score: 68, gradient: GRADIENTS[0], latitude: 51.4089, longitude: 5.4089, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null },
  { id: 'm5', street: 'Hendrik Veenemanstraat 10', city: 'Son en Breugel', price: 595000, area_m2: 123, bedrooms: 3, energy_label: 'B', status_nl: 'Verkocht', status_en: 'Sold', type: '2-onder-1-kap', score: 70, gradient: GRADIENTS[1], latitude: 51.5089, longitude: 5.5089, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null },
]

function formatPrice(p: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p) }
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#2fc586' : score >= 60 ? '#c47c1a' : '#b84033'
  return <div className="absolute top-3 right-3 px-2.5 py-1.5 backdrop-blur-md border" style={{ background: 'rgba(6,26,17,0.75)', borderColor: color + '40' }}>
    <span className="font-mono text-sm font-bold" style={{ color }}>{score}</span>
    <span className="text-white/25 text-xs font-mono"> /100</span>
  </div>
}

export default function AgencyMicrosite({ params }: { params: { slug: string } }) {
  const { lang } = useLanguage()
  const nl = lang === 'nl'

  const [filter,         setFilter]         = useState<'all' | 'available' | 'sold'>('all')
  const [view,           setView]           = useState<'list' | 'map'>('list')
  const [dbListings,     setDbListings]     = useState<any[]>([])
  const [loading,        setLoading]        = useState(true)
  const [selected,       setSelected]       = useState<any>(null)
  const [bidListing,     setBidListing]     = useState<any>(null)
  const [viewingListing, setViewingListing] = useState<any>(null)
  const [favourites,     setFavourites]     = useState<Set<string>>(new Set())

  useEffect(() => {
    const favs = Object.keys(localStorage).filter(k => k.startsWith('fav_')).map(k => k.replace('fav_', ''))
    setFavourites(new Set(favs))
  }, [])

  useEffect(() => {
    fetch(`http://localhost:8000/api/listings/public/${AGENCY.userId}`)
      .then(r => r.json())
      .then(data => {
        setDbListings((data.listings || []).map((l: any, i: number) => ({
          id: `db-${l.id}`, street: l.property.street, city: l.property.city,
          price: l.asking_price, area_m2: l.property.area_m2 || 0, bedrooms: 0,
          energy_label: l.property.energy_label || 'Unknown',
          status_nl: l.status === 'active' ? 'Beschikbaar' : 'Verkocht',
          status_en: l.status === 'active' ? 'Available' : 'Sold',
          type: l.property.property_type || 'Woning', score: 72,
          gradient: GRADIENTS[i % GRADIENTS.length], isReal: true,
          isSubmission: false, submissionId: null,
          latitude: l.property.latitude, longitude: l.property.longitude,
          bid_count: 0, highest_bid: null, bid_deadline: null, urgency: null,
        })))
      }).catch(() => {})

    fetch(`http://localhost:8000/api/submissions/public/${AGENCY.userId}`)
      .then(r => r.json())
      .then(data => {
        setDbListings(prev => [...prev, ...(data.listings || []).map((l: any, i: number) => ({
          id: `sub-${l.id}`, submissionId: l.id, street: l.property.street, city: l.property.city,
          price: l.asking_price || 0, area_m2: l.property.area_m2 || 0, bedrooms: 0,
          energy_label: l.property.energy_label || 'Unknown',
          status_nl: 'Beschikbaar', status_en: 'Available',
          type: l.property.property_type || 'Woning', score: 72,
          gradient: GRADIENTS[i % GRADIENTS.length], isReal: true, isSubmission: true,
          bid_count: l.bid_count || 0, highest_bid: l.highest_bid || null,
          bid_deadline: l.bid_deadline || null, urgency: l.urgency,
          latitude: l.property.latitude, longitude: l.property.longitude, reference: l.reference,
        }))])
      }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Use status based on current language
  const allListings = [...dbListings, ...MOCK_LISTINGS].map(l => ({
    ...l, status: nl ? l.status_nl : l.status_en,
  }))

  const availableStatus = nl ? 'Beschikbaar' : 'Available'
  const soldStatus      = nl ? 'Verkocht'    : 'Sold'
  const availableCount  = allListings.filter(l => l.status === availableStatus).length
  const soldCount       = allListings.filter(l => l.status === soldStatus).length

  const filtered = allListings.filter(l => {
    if (filter === 'available') return l.status === availableStatus
    if (filter === 'sold')      return l.status === soldStatus
    return true
  })

  const mapProperties = allListings.filter(l => l.latitude && l.longitude).map(l => ({
    id: typeof l.id === 'string' ? parseInt(l.id.replace('db-', '').replace('sub-', '')) || 0 : l.id,
    street: l.street, house_number: '', city: l.city,
    latitude: l.latitude, longitude: l.longitude,
    woz_value: null, area_m2: l.area_m2 || null, property_type: l.type,
  }))

  function handleBidSuccess(listing: any, result: any) {
    setDbListings(prev => prev.map(l => l.id === listing.id ? { ...l, bid_count: result.bid_count, highest_bid: result.highest_bid } : l))
    setBidListing(null)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a1f12' }}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full blur-3xl opacity-20" style={{ width: '800px', height: '600px', top: '-200px', left: '-200px', background: 'radial-gradient(circle, #2fc586 0%, transparent 70%)' }} />
        <div className="absolute rounded-full blur-3xl opacity-10" style={{ width: '600px', height: '600px', bottom: '-100px', right: '-100px', background: 'radial-gradient(circle, #1e7d55 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(47,197,134,1) 1px, transparent 1px), linear-gradient(90deg, rgba(47,197,134,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(5,15,8,0.85) 80%)' }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 border-b" style={{ borderColor: 'rgba(47,197,134,0.12)', background: 'rgba(5,15,8,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base text-white tracking-tight">Groun<span style={{ color: '#2fc586' }}>dr</span></span>
            <span className="text-white/20 text-xs mx-2">·</span>
            <span className="text-white/30 text-xs">{AGENCY.name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <LanguageToggle />
            <a href="/login" className="hover:text-white/70 transition-colors cursor-pointer">{nl ? 'Makelaar login' : 'Agent login'}</a>
            <span className="text-white/10">|</span>
            <a href="/dossier/login" className="hover:text-white/70 transition-colors cursor-pointer">{nl ? 'Mijn dossier' : 'My dossier'}</a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-16">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-semibold tracking-widest uppercase"
              style={{ background: 'rgba(47,197,134,0.08)', border: '1px solid rgba(47,197,134,0.2)', color: '#2fc586' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#2fc586' }}/>
              {nl ? `Actief in Eindhoven e.o. - Sinds ${AGENCY.since}` : `Active in Eindhoven area - Since ${AGENCY.since}`}
            </div>
            <h1 className="font-display font-bold leading-none tracking-tight mb-6" style={{ fontSize: 'clamp(40px, 6vw, 72px)', color: 'white' }}>
              {nl ? AGENCY.tagline_nl : AGENCY.tagline_en}
            </h1>
            <p className="text-base leading-relaxed max-w-lg mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {nl ? AGENCY.description_nl : AGENCY.description_en}
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: <Phone size={13} />, label: AGENCY.phone },
                { icon: <Mail size={13} />,  label: AGENCY.email },
                { icon: <MapPin size={13} />, label: AGENCY.address },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
                  <span style={{ color: '#2fc586' }}>{item.icon}</span>{item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-8 flex-shrink-0 ml-12">
            {[
              { val: AGENCY.since,               lbl: nl ? 'Actief sinds' : 'Active since' },
              { val: String(availableCount),     lbl: nl ? 'Te koop'      : 'For sale' },
              { val: String(allListings.length), lbl: nl ? 'Totaal aanbod': 'Total listings' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-mono font-semibold leading-none mb-1" style={{ fontSize: '36px', color: i === 1 ? '#2fc586' : 'white' }}>{s.val}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listings section */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pb-20">

        {/* Filter + view toggle */}
        <div className="flex items-center justify-between mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-0">
            {[
              { key: 'all',       label: nl ? 'Alle woningen' : 'All properties', count: allListings.length },
              { key: 'available', label: nl ? 'Te koop'       : 'For sale',       count: availableCount },
              { key: 'sold',      label: nl ? 'Verkocht'      : 'Sold',           count: soldCount },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key as any)}
                className="px-5 py-3 text-sm font-semibold transition-all"
                style={{ borderBottom: filter === tab.key ? '2px solid #2fc586' : '2px solid transparent', color: filter === tab.key ? '#2fc586' : 'rgba(255,255,255,0.3)', marginBottom: '-1px' }}>
                {tab.label}<span className="ml-2 font-mono text-xs opacity-50">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-1 p-1 mb-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { key: 'list', icon: <List size={13} />, label: nl ? 'Lijst' : 'List' },
              { key: 'map',  icon: <Map size={13} />,  label: nl ? 'Kaart' : 'Map' },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key as any)}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold transition-all"
                style={{ background: view === v.key ? 'rgba(47,197,134,0.15)' : 'transparent', color: view === v.key ? '#2fc586' : 'rgba(255,255,255,0.3)', border: view === v.key ? '1px solid rgba(47,197,134,0.3)' : '1px solid transparent' }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>{nl ? 'Laden...' : 'Loading...'}</div>}

        {!loading && view === 'list' && (
          <div className="grid grid-cols-3 gap-5">
            {filtered.map((listing, index) => (
              <div key={`${listing.id}-${index}`}
                className="group cursor-pointer transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.border = '1px solid rgba(47,197,134,0.25)'; el.style.boxShadow = '0 8px 40px rgba(47,197,134,0.1)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.border = '1px solid rgba(255,255,255,0.07)'; el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)' }}
              >
                <div className={`h-44 bg-gradient-to-br ${listing.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)' }}/>
                  <div className="absolute inset-0 flex items-center justify-center"><Home size={36} className="opacity-15 text-white"/></div>
                  {listing.isReal && (
                    <div className="absolute top-3 left-16 px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(47,197,134,0.2)', color: '#2fc586', border: '1px solid rgba(47,197,134,0.3)' }}>Live</div>
                  )}
                  <div className="absolute top-3 left-3 px-2.5 py-1 text-xs font-bold tracking-wide"
                    style={listing.status === availableStatus
                      ? { background: '#2fc586', color: '#061a11' }
                      : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}>
                    {listing.status}
                  </div>
                  <ScoreBadge score={listing.score}/>
                  {listing.urgency && listing.urgency !== 'normal' && (
                    <div className="absolute bottom-3 left-3 px-2 py-0.5 text-xs font-bold"
                      style={{ background: listing.urgency === 'asap' ? '#b84033' : '#c47c1a', color: 'white' }}>
                      {listing.urgency === 'asap' ? (nl ? 'Moet weg' : 'Must go') : 'Urgent'}
                    </div>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      const key = `fav_${listing.id}`
                      const isFav = favourites.has(listing.id)
                      if (isFav) { localStorage.removeItem(key); setFavourites(prev => { const s = new Set(prev); s.delete(listing.id); return s }) }
                      else { localStorage.setItem(key, '1'); setFavourites(prev => new Set([...prev, listing.id])) }
                    }}
                    className="absolute bottom-3 right-3" style={{ zIndex: 10 }}>
                    <span style={{ fontSize: '18px' }}>{favourites.has(listing.id) ? '❤️' : '🤍'}</span>
                  </button>
                </div>

                <div className="p-5">
                  <div className="font-display font-bold text-white text-base mb-0.5 leading-tight">{listing.street}</div>
                  <div className="flex items-center gap-1 text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}><MapPin size={10}/> {listing.city}</div>

                  {listing.price > 0 ? (
                    <div className="font-mono font-semibold mb-2" style={{ fontSize: '20px', color: 'white', letterSpacing: '-0.02em' }}>{formatPrice(listing.price)}</div>
                  ) : (
                    <div className="font-semibold mb-2 text-sm" style={{ color: 'rgba(47,197,134,0.7)' }}>{nl ? 'Open bieding' : 'Open bid'}</div>
                  )}

                  {listing.area_m2 > 0 && (
                    <div className="text-xs mb-2 font-mono" style={{ color: 'rgba(47,197,134,0.6)' }}>
                      {listing.price > 0 ? `${formatPrice(Math.round(listing.price / listing.area_m2))} / m²` : `${listing.area_m2} m²`}
                    </div>
                  )}

                  <div className="flex gap-3 text-xs mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {listing.area_m2 > 0 && <span>{listing.area_m2} m²</span>}
                    {listing.bedrooms > 0 && <><span>·</span><span>{listing.bedrooms} {nl ? 'slaapkamers' : 'bedrooms'}</span></>}
                  </div>

                  {listing.status === availableStatus && (
                    <div className="pt-3 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {listing.isSubmission && (
                        <div className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          <span className="font-bold" style={{ color: 'rgba(47,197,134,0.9)' }}>{listing.bid_count}</span> {nl ? 'biedingen' : 'bids'}
                          {listing.highest_bid && <span> · max <span className="font-mono" style={{ color: '#2fc586' }}>{formatPrice(listing.highest_bid)}</span></span>}
                          {listing.bid_deadline && (() => {
                            const diff = new Date(listing.bid_deadline).getTime() - Date.now()
                            if (diff <= 0) return <div className="mt-1 font-semibold" style={{ color: '#b84033' }}>⏱ {nl ? 'Biedingstermijn verlopen' : 'Bidding expired'}</div>
                            const days = Math.floor(diff / 86400000), hours = Math.floor((diff % 86400000) / 3600000), mins = Math.floor((diff % 3600000) / 60000)
                            const label = days > 0 ? `${days}d ${hours}u` : hours > 0 ? `${hours}u ${mins}m` : `${mins}m`
                            return <div className="mt-1 font-semibold" style={{ color: '#c47c1a' }}>⏱ {nl ? `Nog ${label} om te bieden` : `${label} left to bid`}</div>
                          })()}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {listing.isSubmission && (
                          <button onClick={e => { e.stopPropagation(); setBidListing(listing) }}
                            className="flex-1 text-xs font-bold py-1.5" style={{ background: '#2fc586', color: '#061a11' }}>
                            {nl ? 'Bied nu' : 'Bid now'}
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); setViewingListing(listing) }}
                          className="flex-1 text-xs font-semibold py-1.5"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          📅 {nl ? 'Bezichtiging' : 'Viewing'}
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(`${window.location.origin}/microsite/${params.slug}?listing=${listing.id}`)
                            alert(nl ? 'Link gekopieerd!' : 'Link copied!')
                          }}
                          className="text-xs font-semibold py-1.5 px-2"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                          title={nl ? 'Kopieer link' : 'Copy link'}>
                          🔗
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && view === 'map' && (
          <div className="relative" style={{ height: '600px' }}>
            <div className="w-full h-full" style={{ border: '1px solid rgba(47,197,134,0.15)' }}>
              <PropertyMap properties={mapProperties} onSelect={prop => setSelected(prop)} center={[5.4697, 51.4416]} zoom={12} />
            </div>
            {selected && (
              <div className="absolute top-4 left-4 p-4 w-64" style={{ background: 'rgba(14,59,40,0.95)', border: '1px solid rgba(47,197,134,0.3)', backdropFilter: 'blur(16px)' }}>
                <div className="font-display font-bold text-white mb-1">{selected.street} {selected.house_number}</div>
                <div className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.city}</div>
                {selected.area_m2 && <div className="text-xs" style={{ color: 'rgba(113,221,175,0.7)' }}>{selected.area_m2} m²</div>}
                <button onClick={() => setSelected(null)} className="mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{nl ? 'Sluiten' : 'Close'}</button>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 p-8 flex items-center justify-between" style={{ background: 'rgba(47,197,134,0.05)', border: '1px solid rgba(47,197,134,0.15)', backdropFilter: 'blur(16px)' }}>
          <div>
            <div className="font-display font-bold text-xl mb-1" style={{ color: 'white' }}>
              {nl ? 'Klaar om uw woning te verkopen?' : 'Ready to sell your property?'}
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {nl ? 'Gratis waardebepaling - Geen verborgen kosten - Resultaatgericht' : 'Free valuation - No hidden fees - Results-driven'}
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button onClick={() => window.location.href = '/submit/1'}
              className="flex items-center gap-2 font-bold px-6 py-3 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(47,197,134,0.3)', color: '#2fc586' }}>
              + {nl ? 'Woning aanmelden' : 'Submit property'}
            </button>
            <button className="flex items-center gap-2 font-bold px-6 py-3 text-sm" style={{ background: '#2fc586', color: '#061a11' }}>
              <Phone size={14}/> {AGENCY.phone}
            </button>
            <button className="flex items-center gap-2 font-semibold px-6 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              <Mail size={14}/> {AGENCY.email}
            </button>
          </div>
        </div>
      </div>

      {bidListing && (
        <BidModal
          submissionId={bidListing.submissionId || parseInt(String(bidListing.id).replace('sub-', ''))}
          street={bidListing.street} city={bidListing.city}
          askingPrice={bidListing.price > 0 ? bidListing.price : null}
          showPrice={bidListing.price > 0} bidDeadline={bidListing.bid_deadline || null}
          onClose={() => setBidListing(null)} onSuccess={(result) => handleBidSuccess(bidListing, result)}
        />
      )}

      {viewingListing && (
        <ViewingModal
          makelaarId={AGENCY.userId} submissionId={viewingListing.submissionId}
          street={viewingListing.street} city={viewingListing.city}
          onClose={() => setViewingListing(null)}
        />
      )}
    </div>
  )
}