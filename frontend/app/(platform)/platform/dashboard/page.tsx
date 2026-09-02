/**
 * @file        app/(platform)/platform/dashboard/page.tsx
 * @description Intelligence dashboard — main workspace for agents and admins.
 *
 *              Sections (top to bottom):
 *                1. Page header (greeting + alerts pill)
 *                2. KPI row (6 stat cards)
 *                3. Search bar (PDOK autocomplete + radius + button)
 *                4. Score result panel (only when search active)
 *                5. Map (always visible)
 *                6. Recent activity feed (stubbed for now)
 *
 *              Uses the new design system — Card, Button, ScorePanel, StatCard.
 *              No inline hardcoded colors anywhere.
 *
 * @layer       Pages → Platform → Dashboard
 * @depends     components/ui/*, components/map/PropertyMap, store/auth
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, TrendingUp, Home, Calendar, Gavel, FileCheck, AlertTriangle, Euro, Clock } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ScorePanel } from '@/components/ui/ScoreBar'
import { useAuth } from '@/store/auth'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS, SHADOW } from '@/lib/design/tokens'

const PropertyMap = dynamic(() => import('@/components/map/PropertyMap'), { ssr: false })

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoreResult {
  score:       number
  factors:     Record<string, number>
  explanation: Record<string, string>
  property:    { street: string; house_number: string; city: string }
  neighborhood: {
    total_properties:       number
    avg_price_per_m2:       number | null
    estimated_rental_yield: number | null
    pct_apartments:         number
    pct_houses:             number
  }
  amenities: { name: string; type: string; distance_m: number }[]
}

interface KPIData {
  active_listings:    number
  pending_bids:       number
  pending_viewings:   number
  pending_approvals:  number
  open_issues:        number
  mtd_revenue:        number
}

interface ActivityItem {
  type:      'bid' | 'viewing' | 'approval' | 'issue' | 'listing'
  message:   string
  timestamp: string
  link?:     string
}

interface MapProperty {
  id:           number
  street:       string
  house_number: string
  city:         string
  latitude:     number
  longitude:    number
  woz_value:    number | null
  area_m2:      number | null
  property_type:string
}

interface AddressSuggestion { weergavenaam: string; id: string }

// ── Distance formatter ────────────────────────────────────────────────────────

function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)}m` : `${(metres/1000).toFixed(1)}km`
}

function formatCurrency(amount: number): string {
  return `€${amount.toLocaleString('nl-NL')}`
}

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router    = useRouter()
  const { user }  = useAuth()

  // Search state
  const [address,  setAddress]  = useState('')
  const [radius,   setRadius]   = useState('2.0')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<ScoreResult | null>(null)
  const [error,    setError]    = useState('')

  // Autocomplete state
  const [suggestions,     setSuggestions]     = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSugg,      setActiveSugg]      = useState(-1)
  const suggTimeout = useRef<NodeJS.Timeout | null>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)

  // KPIs + map + activity
  const [kpis,       setKpis]       = useState<KPIData | null>(null)
  const [properties, setProperties] = useState<MapProperty[]>([])
  const [activity,   setActivity]   = useState<ActivityItem[]>([])

  // ── Load KPIs, map, activity on mount ─────────────────────────────────────

  useEffect(() => {
    loadKPIs()
    loadMapProperties()
    loadActivity()

    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadKPIs() {
    const token = localStorage.getItem('groundr_token')
    if (!token) return
    try {
      // Fetch all in parallel
      const [analyticsRes, viewingsRes, issuesRes, submissionsRes] = await Promise.all([
        fetch(`${API}/api/listings/analytics/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/viewings/requests`,           { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/meldingen/`,                  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/submissions/pending`,         { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const [analytics, viewings, issues, submissions] = await Promise.all([
        analyticsRes.ok ? analyticsRes.json() : { submissions: [] },
        viewingsRes.ok  ? viewingsRes.json()  : { requests: [] },
        issuesRes.ok    ? issuesRes.json()    : { meldingen: [] },
        submissionsRes.ok ? submissionsRes.json() : { submissions: [] },
      ])

      // Aggregate from analytics rows
      const subs = analytics.submissions ?? []
      const activeListings = subs.filter((s: any) => s.status === 'approved').length
      const pendingBids    = subs.reduce((sum: number, s: any) => sum + (s.bid_count ?? 0), 0)
      const mtdRevenue     = subs.reduce((sum: number, s: any) =>
        sum + (s.status === 'approved' ? (s.asking_price ?? 0) * 0.012 : 0), 0
      ) // 1.2% commission stub

      setKpis({
        active_listings:   activeListings,
        pending_bids:      pendingBids,
        pending_viewings:  (viewings.requests ?? []).filter((r: any) => r.status === 'pending').length,
        pending_approvals: (submissions.submissions ?? []).length,
        open_issues:       (issues.meldingen ?? []).filter((m: any) => m.status === 'open').length,
        mtd_revenue:       mtdRevenue,
      })
    } catch {
      setKpis({ active_listings: 0, pending_bids: 0, pending_viewings: 0, pending_approvals: 0, open_issues: 0, mtd_revenue: 0 })
    }
  }

  async function loadMapProperties() {
    try {
      const res  = await fetch(`${API}/api/properties/search?q=Eindhoven&radius=10`)
      const data = await res.json()
      setProperties(
        (data.results ?? [])
          .filter((p: any) => p.latitude && p.longitude)
          .map((p: any) => ({
            id:            p.id,
            street:        p.street,
            house_number:  p.house_number ?? '',
            city:          p.city,
            latitude:      p.latitude,
            longitude:     p.longitude,
            woz_value:     p.woz_value,
            area_m2:       p.area_m2,
            property_type: p.property_type,
          }))
      )
    } catch { /* map stays empty */ }
  }

  async function loadActivity() {
    // Stubbed for now — will be replaced by /api/activity endpoint
    const now = Date.now()
    setActivity([
      { type: 'bid',      message: 'New bid €485.000 on Stratumsedijk 23',     timestamp: new Date(now - 12 * 60 * 1000).toISOString(),  link: '/platform/bids' },
      { type: 'viewing',  message: 'Viewing confirmed for Geldropseweg 90',    timestamp: new Date(now - 47 * 60 * 1000).toISOString(),  link: '/platform/viewings' },
      { type: 'approval', message: 'New seller submission — Tongelresestraat', timestamp: new Date(now - 3 * 3600 * 1000).toISOString(), link: '/platform/approvals' },
      { type: 'listing',  message: 'Biezenkuilen 50 marked as sold',           timestamp: new Date(now - 8 * 3600 * 1000).toISOString(), link: '/platform/listings' },
      { type: 'issue',    message: 'Buyer reported issue on Dommelhoefstraat', timestamp: new Date(now - 26 * 3600 * 1000).toISOString(),link: '/platform/issues' },
    ])
  }

  // ── PDOK autocomplete ─────────────────────────────────────────────────────

  async function fetchSuggestions(query: string) {
    if (query.length < 3) { setSuggestions([]); setShowSuggestions(false); return }
    try {
      const res  = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(query)}&fq=type:adres&rows=6`)
      const data = await res.json()
      const docs: AddressSuggestion[] = (data.response?.docs ?? []).map((d: any) => ({
        weergavenaam: d.weergavenaam, id: d.id,
      }))
      setSuggestions(docs)
      setShowSuggestions(docs.length > 0)
    } catch {
      setSuggestions([])
    }
  }

  function handleAddressChange(val: string) {
    setAddress(val)
    setActiveSugg(-1)
    if (suggTimeout.current) clearTimeout(suggTimeout.current)
    suggTimeout.current = setTimeout(() => fetchSuggestions(val), 250)
  }

  function handleSelectSuggestion(s: AddressSuggestion) {
    setAddress(s.weergavenaam)
    setSuggestions([])
    setShowSuggestions(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || !suggestions.length) return
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveSugg(p => Math.min(p + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveSugg(p => Math.max(p - 1, 0)) }
    if (e.key === 'Enter' && activeSugg >= 0) { e.preventDefault(); handleSelectSuggestion(suggestions[activeSugg]) }
    if (e.key === 'Escape')     setShowSuggestions(false)
  }

  // ── Search submit ─────────────────────────────────────────────────────────

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) return
    setShowSuggestions(false)
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(
        `${API}/api/analytics/score?address=${encodeURIComponent(address)}&radius=${radius}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.detail ?? 'Address not found.'); return }
      setResult(data)
    } catch {
      setError('Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  // ── Total alerts ──────────────────────────────────────────────────────────

  const totalAlerts = (kpis?.pending_viewings ?? 0) + (kpis?.pending_approvals ?? 0) + (kpis?.open_issues ?? 0)

  // ── Activity icon map ─────────────────────────────────────────────────────

  const ACTIVITY_ICON: Record<ActivityItem['type'], React.ReactNode> = {
    bid:      <Gavel size={14} />,
    viewing:  <Calendar size={14} />,
    approval: <FileCheck size={14} />,
    listing:  <Home size={14} />,
    issue:    <AlertTriangle size={14} />,
  }
  const ACTIVITY_COLOR: Record<ActivityItem['type'], string> = {
    bid:      COLOR.brand,
    viewing:  COLOR.info,
    approval: COLOR.warning,
    listing:  COLOR.brand,
    issue:    COLOR.danger,
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-end',
        marginBottom:   SPACE[6],
        flexWrap:       'wrap',
        gap:            SPACE[3],
      }}>
        <div>
          <h1 style={{
            fontFamily:    FONT.display,
            fontSize:      '32px',
            fontWeight:    400,
            color:         COLOR.textPrimary,
            letterSpacing: '-0.5px',
            marginBottom:  SPACE[1],
          }}>
            Welcome, {user?.full_name ?? user?.email ?? 'Agent'}
          </h1>
          <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
            Search any Dutch address for an instant investment analysis.
          </p>
        </div>
        {totalAlerts > 0 && (
          <Badge variant="warning" shape="pill" dot>
            {totalAlerts} action{totalAlerts > 1 ? 's' : ''} needed today
          </Badge>
        )}
      </div>

      {/* ── KPI row ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap:                 SPACE[3],
        marginBottom:        SPACE[6],
      }}>
        <StatCard value={kpis?.active_listings ?? '—'}   label="Active listings" />
        <StatCard value={kpis?.pending_bids ?? '—'}      label="Bids received" />
        <StatCard value={kpis?.pending_viewings ?? '—'}  label="Pending viewings" color={kpis?.pending_viewings ? COLOR.warning : undefined} />
        <StatCard value={kpis?.pending_approvals ?? '—'} label="Approvals" color={kpis?.pending_approvals ? COLOR.warning : undefined} />
        <StatCard value={kpis?.open_issues ?? '—'}       label="Open issues" color={kpis?.open_issues ? COLOR.danger : undefined} />
        <StatCard value={kpis ? formatCurrency(Math.round(kpis.mtd_revenue)) : '—'} label="MTD revenue (est.)" color={COLOR.brand} />
      </div>

      {/* ── Search bar ── */}
      <form onSubmit={handleSearch} style={{ marginBottom: SPACE[6] }}>
        <div style={{ display: 'flex', boxShadow: SHADOW.md, borderRadius: RADIUS.md, overflow: 'visible' }}>
          {/* Address input */}
          <div ref={wrapRef} style={{ flex: 1, position: 'relative' }}>
            <div style={{
              display:     'flex',
              alignItems:  'center',
              gap:         SPACE[3],
              height:      '46px',
              padding:     `0 ${SPACE[4]}`,
              background:  COLOR.bgSurface,
              border:      `1px solid ${COLOR.border}`,
              borderRight: 'none',
              borderRadius:`${RADIUS.md} 0 0 ${RADIUS.md}`,
            }}>
              <Search size={15} color={COLOR.textMuted} style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={address}
                onChange={e => handleAddressChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search an address — e.g. Stratumsedijk 23 Eindhoven"
                autoComplete="off"
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontFamily: FONT.body, fontSize: '14px',
                  color: COLOR.textPrimary, background: 'transparent',
                }}
              />
              {address && (
                <button
                  type="button"
                  onClick={() => { setAddress(''); setSuggestions([]); setShowSuggestions(false) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLOR.textMuted, fontSize: '16px', lineHeight: 1 }}
                >×</button>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: COLOR.bgSurface,
                border: `1px solid ${COLOR.border}`, borderTop: 'none',
                boxShadow: SHADOW.lg,
                borderRadius: `0 0 ${RADIUS.md} ${RADIUS.md}`,
                zIndex: 200, overflow: 'hidden',
              }}>
                {suggestions.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: SPACE[3],
                      padding: `${SPACE[2]} ${SPACE[4]}`,
                      background: activeSugg === i ? COLOR.brandLight : COLOR.bgSurface,
                      border: 'none',
                      borderBottom: i < suggestions.length - 1 ? `1px solid ${COLOR.border}` : 'none',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <MapPin size={12} color={COLOR.brand} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '13.5px', color: COLOR.textPrimary }}>{s.weergavenaam}</span>
                  </button>
                ))}
                <div style={{ padding: `${SPACE[1]} ${SPACE[4]}`, background: COLOR.bgSurface2, fontSize: '11px', color: COLOR.textMuted }}>
                  Source: PDOK Locatieserver
                </div>
              </div>
            )}
          </div>

          {/* Radius select */}
          <select
            value={radius}
            onChange={e => setRadius(e.target.value)}
            style={{
              height: '46px', padding: `0 ${SPACE[3]}`,
              background: COLOR.bgSurface,
              border: `1px solid ${COLOR.border}`, borderRight: 'none',
              fontFamily: FONT.body, fontSize: '13px',
              color: COLOR.textPrimary, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="0.5">0.5 km</option>
            <option value="1.0">1.0 km</option>
            <option value="2.0">2.0 km</option>
            <option value="5.0">5.0 km</option>
          </select>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              height: '46px', padding: `0 ${SPACE[5]}`,
              background: loading ? COLOR.brandLight : COLOR.brand,
              color: loading ? COLOR.brandText : 'white',
              border: `1px solid ${COLOR.brand}`,
              borderRadius: `0 ${RADIUS.md} ${RADIUS.md} 0`,
              fontFamily: FONT.body, fontSize: '14px', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Analysing...' : 'Analyse →'}
          </button>
        </div>
      </form>

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: `${SPACE[3]} ${SPACE[4]}`,
          background: COLOR.dangerLight,
          border: `1px solid ${COLOR.dangerBorder}`,
          borderRadius: RADIUS.md,
          color: COLOR.dangerText, fontSize: '13.5px',
          marginBottom: SPACE[4],
        }}>
          {error}
        </div>
      )}

      {/* ── Score result ── */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: SPACE[4], marginBottom: SPACE[6] }}>
          <Card title="Investment score" icon={<TrendingUp size={14} />}>
            <ScorePanel
              score={result.score}
              factors={result.factors}
              explanations={result.explanation}
              lang="nl"
            />
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[4] }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                <div style={{
                  width: '40px', height: '40px',
                  background: COLOR.brandLight,
                  border: `1px solid ${COLOR.brandBorder}`,
                  borderRadius: RADIUS.md,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <MapPin size={18} color={COLOR.brand} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: COLOR.textPrimary }}>
                    {result.property.street} {result.property.house_number}
                  </div>
                  <div style={{ fontSize: '12.5px', color: COLOR.textMuted }}>
                    {result.property.city}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Neighbourhood analysis" icon={<MapPin size={14} />}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: SPACE[3] }}>
                <StatCard value={String(result.neighborhood.total_properties)} label="Properties nearby" />
                <StatCard value={result.neighborhood.avg_price_per_m2 ? `€${Math.round(result.neighborhood.avg_price_per_m2).toLocaleString('nl-NL')}` : '—'} label="Avg price / m²" />
                <StatCard
                  value={result.neighborhood.estimated_rental_yield ? `${result.neighborhood.estimated_rental_yield.toFixed(1)}%` : '—'}
                  label="Rental yield"
                  trend={result.neighborhood.estimated_rental_yield && result.neighborhood.estimated_rental_yield > 5 ? 'up' : 'neutral'}
                />
                <StatCard value={`${result.neighborhood.pct_apartments.toFixed(0)}%`} label="Apartments" />
              </div>
            </Card>

            {result.amenities.length > 0 && (
              <Card title="Nearby amenities" icon={<MapPin size={14} />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  {result.amenities.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: `${SPACE[2]} 0`,
                        borderBottom: `1px solid ${COLOR.border}`,
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ color: COLOR.textSecondary }}>{a.name}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: '12px', color: COLOR.brand, fontWeight: 500 }}>
                        {formatDistance(a.distance_m)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Map ── (always visible) */}
      <h3 style={{
        fontFamily: FONT.display, fontSize: '20px', fontWeight: 400,
        color: COLOR.textPrimary, marginBottom: SPACE[3],
      }}>
        Properties on the map
      </h3>
      <div style={{ height: '480px', width: '100%', border: `1px solid ${COLOR.border}`, marginBottom: SPACE[6], overflow: 'hidden', position: 'relative' }}>
        <PropertyMap
          properties={properties}
          onSelect={prop => router.push(`/property/${prop.id}`)}
          center={[5.4697, 51.4416]}
          zoom={12}
        />
      </div>

      {/* ── Recent activity ── */}
      <h3 style={{
        fontFamily: FONT.display, fontSize: '20px', fontWeight: 400,
        color: COLOR.textPrimary, marginBottom: SPACE[3],
      }}>
        Recent activity
      </h3>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activity.map((item, i) => (
            <div
              key={i}
              onClick={() => item.link && router.push(item.link)}
              style={{
                display: 'flex', alignItems: 'center', gap: SPACE[3],
                padding: `${SPACE[3]} 0`,
                borderBottom: i < activity.length - 1 ? `1px solid ${COLOR.border}` : 'none',
                cursor: item.link ? 'pointer' : 'default',
              }}
              onMouseEnter={e => item.link && (e.currentTarget.style.background = COLOR.bgSurface2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: '28px', height: '28px',
                background: COLOR.bgSurface2,
                border: `1px solid ${COLOR.border}`,
                borderRadius: RADIUS.md,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: ACTIVITY_COLOR[item.type],
                flexShrink: 0,
              }}>
                {ACTIVITY_ICON[item.type]}
              </div>
              <span style={{ flex: 1, fontSize: '13.5px', color: COLOR.textPrimary }}>
                {item.message}
              </span>
              <span style={{ fontSize: '11.5px', color: COLOR.textMuted, fontFamily: FONT.mono, flexShrink: 0 }}>
                <Clock size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
                {timeAgo(item.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}