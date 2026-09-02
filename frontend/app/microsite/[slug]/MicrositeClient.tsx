'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Home, Phone, Mail, List, Map, Calendar, Link2, Heart, Clock, ChevronRight, TrendingDown, Menu, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import BidModal from '@/components/bidding/BidModal'
import ViewingModal from '@/components/viewings/ViewingModal'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const PropertyMap = dynamic(() => import('@/components/map/PropertyMap'), { ssr: false })

const IMG_GRADIENTS = [
  'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)',
  'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
  'linear-gradient(135deg, #fef9c3 0%, #fde047 100%)',
  'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)',
  'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%)',
]

const MOCK_LISTINGS = [
  { id: 'm1', street: 'Geldropseweg 90',          city: 'Eindhoven',      price: 695000,  previous_price: null,   listed_date: new Date(Date.now() - 5  * 86400000).toISOString(), area_m2: 152, bedrooms: 2, energy_label: 'C', status_nl: 'Beschikbaar', status_en: 'Available', type: 'Eengezinswoning', score: 74, imgGradient: IMG_GRADIENTS[0], latitude: 51.4521, longitude: 5.4932, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
  { id: 'm2', street: 'Dommelhoefstraat 7',        city: 'Eindhoven',      price: 745000,  previous_price: 795000, listed_date: new Date(Date.now() - 30 * 86400000).toISOString(), area_m2: 106, bedrooms: 3, energy_label: 'B', status_nl: 'Beschikbaar', status_en: 'Available', type: '2-onder-1-kap',  score: 71, imgGradient: IMG_GRADIENTS[1], latitude: 51.4389, longitude: 5.4712, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
  { id: 'm3', street: 'Achterbeekseweg 2a',        city: 'Eindhoven',      price: 1650000, previous_price: null,   listed_date: new Date(Date.now() - 3  * 86400000).toISOString(), area_m2: 400, bedrooms: 6, energy_label: 'A', status_nl: 'Beschikbaar', status_en: 'Available', type: 'Villa',          score: 82, imgGradient: IMG_GRADIENTS[2], latitude: 51.4198, longitude: 5.4156, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
  { id: 'm4', street: 'Biezenkuilen 50',           city: 'Veldhoven',      price: 569000,  previous_price: 599000, listed_date: new Date(Date.now() - 45 * 86400000).toISOString(), area_m2: 136, bedrooms: 4, energy_label: 'C', status_nl: 'Verkocht',    status_en: 'Sold',      type: '2-onder-1-kap',  score: 68, imgGradient: IMG_GRADIENTS[3], latitude: 51.4089, longitude: 5.4089, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
  { id: 'm5', street: 'Hendrik Veenemanstraat 10', city: 'Son en Breugel',  price: 595000, previous_price: null,   listed_date: new Date(Date.now() - 10 * 86400000).toISOString(), area_m2: 123, bedrooms: 3, energy_label: 'B', status_nl: 'Verkocht',    status_en: 'Sold',      type: '2-onder-1-kap',  score: 70, imgGradient: IMG_GRADIENTS[4], latitude: 51.5089, longitude: 5.5089, bid_count: 0, highest_bid: null, bid_deadline: null, isSubmission: false, submissionId: null, urgency: null, isReal: false },
]

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', red: '#DC2626', blue: '#0891B2',
  shadow: '0 1px 3px rgba(11,19,32,0.06)', shadowMd: '0 2px 12px rgba(11,19,32,0.08)',
}

function formatPrice(p: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p) }
function getDom(d: string | null) { return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0 }
function isNieuw(d: string | null) { return getDom(d) <= 14 }
function isPrijsVerlaagd(p: number, pp: number | null) { return pp !== null && p < pp }
function scoreColor(s: number) { return s >= 75 ? S.greenTx : s >= 60 ? S.amber : S.red }
function domLabel(days: number, nl: boolean) {
  if (days === 0) return nl ? 'Vandaag' : 'Today'
  if (days === 1) return nl ? '1 dag geleden' : '1 day ago'
  return nl ? `${days} dagen geleden` : `${days} days ago`
}

interface Props {
  params: { slug: string }
  initialListings: any[]
  initialSubmissions: any[]
  agency: { name: string; userId: number; phone: string; email: string; address: string; since: string; city: string }
}

export default function MicrositeClient({ params, initialListings, initialSubmissions, agency }: Props) {
  const { lang } = useLanguage()
  const nl = lang === 'nl'

  const [filter,         setFilter]         = useState<'all' | 'available' | 'sold'>('all')
  const [view,           setView]           = useState<'list' | 'map'>('list')
  const [selected,       setSelected]       = useState<any>(null)
  const [bidListing,     setBidListing]     = useState<any>(null)
  const [viewingListing, setViewingListing] = useState<any>(null)
  const [favourites,     setFavourites]     = useState<Set<string>>(new Set())
  const [dbListings,     setDbListings]     = useState<any[]>([])
  const [menuOpen,       setMenuOpen]       = useState(false)

  useEffect(() => {
    const favs = Object.keys(localStorage).filter(k => k.startsWith('fav_')).map(k => k.replace('fav_', ''))
    setFavourites(new Set(favs))
  }, [])

  useEffect(() => {
    const mapped = [
      ...initialListings.map((l: any, i: number) => ({
        id: `db-${l.id}`, street: l.property.street, city: l.property.city,
        price: l.asking_price, area_m2: l.property.area_m2 || 0, bedrooms: 0,
        energy_label: l.property.energy_label || '—',
        status_nl: l.status === 'active' ? 'Beschikbaar' : 'Verkocht',
        status_en: l.status === 'active' ? 'Available' : 'Sold',
        type: l.property.property_type || 'Woning', score: 72,
        imgGradient: IMG_GRADIENTS[i % IMG_GRADIENTS.length],
        isReal: true, isSubmission: false, submissionId: null,
        latitude: l.property.latitude, longitude: l.property.longitude,
        bid_count: 0, highest_bid: null, bid_deadline: null, urgency: null,
        listed_date: l.listed_date || null, previous_price: l.previous_price || null,
      })),
      ...initialSubmissions.map((l: any, i: number) => ({
        id: `sub-${l.id}`, submissionId: l.id, street: l.property.street, city: l.property.city,
        price: l.asking_price || 0, area_m2: l.property.area_m2 || 0, bedrooms: 0,
        energy_label: l.property.energy_label || '—',
        status_nl: 'Beschikbaar', status_en: 'Available',
        type: l.property.property_type || 'Woning', score: 72,
        imgGradient: IMG_GRADIENTS[i % IMG_GRADIENTS.length],
        isReal: true, isSubmission: true,
        bid_count: l.bid_count || 0, highest_bid: l.highest_bid || null,
        bid_deadline: l.bid_deadline || null, urgency: l.urgency,
        latitude: l.property.latitude, longitude: l.property.longitude,
        listed_date: l.created_at || null, previous_price: null,
      })),
    ]
    setDbListings(mapped)
  }, [initialListings, initialSubmissions])

  function toggleFav(id: string) {
    const key = `fav_${id}`
    if (favourites.has(id)) { localStorage.removeItem(key); setFavourites(p => { const s = new Set(p); s.delete(id); return s }) }
    else { localStorage.setItem(key, '1'); setFavourites(p => new Set([...p, id])) }
  }

  function handleBidSuccess(listing: any, result: any) {
    setDbListings(prev => prev.map(l => l.id === listing.id ? { ...l, bid_count: result.bid_count, highest_bid: result.highest_bid } : l))
    setBidListing(null)
  }

  const allListings     = [...dbListings, ...MOCK_LISTINGS].map(l => ({ ...l, status: nl ? l.status_nl : l.status_en }))
  const availableStatus = nl ? 'Beschikbaar' : 'Available'
  const soldStatus      = nl ? 'Verkocht'    : 'Sold'
  const availableCount  = allListings.filter(l => l.status === availableStatus).length
  const soldCount       = allListings.filter(l => l.status === soldStatus).length
  const filtered        = allListings.filter(l => filter === 'all' ? true : filter === 'available' ? l.status === availableStatus : l.status === soldStatus)
  const mapProperties   = allListings.filter(l => l.latitude && l.longitude).map(l => ({
    id: typeof l.id === 'string' ? parseInt(l.id.replace('db-','').replace('sub-','')) || 0 : l.id,
    street: l.street, house_number: '', city: l.city,
    latitude: l.latitude, longitude: l.longitude,
    woz_value: null, area_m2: l.area_m2 || null, property_type: l.type,
  }))

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .ms-nav-links { display: none !important; }
        .ms-hamburger { display: flex !important; }
        .ms-hero-inner { flex-direction: column !important; gap: 20px !important; padding: 28px 16px 24px !important; }
        .ms-hero-h1 { font-size: 28px !important; }
        .ms-stats { width: 100% !important; }
        .ms-stats > div { flex: 1 !important; padding: 14px 8px !important; min-width: 0 !important; }
        .ms-stats .stat-num { font-size: 22px !important; }
        .ms-grid { grid-template-columns: 1fr !important; }
        .ms-contact-chips { flex-direction: column !important; }
        .ms-wrap { padding: 16px 16px 48px !important; }
        .ms-filter-bar { overflow-x: auto !important; }
        .ms-cta { flex-direction: column !important; gap: 14px !important; }
        .ms-cta-btns { flex-wrap: wrap !important; }
        .ms-cta-btns a, .ms-cta-btns button { flex: 1 !important; min-width: 130px !important; justify-content: center !important; }
        .ms-hero-desc { font-size: 13px !important; }
        .ms-hero-p { font-size: 13px !important; }
      }
      @media (min-width: 641px) and (max-width: 1023px) {
        .ms-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      .ms-hamburger { display: none; }
    `}</style>

    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Mobile hamburger overlay */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,19,32,0.5)', zIndex: 150 }} onClick={() => setMenuOpen(false)}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '260px', height: '100vh', background: S.surface, padding: '20px', display: 'flex', flexDirection: 'column', gap: '0', boxShadow: '-4px 0 24px rgba(11,19,32,0.12)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${S.border}` }}>
              <span style={{ fontWeight: 600, color: S.t1 }}>{agency.name}</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3 }}><X size={18}/></button>
            </div>
            {[
              { label: nl ? 'Makelaar login' : 'Agent login', href: '/login' },
              { label: nl ? 'Mijn dossier'  : 'My dossier',  href: '/dossier/login' },
              { label: nl ? 'Woning aanmelden' : 'Submit property', href: '/submit/1' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{ display: 'block', padding: '14px 0', fontSize: '14px', color: S.t2, textDecoration: 'none', borderBottom: `1px solid ${S.border}` }}
                onMouseEnter={e => (e.currentTarget.style.color = S.green)} onMouseLeave={e => (e.currentTarget.style.color = S.t2)}>
                {item.label}
              </a>
            ))}
            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
              <a href={`tel:${agency.phone.replace(/\s/g,'')}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: S.green, color: 'white', textDecoration: 'none', fontWeight: 500, fontSize: '14px' }}>
                <Phone size={15}/>{agency.phone}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, boxShadow: S.shadow, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', background: S.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              </div>
              <span style={{ fontWeight: 600, fontSize: '15px', color: S.t1 }}>Groundr</span>
            </div>
            <span style={{ color: S.border }}>·</span>
            <span style={{ fontSize: '12px', color: S.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{agency.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Desktop links */}
            <div className="ms-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <LanguageToggle />
              <a href="/login" style={{ fontSize: '13px', color: S.t2, textDecoration: 'none' }}>{nl ? 'Makelaar login' : 'Agent login'}</a>
              <span style={{ color: S.border }}>|</span>
              <a href="/dossier/login" style={{ fontSize: '13px', color: S.t2, textDecoration: 'none' }}>{nl ? 'Mijn dossier' : 'My dossier'}</a>
            </div>
            {/* Mobile: language + hamburger */}
            <div className="ms-hamburger" style={{ alignItems: 'center', gap: '10px' }}>
              <LanguageToggle />
              <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t2, display: 'flex', alignItems: 'center', padding: '4px' }}>
                <Menu size={22}/>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, boxShadow: S.shadow }}>
        <div className="ms-hero-inner" style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px 40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px' }}>
          <div style={{ maxWidth: '600px', flex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: S.greenLt, border: `1px solid ${S.greenRim}`, color: S.greenTx, fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
              <span style={{ width: '6px', height: '6px', background: S.green, display: 'inline-block' }}/>
              {nl ? `Actief in Eindhoven e.o. · Sinds ${agency.since}` : `Active in Eindhoven · Since ${agency.since}`}
            </div>
            <h1 className="ms-hero-h1" style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 600, color: S.t1, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '14px' }}>
              {nl ? 'Meer dan een makelaar.' : 'More than an agent.'}
            </h1>
            <p className="ms-hero-p" style={{ fontSize: '14px', color: S.t2, lineHeight: 1.7, marginBottom: '20px', maxWidth: '480px' }}>
              {nl ? 'Bij Stadsmakelaars weet je precies waar je aan toe bent. Geen verborgen kosten, geen verrassingen.' : 'At Stadsmakelaars you know exactly where you stand. No hidden fees, no surprises.'}
            </p>
            <div className="ms-contact-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {[
                { icon: <Phone size={12}/>, label: agency.phone,   href: `tel:${agency.phone.replace(/\s/g,'')}` },
                { icon: <Mail size={12}/>,  label: agency.email,   href: `mailto:${agency.email}` },
                { icon: <MapPin size={12}/>, label: agency.address, href: '#' },
              ].map((item, i) => (
                <a key={i} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: S.surface, border: `1px solid ${S.border}`, fontSize: '12px', color: S.t2, textDecoration: 'none', boxShadow: S.shadow }}>
                  <span style={{ color: S.green }}>{item.icon}</span>{item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="ms-stats" style={{ display: 'flex', gap: 0, border: `1px solid ${S.border}`, boxShadow: S.shadow, flexShrink: 0 }}>
            {[
              { val: agency.since,               label: nl ? 'Actief sinds' : 'Active since', hi: false },
              { val: String(availableCount),     label: nl ? 'Te koop'      : 'For sale',      hi: true  },
              { val: String(allListings.length), label: nl ? 'Totaal'       : 'Total',         hi: false },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px 24px', textAlign: 'center', background: S.surface, borderRight: i < 2 ? `1px solid ${S.border}` : 'none', minWidth: '90px' }}>
                <div className="stat-num" style={{ fontFamily: "'DM Mono', monospace", fontSize: '28px', fontWeight: 500, color: s.hi ? S.green : S.t1, lineHeight: 1, letterSpacing: '-1px' }}>{s.val}</div>
                <div style={{ fontSize: '11px', color: S.t3, marginTop: '5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LISTINGS */}
      <div className="ms-wrap" style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 32px 64px' }}>

        {/* Filter bar */}
        <div className="ms-filter-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${S.border}`, marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {[
              { key: 'all',       label: nl ? 'Alle' : 'All',      count: allListings.length },
              { key: 'available', label: nl ? 'Te koop' : 'For sale', count: availableCount },
              { key: 'sold',      label: nl ? 'Verkocht' : 'Sold',  count: soldCount },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key as any)} style={{ padding: '0 14px', height: '42px', fontSize: '13px', fontWeight: filter === tab.key ? 500 : 400, color: filter === tab.key ? S.t1 : S.t3, background: 'none', border: 'none', borderBottom: filter === tab.key ? `2px solid ${S.green}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '-1px', whiteSpace: 'nowrap' }}>
                {tab.label}
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: S.t3 }}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 0, border: `1px solid ${S.border}`, marginBottom: '1px', boxShadow: S.shadow, flexShrink: 0 }}>
            {[{ key: 'list', icon: <List size={13}/>, label: nl?'Lijst':'List' }, { key: 'map', icon: <Map size={13}/>, label: nl?'Kaart':'Map' }].map((v,i) => (
              <button key={v.key} onClick={() => setView(v.key as any)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 12px', height: '30px', fontSize: '12px', fontWeight: 500, background: view === v.key ? S.greenLt : S.surface, color: view === v.key ? S.greenTx : S.t3, border: 'none', borderRight: v.key === 'list' ? `1px solid ${S.border}` : 'none', cursor: 'pointer' }}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>
        </div>

        {/* LIST */}
        {view === 'list' && (
          <div className="ms-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {filtered.map((listing, idx) => {
              const isFav   = favourites.has(listing.id)
              const isAvail = listing.status === availableStatus
              const dom     = getDom(listing.listed_date)
              const nieuw   = isNieuw(listing.listed_date) && isAvail
              const pverd   = isPrijsVerlaagd(listing.price, listing.previous_price) && isAvail

              return (
                <div key={`${listing.id}-${idx}`} style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden', opacity: !isAvail ? 0.75 : 1 }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 8px 24px rgba(5,150,105,0.12)'; el.style.borderColor = S.greenRim }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = S.shadow; el.style.borderColor = S.border }}>

                  {/* Image */}
                  <div style={{ height: '150px', background: listing.imgGradient, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Home size={44} color="rgba(0,0,0,0.1)" />
                    <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ padding: '2px 7px', fontSize: '10px', fontWeight: 500, background: isAvail ? S.green : 'rgba(255,255,255,0.85)', color: isAvail ? 'white' : S.t2 }}>{listing.status}</div>
                      {nieuw && <div style={{ padding: '2px 7px', fontSize: '9.5px', fontWeight: 600, background: S.blue, color: 'white' }}>{nl ? 'Nieuw' : 'New'}</div>}
                      {pverd && <div style={{ padding: '2px 7px', fontSize: '9.5px', fontWeight: 600, background: S.amber, color: 'white' }}>{nl ? 'Prijs ↓' : 'Price ↓'}</div>}
                    </div>
                    <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '2px 7px', background: 'rgba(255,255,255,0.9)', border: `1px solid ${S.border}`, fontSize: '11px', fontWeight: 500, fontFamily: "'DM Mono', monospace", color: scoreColor(listing.score) }}>
                      {listing.score}
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleFav(listing.id) }} style={{ position: 'absolute', bottom: '8px', right: '8px', width: '28px', height: '28px', background: 'rgba(255,255,255,0.9)', border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Heart size={13} fill={isFav ? S.red : 'none'} color={isFav ? S.red : S.t3} />
                    </button>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: S.t1, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listing.street}</div>
                    <div style={{ fontSize: '11.5px', color: S.t3, marginBottom: listing.listed_date ? '3px' : '8px', display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={9}/>{listing.city}</div>
                    {listing.listed_date && <div style={{ fontSize: '10.5px', color: S.t3, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={9}/>{domLabel(dom, nl)}</div>}
                    {listing.price > 0
                      ? <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '17px', fontWeight: 500, color: S.t1 }}>{formatPrice(listing.price)}</div>
                      : <div style={{ fontSize: '13px', fontWeight: 500, color: S.greenTx }}>{nl ? 'Open bieding' : 'Open bid'}</div>}
                    {pverd && listing.previous_price && <div style={{ fontSize: '11px', color: S.t3, textDecoration: 'line-through', fontFamily: "'DM Mono', monospace" }}>{formatPrice(listing.previous_price)}</div>}
                    {listing.area_m2 > 0 && listing.price > 0 && <div style={{ fontSize: '11px', color: S.greenTx, fontWeight: 500, marginTop: '1px', marginBottom: '8px' }}>{formatPrice(Math.round(listing.price / listing.area_m2))}/m²</div>}
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: S.t3, paddingBottom: '10px', marginBottom: '10px', borderBottom: `1px solid ${S.border}` }}>
                      {listing.area_m2 > 0 && <span>{listing.area_m2}m²</span>}
                      {listing.energy_label && listing.energy_label !== '—' && <span>{listing.energy_label}</span>}
                    </div>
                    {isAvail && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {listing.isSubmission && <button onClick={e => { e.stopPropagation(); setBidListing(listing) }} style={{ flex: 1, height: '34px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>{nl ? 'Bied nu' : 'Bid'}</button>}
                        <button onClick={e => { e.stopPropagation(); setViewingListing(listing) }} style={{ flex: 1, height: '34px', background: S.surface, color: S.t1, border: `1px solid ${S.border}`, fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <Calendar size={11}/>{nl ? 'Bezichtiging' : 'View'}
                        </button>
                        <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/microsite/${params.slug}?listing=${listing.id}`); alert(nl ? 'Link gekopieerd!' : 'Copied!') }} style={{ width: '34px', height: '34px', background: S.surface, color: S.t3, border: `1px solid ${S.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Link2 size={12}/>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MAP */}
        {view === 'map' && (
          <div style={{ position: 'relative', height: '500px', border: `1px solid ${S.border}`, boxShadow: S.shadow }}>
            <PropertyMap properties={mapProperties} onSelect={prop => setSelected(prop)} center={[5.4697, 51.4416]} zoom={12} />
            {selected && (
              <div style={{ position: 'absolute', top: '12px', left: '12px', padding: '14px', width: 'min(220px, 80vw)', background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadowMd }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: S.t1, marginBottom: '2px' }}>{selected.street}</div>
                <div style={{ fontSize: '11.5px', color: S.t3, marginBottom: '8px' }}>{selected.city}</div>
                <button onClick={() => setSelected(null)} style={{ fontSize: '11.5px', color: S.t3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sluiten ×</button>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="ms-cta" style={{ marginTop: '36px', padding: '24px', background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: S.t1, marginBottom: '5px' }}>{nl ? 'Klaar om uw woning te verkopen?' : 'Ready to sell?'}</div>
            <p style={{ fontSize: '12.5px', color: S.t2 }}>{nl ? 'Gratis waardebepaling · Geen verborgen kosten' : 'Free valuation · No hidden fees'}</p>
          </div>
          <div className="ms-cta-btns" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => window.location.href = '/submit/1'} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 16px', background: S.surface, color: S.greenTx, border: `1px solid ${S.greenRim}`, fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <ChevronRight size={13}/>{nl ? 'Aanmelden' : 'Submit'}
            </button>
            <a href={`tel:${agency.phone.replace(/\s/g,'')}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 16px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
              <Phone size={13}/>{agency.phone}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[{ label: nl ? 'Privacybeleid' : 'Privacy', href: '/privacy' }, { label: 'AVG/GDPR', href: '#' }].map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: '11.5px', color: S.t3, textDecoration: 'none' }}>{l.label}</a>
            ))}
          </div>
          <span style={{ fontSize: '11.5px', color: S.t3 }}>© {new Date().getFullYear()} Groundr B.V.</span>
        </div>
      </div>

      {bidListing && <BidModal submissionId={bidListing.submissionId || parseInt(String(bidListing.id).replace('sub-',''))} street={bidListing.street} city={bidListing.city} askingPrice={bidListing.price > 0 ? bidListing.price : null} showPrice={bidListing.price > 0} bidDeadline={bidListing.bid_deadline || null} onClose={() => setBidListing(null)} onSuccess={(result) => handleBidSuccess(bidListing, result)} />}
      {viewingListing && <ViewingModal makelaarId={agency.userId} submissionId={viewingListing.submissionId} street={viewingListing.street} city={viewingListing.city} onClose={() => setViewingListing(null)} />}
    </div>
    </>
  )
}