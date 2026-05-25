'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, MapPin, TrendingUp, Home, LogOut, Shield, FileText, Mail } from 'lucide-react'
import dynamic from 'next/dynamic'
import InviteModal from '@/components/invite/InviteModal'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

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
  pending_viewings:  number
  pending_bids:      number
  open_meldingen:    number
  pending_approvals: number
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-1.5 font-mono text-xs font-bold px-1.5 py-0.5"
      style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}>
      {count}
    </span>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const nl = lang === 'nl'

  const [address,    setAddress]    = useState('')
  const [radius,     setRadius]     = useState('2.0')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<ScoreResult | null>(null)
  const [error,      setError]      = useState('')
  const [email,      setEmail]      = useState('gebruiker')
  const [properties, setProperties] = useState<any[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [badges,     setBadges]     = useState<Badges>({
    pending_viewings: 0, pending_bids: 0, open_meldingen: 0, pending_approvals: 0,
  })

  function generateExplanation(result: ScoreResult): { icon: string; text: string }[] {
    const lines: { icon: string; text: string }[] = []
    const f = result.factors

    if (f.rental_yield >= 70)      lines.push({ icon: '↑', text: nl ? 'Uitstekend huurrendement in deze buurt' : 'Excellent rental yield in this area' })
    else if (f.rental_yield >= 40) lines.push({ icon: '→', text: nl ? 'Gemiddeld huurrendement' : 'Average rental yield' })
    else                           lines.push({ icon: '↓', text: nl ? 'Laag huurrendement' : 'Low rental yield' })

    if (f.price_trend_6m >= 70)      lines.push({ icon: '↑', text: nl ? 'Sterke prijsstijging afgelopen 6 maanden' : 'Strong price growth over the past 6 months' })
    else if (f.price_trend_6m >= 40) lines.push({ icon: '→', text: nl ? 'Stabiele prijsontwikkeling' : 'Stable price development' })
    else                             lines.push({ icon: '↓', text: nl ? 'Prijzen onder druk in dit gebied' : 'Prices under pressure in this area' })

    if (f.woz_delta >= 70)      lines.push({ icon: '↑', text: nl ? 'WOZ-waarde stijgt sterk' : 'WOZ value rising strongly' })
    else if (f.woz_delta < 30)  lines.push({ icon: '→', text: nl ? 'WOZ-waarde stagnatie' : 'WOZ value stagnation' })

    if (f.energy_label >= 80)      lines.push({ icon: '✓', text: nl ? 'Energiezuinig pand (label A of B)' : 'Energy-efficient property (label A or B)' })
    else if (f.energy_label < 40)  lines.push({ icon: '!', text: nl ? 'Energielabel matig — verduurzaming gewenst' : 'Poor energy label — renovation recommended' })

    const transit = result.amenities.find(a => ['bus_stop','train_station','subway_entrance','tram_stop'].includes(a.type))
    if (transit) {
      const dist = transit.distance_m < 1000 ? `${Math.round(transit.distance_m)}m` : `${(transit.distance_m/1000).toFixed(1)}km`
      lines.push({ icon: '◎', text: nl ? `Openbaar vervoer op ${dist}` : `Public transport ${dist} away` })
    }

    const supermarket = result.amenities.find(a => a.type === 'supermarket')
    if (supermarket) {
      const dist = supermarket.distance_m < 1000 ? `${Math.round(supermarket.distance_m)}m` : `${(supermarket.distance_m/1000).toFixed(1)}km`
      lines.push({ icon: '◎', text: nl ? `Supermarkt op ${dist}` : `Supermarket ${dist} away` })
    }

    if (result.neighborhood.pct_houses >= 60)      lines.push({ icon: '◎', text: nl ? 'Overwegend eengezinswoningen' : 'Mostly family homes' })
    else if (result.neighborhood.pct_apartments >= 60) lines.push({ icon: '◎', text: nl ? 'Stedelijk — veel appartementen' : 'Urban — many apartments' })

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
        fetch('http://localhost:8000/api/viewings/requests',   { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/meldingen/',          { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/submissions/pending', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [viewData, melData, subData] = await Promise.all([viewRes.json(), melRes.json(), subRes.json()])
      setBadges({
        pending_viewings:  (viewData.requests  || []).filter((r: any) => r.status === 'pending').length,
        pending_bids:      0,
        open_meldingen:    (melData.meldingen  || []).filter((m: any) => m.status === 'open').length,
        pending_approvals: (subData.submissions || []).length,
      })
    } catch {}
  }

  async function loadProperties() {
    try {
      const res  = await fetch('http://localhost:8000/api/properties/search?q=Achterom%20Eindhoven&radius=10')
      const data = await res.json()
      setProperties((data.results || []).map((p: any) => ({
        id: p.id, street: p.street, house_number: p.house_number || '',
        city: p.city, latitude: p.latitude, longitude: p.longitude,
        woz_value: p.woz_value, area_m2: p.area_m2, property_type: p.property_type,
      })).filter((p: any) => p.latitude && p.longitude))
    } catch (e) { console.error(e) }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(
        `http://localhost:8000/api/analytics/score?address=${encodeURIComponent(address)}&radius=${radius}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.detail || t('common.error')); return }
      setResult(data)
    } catch { setError(t('common.error')) }
    finally { setLoading(false) }
  }

  function scoreColor(score: number) {
    if (score >= 70) return '#059669'
    if (score >= 50) return '#D97706'
    return '#DC2626'
  }

  const totalAlerts = badges.pending_viewings + badges.open_meldingen + badges.pending_approvals

  return (
    <div className="min-h-screen" style={{ background: '#F4F6F9' }}>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      {/* ── NAV ── */}
      <nav style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E5EA',
        height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 3px rgba(11,19,32,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <img src="/logo.svg" alt="Groundr" className="h-8 w-auto" />
          <div style={{ display: 'flex' }}>
            {[
              { href: '/listings',  label: t('nav.listings'), badge: 0 },
              { href: '/approvals', label: t('nav.approvals'), badge: badges.pending_approvals },
              { href: '/bids',      label: t('nav.bids'), badge: 0 },
              { href: '/viewings',  label: t('nav.viewings'), badge: badges.pending_viewings },
              { href: '/meldingen', label: t('nav.meldingen'), badge: badges.open_meldingen },
              { href: '/analytics', label: t('nav.analytics'), badge: 0 },
              { href: '/taxatie',   label: nl ? 'Taxatie' : 'Valuation', badge: 0 },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{
                fontSize: '13.5px', fontWeight: 400, color: '#44546A',
                textDecoration: 'none', padding: '0 12px', height: '56px',
                display: 'flex', alignItems: 'center', gap: '4px',
                borderBottom: '2px solid transparent',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0B1320')}
              onMouseLeave={e => (e.currentTarget.style.color = '#44546A')}>
                {item.label}
                {item.badge > 0 && <Badge count={item.badge} />}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {totalAlerts > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(217,119,6,0.08)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)', fontSize: '12px', fontWeight: 500 }}>
              <span style={{ width: '6px', height: '6px', background: '#D97706', display: 'inline-block' }}/>
              {totalAlerts} {nl ? 'actie(s) vereist' : 'action(s) required'}
            </div>
          )}
          <button onClick={() => setShowInvite(true)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '32px', padding: '0 12px',
            background: '#059669', color: 'white',
            border: '1px solid #059669', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer',
          }}>
            + {nl ? 'Klant uitnodigen' : 'Invite client'}
          </button>
          <LanguageToggle />
          <span style={{ fontSize: '13px', color: '#8A9BB0' }}>{email}</span>
          <button onClick={() => { localStorage.clear(); window.location.href = '/login' }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', fontSize: '12.5px', color: '#8A9BB0', cursor: 'pointer' }}>
            <LogOut size={14} />{nl ? 'Uitloggen' : 'Log out'}
          </button>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 32px 0' }}>

        <div style={{ marginBottom: '22px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#0B1320', letterSpacing: '-0.3px' }}>
            {t('dashboard.title')}
          </h1>
          <p style={{ fontSize: '13px', color: '#8A9BB0', marginTop: '3px' }}>
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0, marginBottom: '24px' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
            background: '#FFFFFF', border: '1px solid #E2E5EA',
            borderRight: 'none', padding: '0 16px',
          }}>
            <Search size={15} color="#8A9BB0" style={{ flexShrink: 0 }} />
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder={t('dashboard.search')}
              style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '14px', color: '#0B1320', background: 'transparent', padding: '12px 0' }} />
          </div>
          <select value={radius} onChange={e => setRadius(e.target.value)} style={{
            background: '#FFFFFF', border: '1px solid #E2E5EA', borderRight: 'none',
            padding: '0 14px', fontFamily: 'inherit', fontSize: '13px', color: '#0B1320',
            cursor: 'pointer', outline: 'none', height: '46px',
          }}>
            <option value="0.5">0.5 km</option>
            <option value="1.0">1.0 km</option>
            <option value="2.0">2.0 km</option>
            <option value="5.0">5.0 km</option>
          </select>
          <button type="submit" disabled={loading} style={{
            height: '46px', padding: '0 24px',
            background: loading ? '#6EE7B7' : '#059669',
            color: 'white', border: '1px solid #059669',
            fontFamily: 'inherit', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}>
            {loading ? (nl ? 'Laden...' : 'Loading...') : t('dashboard.analyze')}
          </button>
        </form>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: '13.5px', padding: '11px 16px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>

              {/* Score card */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E5EA', boxShadow: '0 1px 3px rgba(11,19,32,0.06)' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E5EA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0B1320' }}>{t('dashboard.score')}</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 500, padding: '2px 7px', background: '#ECFDF5', color: '#047857', border: '1px solid rgba(5,150,105,0.2)' }}>
                    {result.score} / 100
                  </span>
                </div>
                <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #E2E5EA' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '64px', fontWeight: 500, color: scoreColor(result.score), lineHeight: 1, letterSpacing: '-3px' }}>
                    {result.score}
                  </div>
                  <div style={{ fontSize: '14px', color: '#8A9BB0', fontFamily: 'DM Mono, monospace' }}>/100</div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {generateExplanation(result).map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: i < 4 ? '1px solid #E2E5EA' : 'none', fontSize: '12.5px', color: '#44546A' }}>
                      <span style={{ color: '#059669', fontFamily: 'monospace', fontWeight: 600, flexShrink: 0, width: '12px' }}>{line.icon}</span>
                      <span>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property + factors */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E5EA', boxShadow: '0 1px 3px rgba(11,19,32,0.06)' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E5EA', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={14} color="#059669" />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0B1320' }}>{result.property.street} {result.property.house_number}</div>
                    <div style={{ fontSize: '12px', color: '#8A9BB0' }}>{result.property.city}</div>
                  </div>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(result.factors).map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#8A9BB0', width: '120px', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                      <div style={{ flex: 1, height: '4px', background: '#F0F4F7', border: '1px solid #E2E5EA', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${value}%`, background: '#059669' }} />
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#059669', width: '28px', textAlign: 'right' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Neighbourhood stats */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E5EA' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={12} />
                    {t('dashboard.neighborhood')} — {radius} km
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                      { label: t('dashboard.properties'), value: String(result.neighborhood.total_properties) },
                      { label: t('dashboard.avg_price'), value: result.neighborhood.avg_price_per_m2 ? `€${result.neighborhood.avg_price_per_m2.toFixed(0)}` : '—' },
                      { label: t('dashboard.yield'), value: result.neighborhood.estimated_rental_yield ? `${result.neighborhood.estimated_rental_yield.toFixed(1)}%` : '—' },
                      { label: t('dashboard.apartments'), value: `${result.neighborhood.pct_apartments.toFixed(0)}%` },
                    ].map((s, i) => (
                      <div key={i}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '20px', fontWeight: 500, color: '#0B1320' }}>{s.value}</div>
                        <div style={{ fontSize: '11.5px', color: '#8A9BB0', marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {result.amenities.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E5EA', boxShadow: '0 1px 3px rgba(11,19,32,0.06)' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E5EA', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Home size={14} color="#059669" />
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0B1320' }}>{t('dashboard.amenities')}</span>
                </div>
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                  {result.amenities.map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E5EA', fontSize: '13px', color: '#44546A' }}>
                      <span>{a.name}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#059669', fontWeight: 500 }}>
                        {a.distance_m < 1000 ? `${a.distance_m.toFixed(0)}m` : `${(a.distance_m/1000).toFixed(1)}km`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map — bigger, no empty space */}
        {!result && !loading && !error && (
          <div style={{ border: '1px solid #E2E5EA', boxShadow: '0 1px 3px rgba(11,19,32,0.06)', marginBottom: '32px', height: '520px' }}>
            <PropertyMap
              properties={properties}
              onSelect={prop => router.push(`/property/${prop.id}`)}
            />
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0 48px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', background: '#FFFFFF', border: '1px solid #E2E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 1px 3px rgba(11,19,32,0.06)' }}>
              <MapPin size={20} color="#059669" />
            </div>
            <p style={{ fontSize: '13px', color: '#8A9BB0' }}>{t('dashboard.empty')}</p>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid #E2E5EA',
        background: '#FFFFFF',
        marginTop: '16px',
      }}>
        {/* Main footer row */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '32px' }}>

          {/* Brand */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0B1320', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '18px', height: '18px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              </div>
              Groundr
            </div>
            <p style={{ fontSize: '12px', color: '#8A9BB0', lineHeight: 1.6 }}>
              {nl ? 'Vastgoedintelligentie voor makelaars, taxateurs en beleggers in Nederland.' : 'Real estate intelligence for agents, valuers and investors in the Netherlands.'}
            </p>
            <div style={{ marginTop: '12px', fontSize: '11.5px', color: '#8A9BB0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={12} />
              info@groundr.nl
            </div>
          </div>

          {/* Product */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
              {nl ? 'Product' : 'Product'}
            </div>
            {[
              { label: nl ? 'Dashboard' : 'Dashboard', href: '/dashboard' },
              { label: nl ? 'Mijn listings' : 'My listings', href: '/listings' },
              { label: nl ? 'Taxatie' : 'Valuation', href: '/taxatie' },
              { label: 'Analytics', href: '/analytics' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display: 'block', fontSize: '13px', color: '#44546A', textDecoration: 'none', marginBottom: '6px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#059669')}
                onMouseLeave={e => (e.currentTarget.style.color = '#44546A')}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
              {nl ? 'Juridisch' : 'Legal'}
            </div>
            {[
              { label: nl ? 'Privacybeleid' : 'Privacy policy', href: '#' },
              { label: nl ? 'Gebruiksvoorwaarden' : 'Terms of service', href: '#' },
              { label: 'AVG / GDPR', href: '#' },
              { label: 'Cookie policy', href: '#' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ display: 'block', fontSize: '13px', color: '#44546A', textDecoration: 'none', marginBottom: '6px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#059669')}
                onMouseLeave={e => (e.currentTarget.style.color = '#44546A')}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Compliance */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
              {nl ? 'Compliance' : 'Compliance'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: <Shield size={13} />, label: 'AVG / GDPR compliant' },
                { icon: <FileText size={13} />, label: nl ? 'NWWI-klaar rapporten' : 'NWWI-ready reports' },
                { icon: <Shield size={13} />, label: nl ? 'Versleutelde opslag' : 'Encrypted storage' },
                { icon: <FileText size={13} />, label: nl ? 'KvK: 12345678' : 'CoC: 12345678' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: '#44546A' }}>
                  <span style={{ color: '#059669' }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #E2E5EA', background: '#F8FAFB' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#8A9BB0' }}>
              © {new Date().getFullYear()} Groundr B.V. — {nl ? 'Alle rechten voorbehouden' : 'All rights reserved'}
            </span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ fontSize: '12px', color: '#8A9BB0' }}>
                {nl ? 'Gegevens: BAG/PDOK · CBS · OpenStreetMap' : 'Data: BAG/PDOK · CBS · OpenStreetMap'}
              </span>
              <span style={{ fontSize: '12px', color: '#8A9BB0' }}>v2.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}