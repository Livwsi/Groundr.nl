'use client'

import { useState, useEffect } from 'react'
import { MapPin, Home, Phone, Mail, List, Map, Calendar, Link2, Heart, Clock, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import BidModal from '@/components/bidding/BidModal'
import ViewingModal from '@/components/viewings/ViewingModal'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const PropertyMap = dynamic(() => import('@/components/map/PropertyMap'), { ssr: false })

const AGENCY = {
  name:           'Stadsmakelaars',
  tagline_nl:     'Meer dan een makelaar.',
  tagline_en:     'More than an agent.',
  description_nl: 'Bij Stadsmakelaars weet je precies waar je aan toe bent. Geen verborgen kosten, geen verrassingen. Wij regelen de verkoop van jouw woning op een persoonlijke, transparante manier.',
  description_en: 'At Stadsmakelaars you know exactly where you stand. No hidden fees, no surprises. We handle your sale in a personal, transparent way.',
  phone:          '085 080 55 98',
  email:          'info@stadsmakelaars.nl',
  address:        'Hooghuisstraat 31A, Eindhoven',
  since:          '2008',
  userId:         1,
}

const IMG_GRADIENTS = [
  'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)',
  'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
  'linear-gradient(135deg, #fef9c3 0%, #fde047 100%)',
  'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)',
  'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%)',
]

const MOCK_LISTINGS = [
  { id: 'm1', street: 'Geldropseweg 90',           city: 'Eindhoven',    price: 695000,   area_m2: 152, bedrooms: 2, energy_label: 'C', status_nl: 'Beschikbaar', status_en: 'Available', type: 'Eengezinswoning', score: 74, imgGradient: IMG_GRADIENTS[0], latitude: 51.4521, longitude: 5.4932, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
  { id: 'm2', street: 'Dommelhoefstraat 7',         city: 'Eindhoven',    price: 745000,   area_m2: 106, bedrooms: 3, energy_label: 'B', status_nl: 'Beschikbaar', status_en: 'Available', type: '2-onder-1-kap',  score: 71, imgGradient: IMG_GRADIENTS[1], latitude: 51.4389, longitude: 5.4712, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
  { id: 'm3', street: 'Achterbeekseweg 2a',         city: 'Eindhoven',    price: 1650000,  area_m2: 400, bedrooms: 6, energy_label: 'A', status_nl: 'Beschikbaar', status_en: 'Available', type: 'Villa',          score: 82, imgGradient: IMG_GRADIENTS[2], latitude: 51.4198, longitude: 5.4156, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
  { id: 'm4', street: 'Biezenkuilen 50',            city: 'Veldhoven',    price: 569000,   area_m2: 136, bedrooms: 4, energy_label: 'C', status_nl: 'Verkocht',    status_en: 'Sold',      type: '2-onder-1-kap',  score: 68, imgGradient: IMG_GRADIENTS[3], latitude: 51.4089, longitude: 5.4089, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
  { id: 'm5', street: 'Hendrik Veenemanstraat 10',  city: 'Son en Breugel',price: 595000,  area_m2: 123, bedrooms: 3, energy_label: 'B', status_nl: 'Verkocht',    status_en: 'Sold',      type: '2-onder-1-kap',  score: 70, imgGradient: IMG_GRADIENTS[4], latitude: 51.5089, longitude: 5.5089, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
]

function formatPrice(p: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p)
}

// ── Style constants ───────────────────────────────────────
const S = {
  bg:       '#F4F6F9',
  surface:  '#FFFFFF',
  border:   '#E2E5EA',
  t1:       '#0B1320',
  t2:       '#44546A',
  t3:       '#8A9BB0',
  green:    '#059669',
  greenLt:  '#ECFDF5',
  greenTx:  '#047857',
  greenRim: 'rgba(5,150,105,0.2)',
  amber:    '#D97706',
  amberLt:  '#FFFBEB',
  red:      '#DC2626',
  shadow:   '0 1px 3px rgba(11,19,32,0.06)',
  shadowMd: '0 2px 12px rgba(11,19,32,0.08)',
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
          energy_label: l.property.energy_label || '—',
          status_nl: l.status === 'active' ? 'Beschikbaar' : 'Verkocht',
          status_en: l.status === 'active' ? 'Available'   : 'Sold',
          type: l.property.property_type || 'Woning', score: 72,
          imgGradient: IMG_GRADIENTS[i % IMG_GRADIENTS.length],
          isReal: true, isSubmission: false, submissionId: null,
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
          energy_label: l.property.energy_label || '—',
          status_nl: 'Beschikbaar', status_en: 'Available',
          type: l.property.property_type || 'Woning', score: 72,
          imgGradient: IMG_GRADIENTS[i % IMG_GRADIENTS.length],
          isReal: true, isSubmission: true,
          bid_count: l.bid_count || 0, highest_bid: l.highest_bid || null,
          bid_deadline: l.bid_deadline || null, urgency: l.urgency,
          latitude: l.property.latitude, longitude: l.property.longitude, reference: l.reference,
        }))])
      }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const allListings     = [...dbListings, ...MOCK_LISTINGS].map(l => ({ ...l, status: nl ? l.status_nl : l.status_en }))
  const availableStatus = nl ? 'Beschikbaar' : 'Available'
  const soldStatus      = nl ? 'Verkocht'    : 'Sold'
  const availableCount  = allListings.filter(l => l.status === availableStatus).length
  const soldCount       = allListings.filter(l => l.status === soldStatus).length
  const filtered        = allListings.filter(l => filter === 'all' ? true : filter === 'available' ? l.status === availableStatus : l.status === soldStatus)

  const mapProperties = allListings.filter(l => l.latitude && l.longitude).map(l => ({
    id: typeof l.id === 'string' ? parseInt(l.id.replace('db-','').replace('sub-','')) || 0 : l.id,
    street: l.street, house_number: '', city: l.city,
    latitude: l.latitude, longitude: l.longitude,
    woz_value: null, area_m2: l.area_m2 || null, property_type: l.type,
  }))

  function toggleFav(id: string) {
    const key = `fav_${id}`
    if (favourites.has(id)) {
      localStorage.removeItem(key)
      setFavourites(prev => { const s = new Set(prev); s.delete(id); return s })
    } else {
      localStorage.setItem(key, '1')
      setFavourites(prev => new Set([...prev, id]))
    }
  }

  function handleBidSuccess(listing: any, result: any) {
    setDbListings(prev => prev.map(l => l.id === listing.id ? { ...l, bid_count: result.bid_count, highest_bid: result.highest_bid } : l))
    setBidListing(null)
  }

  function scoreColor(s: number) { return s >= 75 ? S.greenTx : s >= 60 ? S.amber : S.red }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, boxShadow: S.shadow, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Logo mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', background: S.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              </div>
              <span style={{ fontWeight: 600, fontSize: '16px', color: S.t1 }}>Groundr</span>
            </div>
            <span style={{ color: S.border, fontSize: '16px' }}>·</span>
            <span style={{ fontSize: '13px', color: S.t3 }}>{AGENCY.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <LanguageToggle />
            <a href="/login" style={{ fontSize: '13px', color: S.t2, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = S.t1)}
              onMouseLeave={e => (e.currentTarget.style.color = S.t2)}>
              {nl ? 'Makelaar login' : 'Agent login'}
            </a>
            <span style={{ color: S.border }}>|</span>
            <a href="/dossier/login" style={{ fontSize: '13px', color: S.t2, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = S.t1)}
              onMouseLeave={e => (e.currentTarget.style.color = S.t2)}>
              {nl ? 'Mijn dossier' : 'My dossier'}
            </a>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div style={{
        background: S.surface,
        borderBottom: `1px solid ${S.border}`,
        boxShadow: S.shadow,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 32px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '40px' }}>

            {/* Left — agency info */}
            <div style={{ maxWidth: '600px' }}>
              {/* Active badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: S.greenLt, border: `1px solid ${S.greenRim}`, color: S.greenTx, fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '20px' }}>
                <span style={{ width: '6px', height: '6px', background: S.green, display: 'inline-block' }}/>
                {nl ? `Actief in Eindhoven e.o. · Sinds ${AGENCY.since}` : `Active in Eindhoven · Since ${AGENCY.since}`}
              </div>

              <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 600, color: S.t1, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '16px' }}>
                {nl ? AGENCY.tagline_nl : AGENCY.tagline_en}
              </h1>

              <p style={{ fontSize: '15px', color: S.t2, lineHeight: 1.7, marginBottom: '28px', maxWidth: '480px' }}>
                {nl ? AGENCY.description_nl : AGENCY.description_en}
              </p>

              {/* Contact chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { icon: <Phone size={13} />, label: AGENCY.phone, href: `tel:${AGENCY.phone.replace(/\s/g,'')}` },
                  { icon: <Mail size={13} />,  label: AGENCY.email, href: `mailto:${AGENCY.email}` },
                  { icon: <MapPin size={13} />, label: AGENCY.address, href: '#' },
                ].map((item, i) => (
                  <a key={i} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '7px 12px', background: S.surface, border: `1px solid ${S.border}`,
                    fontSize: '12.5px', color: S.t2, textDecoration: 'none',
                    boxShadow: S.shadow, transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = S.green; e.currentTarget.style.color = S.greenTx }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.t2 }}>
                    <span style={{ color: S.green }}>{item.icon}</span>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Right — stats */}
            <div style={{ display: 'flex', gap: '0', border: `1px solid ${S.border}`, boxShadow: S.shadow, flexShrink: 0 }}>
              {[
                { val: AGENCY.since,               label: nl ? 'Actief sinds' : 'Active since', highlight: false },
                { val: String(availableCount),     label: nl ? 'Te koop'      : 'For sale',      highlight: true  },
                { val: String(allListings.length), label: nl ? 'Totaal aanbod': 'Total listings', highlight: false },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '24px 32px', textAlign: 'center', background: S.surface,
                  borderRight: i < 2 ? `1px solid ${S.border}` : 'none',
                  minWidth: '120px',
                }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '32px', fontWeight: 500, color: s.highlight ? S.green : S.t1, lineHeight: 1, letterSpacing: '-1px' }}>
                    {s.val}
                  </div>
                  <div style={{ fontSize: '11.5px', color: S.t3, marginTop: '6px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── LISTINGS ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 32px 64px' }}>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${S.border}`, marginBottom: '28px' }}>
          <div style={{ display: 'flex' }}>
            {[
              { key: 'all',       label: nl ? 'Alle woningen' : 'All properties', count: allListings.length },
              { key: 'available', label: nl ? 'Te koop'       : 'For sale',       count: availableCount },
              { key: 'sold',      label: nl ? 'Verkocht'      : 'Sold',           count: soldCount },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key as any)} style={{
                padding: '0 16px', height: '44px', fontSize: '13.5px', fontWeight: filter === tab.key ? 500 : 400,
                color: filter === tab.key ? S.t1 : S.t3,
                background: 'none', border: 'none', borderBottom: filter === tab.key ? `2px solid ${S.green}` : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                marginBottom: '-1px', transition: 'color 0.15s',
              }}>
                {tab.label}
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: S.t3 }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '0', border: `1px solid ${S.border}`, marginBottom: '1px', boxShadow: S.shadow }}>
            {[
              { key: 'list', icon: <List size={13} />,  label: nl ? 'Lijst' : 'List' },
              { key: 'map',  icon: <Map size={13} />,   label: nl ? 'Kaart' : 'Map' },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key as any)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0 14px', height: '32px', fontSize: '12.5px', fontWeight: 500,
                background: view === v.key ? S.greenLt : S.surface,
                color: view === v.key ? S.greenTx : S.t3,
                border: 'none', borderRight: v.key === 'list' ? `1px solid ${S.border}` : 'none',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px', color: S.t3, fontSize: '13px' }}>
            {nl ? 'Laden...' : 'Loading...'}
          </div>
        )}

        {/* LIST VIEW */}
        {!loading && view === 'list' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {filtered.map((listing, idx) => {
              const isFav      = favourites.has(listing.id)
              const isAvail    = listing.status === availableStatus
              const isSold     = !isAvail

              return (
                <div key={`${listing.id}-${idx}`} style={{
                  background: S.surface, border: `1px solid ${S.border}`,
                  boxShadow: S.shadow,
                  transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
                  cursor: 'pointer', overflow: 'hidden',
                  opacity: isSold ? 0.75 : 1,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.boxShadow = `0 8px 24px rgba(5,150,105,0.12), 0 2px 8px rgba(11,19,32,0.08)`
                  el.style.transform = 'translateY(-2px)'
                  el.style.borderColor = S.greenRim
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.boxShadow = S.shadow
                  el.style.transform = 'translateY(0)'
                  el.style.borderColor = S.border
                }}>

                  {/* Image area */}
                  <div style={{ height: '160px', background: listing.imgGradient, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Home size={48} color="rgba(0,0,0,0.1)" />

                    {/* Status badge */}
                    <div style={{
                      position: 'absolute', top: '10px', left: '10px',
                      padding: '3px 8px', fontSize: '10.5px', fontWeight: 500,
                      background: isAvail ? S.green : 'rgba(255,255,255,0.85)',
                      color: isAvail ? 'white' : S.t2,
                      border: isAvail ? 'none' : `1px solid ${S.border}`,
                    }}>
                      {listing.status}
                    </div>

                    {/* Live badge */}
                    {listing.isReal && (
                      <div style={{ position: 'absolute', top: '10px', left: isAvail ? '82px' : '62px', padding: '3px 8px', fontSize: '10px', fontWeight: 600, background: S.greenLt, color: S.greenTx, border: `1px solid ${S.greenRim}` }}>
                        Live
                      </div>
                    )}

                    {/* Score */}
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      padding: '3px 8px', background: 'rgba(255,255,255,0.9)',
                      border: `1px solid ${S.border}`,
                      fontSize: '11.5px', fontWeight: 500, fontFamily: "'DM Mono', monospace",
                      color: scoreColor(listing.score), display: 'flex', alignItems: 'center', gap: '3px',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      {listing.score}
                    </div>

                    {/* Urgency */}
                    {listing.urgency && listing.urgency !== 'normal' && (
                      <div style={{
                        position: 'absolute', bottom: '10px', left: '10px',
                        padding: '3px 8px', fontSize: '10.5px', fontWeight: 600,
                        background: listing.urgency === 'asap' ? S.red : S.amber, color: 'white',
                      }}>
                        {listing.urgency === 'asap' ? (nl ? 'Moet weg' : 'Must go') : 'Urgent'}
                      </div>
                    )}

                    {/* Favourite */}
                    <button onClick={e => { e.stopPropagation(); toggleFav(listing.id) }} style={{
                      position: 'absolute', bottom: '10px', right: '10px',
                      width: '28px', height: '28px', background: 'rgba(255,255,255,0.9)',
                      border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10,
                    }}>
                      <Heart size={14} fill={isFav ? S.red : 'none'} color={isFav ? S.red : S.t3} />
                    </button>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: S.t1, marginBottom: '2px' }}>{listing.street}</div>
                    <div style={{ fontSize: '12px', color: S.t3, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={10} />{listing.city}
                    </div>

                    {listing.price > 0 ? (
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '19px', fontWeight: 500, color: S.t1, letterSpacing: '-0.3px' }}>
                        {formatPrice(listing.price)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '13.5px', fontWeight: 500, color: S.greenTx }}>
                        {nl ? 'Open bieding' : 'Open bid'}
                      </div>
                    )}

                    {listing.area_m2 > 0 && listing.price > 0 && (
                      <div style={{ fontSize: '11.5px', color: S.greenTx, fontWeight: 500, marginTop: '2px', marginBottom: '10px' }}>
                        {formatPrice(Math.round(listing.price / listing.area_m2))} / m²
                      </div>
                    )}

                    {/* Specs */}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: S.t3, paddingBottom: '12px', marginBottom: '12px', borderBottom: `1px solid ${S.border}` }}>
                      {listing.area_m2 > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                          {listing.area_m2} m²
                        </span>
                      )}
                      {listing.bedrooms > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h20v16H2z"/></svg>
                          {listing.bedrooms} {nl ? 'slaapkamers' : 'bedrooms'}
                        </span>
                      )}
                      {listing.energy_label && listing.energy_label !== '—' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          {listing.energy_label}
                        </span>
                      )}
                    </div>

                    {/* Bid info */}
                    {listing.isSubmission && isAvail && (
                      <div style={{ fontSize: '12px', color: S.t2, marginBottom: '10px' }}>
                        <span style={{ fontWeight: 600, color: S.green }}>{listing.bid_count}</span> {nl ? 'biedingen' : 'bids'}
                        {listing.highest_bid && <span> · max <span style={{ fontFamily: 'monospace', color: S.greenTx, fontWeight: 500 }}>{formatPrice(listing.highest_bid)}</span></span>}
                        {listing.bid_deadline && (() => {
                          const diff = new Date(listing.bid_deadline).getTime() - Date.now()
                          if (diff <= 0) return <div style={{ color: S.red, fontWeight: 500, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} />{nl ? 'Termijn verlopen' : 'Deadline passed'}</div>
                          const days  = Math.floor(diff / 86400000)
                          const hours = Math.floor((diff % 86400000) / 3600000)
                          const mins  = Math.floor((diff % 3600000) / 60000)
                          const label = days > 0 ? `${days}d ${hours}u` : hours > 0 ? `${hours}u ${mins}m` : `${mins}m`
                          return <div style={{ color: S.amber, fontWeight: 500, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} />{nl ? `Nog ${label}` : `${label} left`}</div>
                        })()}
                      </div>
                    )}

                    {/* Actions */}
                    {isAvail && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {listing.isSubmission && (
                          <button onClick={e => { e.stopPropagation(); setBidListing(listing) }} style={{
                            flex: 1, height: '32px', background: S.green, color: 'white',
                            border: `1px solid ${S.green}`, fontSize: '12.5px', fontWeight: 500, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                          }}>
                            {nl ? 'Bied nu' : 'Bid now'}
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); setViewingListing(listing) }} style={{
                          flex: 1, height: '32px', background: S.surface, color: S.t1,
                          border: `1px solid ${S.border}`, fontSize: '12.5px', fontWeight: 500, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = S.green)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}>
                          <Calendar size={12} />{nl ? 'Bezichtiging' : 'Viewing'}
                        </button>
                        <button onClick={e => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(`${window.location.origin}/microsite/${params.slug}?listing=${listing.id}`)
                          alert(nl ? 'Link gekopieerd!' : 'Link copied!')
                        }} style={{
                          width: '32px', height: '32px', background: S.surface, color: S.t3,
                          border: `1px solid ${S.border}`, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title={nl ? 'Kopieer link' : 'Copy link'}>
                          <Link2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MAP VIEW */}
        {!loading && view === 'map' && (
          <div style={{ position: 'relative', height: '600px', border: `1px solid ${S.border}`, boxShadow: S.shadow }}>
            <PropertyMap properties={mapProperties} onSelect={prop => setSelected(prop)} center={[5.4697, 51.4416]} zoom={12} />
            {selected && (
              <div style={{
                position: 'absolute', top: '16px', left: '16px', padding: '16px', width: '240px',
                background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadowMd,
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: S.t1, marginBottom: '3px' }}>{selected.street} {selected.house_number}</div>
                <div style={{ fontSize: '12px', color: S.t3, marginBottom: '10px' }}>{selected.city}</div>
                {selected.area_m2 && <div style={{ fontSize: '12px', color: S.t2 }}>{selected.area_m2} m²</div>}
                <button onClick={() => setSelected(null)} style={{ marginTop: '12px', fontSize: '12px', color: S.t3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {nl ? 'Sluiten' : 'Close'} ×
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CTA BANNER ── */}
        <div style={{
          marginTop: '40px', padding: '32px',
          background: S.surface, border: `1px solid ${S.border}`,
          boxShadow: S.shadow,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: S.t1, marginBottom: '6px' }}>
              {nl ? 'Klaar om uw woning te verkopen?' : 'Ready to sell your property?'}
            </div>
            <p style={{ fontSize: '13.5px', color: S.t2 }}>
              {nl ? 'Gratis waardebepaling · Geen verborgen kosten · Resultaatgericht' : 'Free valuation · No hidden fees · Results-driven'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => window.location.href = '/submit/1'} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              height: '40px', padding: '0 18px',
              background: S.surface, color: S.greenTx,
              border: `1px solid ${S.greenRim}`, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = S.greenLt)}
            onMouseLeave={e => (e.currentTarget.style.background = S.surface)}>
              <ChevronRight size={14} />
              {nl ? 'Woning aanmelden' : 'Submit property'}
            </button>
            <a href={`tel:${AGENCY.phone.replace(/\s/g,'')}`} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              height: '40px', padding: '0 18px',
              background: S.green, color: 'white',
              border: `1px solid ${S.green}`, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
              textDecoration: 'none',
            }}>
              <Phone size={14} />{AGENCY.phone}
            </a>
            <a href={`mailto:${AGENCY.email}`} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              height: '40px', padding: '0 18px',
              background: S.surface, color: S.t1,
              border: `1px solid ${S.border}`, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
              textDecoration: 'none',
            }}>
              <Mail size={14} />{AGENCY.email}
            </a>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', items: 'center', gap: '20px' }}>
            {[
              { label: nl ? 'Privacybeleid' : 'Privacy policy', href: '#' },
              { label: nl ? 'Gebruiksvoorwaarden' : 'Terms', href: '#' },
              { label: 'AVG / GDPR', href: '#' },
              { label: 'Cookies', href: '#' },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: '12px', color: S.t3, textDecoration: 'none', marginRight: '16px' }}
                onMouseEnter={e => (e.currentTarget.style.color = S.t1)}
                onMouseLeave={e => (e.currentTarget.style.color = S.t3)}>
                {l.label}
              </a>
            ))}
          </div>
          <span style={{ fontSize: '12px', color: S.t3 }}>
            © {new Date().getFullYear()} Groundr B.V. · {nl ? 'Gegevens: BAG/PDOK · CBS' : 'Data: BAG/PDOK · CBS'}
          </span>
        </div>
      </div>

      {/* Modals */}
      {bidListing && (
        <BidModal
          submissionId={bidListing.submissionId || parseInt(String(bidListing.id).replace('sub-', ''))}
          street={bidListing.street} city={bidListing.city}
          askingPrice={bidListing.price > 0 ? bidListing.price : null}
          showPrice={bidListing.price > 0} bidDeadline={bidListing.bid_deadline || null}
          onClose={() => setBidListing(null)}
          onSuccess={(result) => handleBidSuccess(bidListing, result)}
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