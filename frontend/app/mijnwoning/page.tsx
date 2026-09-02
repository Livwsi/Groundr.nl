// app/mijnwoning/page.tsx
// Public free estimate page — no auth required
// NL equivalent of Zillow Zestimate + Funda "Mijn woning"

'use client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search, MapPin, TrendingUp, Home, BarChart2, ArrowRight, CheckCircle } from 'lucide-react'

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', amberLt: '#FFFBEB', red: '#DC2626',
  shadow: '0 1px 3px rgba(11,19,32,0.06)', shadowMd: '0 4px 20px rgba(11,19,32,0.1)',
}

interface EstimateResult {
  score: number
  factors: Record<string, number>
  explanation: Record<string, string>
  neighborhood: {
    total_properties: number
    avg_price_per_m2: number | null
    estimated_rental_yield: number | null
    pct_apartments: number
    pct_houses: number
  }
  property: { street: string; house_number: string; city: string }
  amenities: { name: string; type: string; distance_m: number }[]
}

function scoreColor(s: number) { return s >= 70 ? S.green : s >= 50 ? S.amber : S.red }
function scoreLabel(s: number, nl: boolean) {
  if (s >= 80) return nl ? 'Uitstekend' : 'Excellent'
  if (s >= 65) return nl ? 'Goed' : 'Good'
  if (s >= 50) return nl ? 'Gemiddeld' : 'Average'
  return nl ? 'Matig' : 'Below average'
}

export default function MijnWoningPage() {
  const [address,     setAddress]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<EstimateResult | null>(null)
  const [error,       setError]       = useState('')
  const [suggestions, setSuggestions] = useState<{ weergavenaam: string; id: string }[]>([])
  const [showSugg,    setShowSugg]    = useState(false)
  const suggTimeout = useRef<NodeJS.Timeout | null>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)

  async function fetchSuggestions(q: string) {
    if (q.length < 3) { setSuggestions([]); setShowSugg(false); return }
    try {
      const res  = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(q)}&fq=type:adres&rows=5`)
      const data = await res.json()
      const docs = (data.response?.docs || []).map((d: any) => ({ weergavenaam: d.weergavenaam, id: d.id }))
      setSuggestions(docs); setShowSugg(docs.length > 0)
    } catch { setSuggestions([]) }
  }

  function handleInput(val: string) {
    setAddress(val)
    if (suggTimeout.current) clearTimeout(suggTimeout.current)
    suggTimeout.current = setTimeout(() => fetchSuggestions(val), 250)
  }

  async function handleSearch(addr?: string) {
    const q = addr || address
    if (!q.trim()) return
    setShowSugg(false); setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`${API_BASE}/api/analytics/score?address=${encodeURIComponent(q)}&radius=2.0`)
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Adres niet gevonden.'); return }
      setResult(data)
    } catch { setError('Kan geen verbinding maken met de server.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', boxShadow: S.shadow }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '22px', height: '22px', background: S.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: '15px', color: S.t1 }}>Groundr</span>
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/microsite/stadsmakelaars" style={{ fontSize: '13px', color: S.t2, textDecoration: 'none' }}>Woningen</Link>
          <Link href="/markt/eindhoven" style={{ fontSize: '13px', color: S.t2, textDecoration: 'none' }}>Marktdata</Link>
          <Link href="/login" style={{ height: '32px', padding: '0 14px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13px', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Login</Link>
        </div>
      </nav>

      {/* Hero section */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: '64px 32px 48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: S.greenLt, border: `1px solid ${S.greenRim}`, color: S.greenTx, fontSize: '11px', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '20px' }}>
          <Home size={11}/> Gratis waardebepaling
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 600, color: S.t1, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '14px' }}>
          Wat is uw woning waard?
        </h1>
        <p style={{ fontSize: '16px', color: S.t2, maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          Voer uw adres in en krijg direct een gratis investeringsscore, buurtanalyse en waardeschatting op basis van CBS en BAG data.
        </p>

        {/* Search */}
        <div ref={wrapRef} style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', boxShadow: S.shadowMd }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: S.surface, border: `1px solid ${S.border}`, borderRight: 'none', padding: '0 16px' }}>
              <Search size={16} color={loading ? S.green : S.t3} style={{ flexShrink: 0 }}/>
              <input type="text" value={address} onChange={e => handleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Bijv. Stratumsedijk 23 Eindhoven"
                autoComplete="off"
                style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '15px', color: S.t1, background: 'transparent', padding: '14px 0' }}/>
            </div>
            <button onClick={() => handleSearch()} disabled={loading} style={{ height: '52px', padding: '0 28px', background: loading ? '#6EE7B7' : S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '15px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Laden...' : 'Analyseer →'}
            </button>
          </div>

          {/* Autocomplete */}
          {showSugg && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: S.surface, border: `1px solid ${S.border}`, borderTop: 'none', boxShadow: S.shadowMd, zIndex: 50 }}>
              {suggestions.map((s, i) => (
                <button key={s.id} type="button" onClick={() => { setAddress(s.weergavenaam); setShowSugg(false); handleSearch(s.weergavenaam) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', background: S.surface, border: 'none', borderBottom: i < suggestions.length - 1 ? `1px solid ${S.border}` : 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13.5px', color: S.t1 }}
                  onMouseEnter={e => (e.currentTarget.style.background = S.greenLt)}
                  onMouseLeave={e => (e.currentTarget.style.background = S.surface)}>
                  <MapPin size={13} color={S.green} style={{ flexShrink: 0 }}/>{s.weergavenaam}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ maxWidth: '600px', margin: '16px auto 0', padding: '10px 16px', background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)', color: S.red, fontSize: '13.5px', borderRadius: '0' }}>{error}</div>}
      </div>

      {/* Results */}
      {result && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px' }}>

          {/* Address header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <div style={{ width: '44px', height: '44px', background: S.greenLt, border: `1px solid ${S.greenRim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={20} color={S.green}/>
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: S.t1 }}>{result.property.street} {result.property.house_number}</h2>
              <p style={{ fontSize: '13px', color: S.t3 }}>{result.property.city}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>

            {/* Score card */}
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Investeringsscore</span>
              </div>
              <div style={{ padding: '28px 20px', textAlign: 'center', borderBottom: `1px solid ${S.border}` }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '72px', fontWeight: 500, color: scoreColor(result.score), lineHeight: 1, letterSpacing: '-4px' }}>{Math.round(result.score)}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '14px', color: S.t3, marginTop: '4px' }}>/100</div>
                <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 14px', background: scoreColor(result.score) === S.green ? S.greenLt : scoreColor(result.score) === S.amber ? S.amberLt : '#FEF2F2', color: scoreColor(result.score), fontSize: '13px', fontWeight: 500, border: `1px solid ${scoreColor(result.score)}30` }}>
                  {scoreLabel(result.score, true)}
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {Object.entries(result.factors).map(([key, val], i) => (
                  <div key={key} style={{ marginBottom: i < Object.keys(result.factors).length - 1 ? '10px' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: S.t2, textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 600, color: scoreColor(val) }}>{val}</span>
                    </div>
                    <div style={{ height: '4px', background: S.border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${val}%`, background: scoreColor(val), transition: 'width 0.7s' }}/>
                    </div>
                    {result.explanation[key] && <div style={{ fontSize: '11px', color: S.t3, marginTop: '2px' }}>{result.explanation[key]}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Right col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Neighbourhood stats */}
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={14} color={S.green}/>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Buurtanalyse (2km radius)</span>
                </div>
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {[
                    { label: 'Woningen in buurt', value: String(result.neighborhood.total_properties) },
                    { label: 'Gem. prijs / m²',   value: result.neighborhood.avg_price_per_m2 ? `€${Math.round(result.neighborhood.avg_price_per_m2).toLocaleString('nl-NL')}` : '—' },
                    { label: 'Geschat rendement', value: result.neighborhood.estimated_rental_yield ? `${result.neighborhood.estimated_rental_yield.toFixed(1)}%` : '—' },
                    { label: '% Appartementen',   value: `${result.neighborhood.pct_apartments.toFixed(0)}%` },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: '12px 14px', background: S.surface2, border: `1px solid ${S.border}` }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500, color: S.t1 }}>{s.value}</div>
                      <div style={{ fontSize: '11.5px', color: S.t3, marginTop: '3px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA — contact makelaar */}
              <div style={{ background: S.greenLt, border: `1px solid ${S.greenRim}`, padding: '24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <CheckCircle size={22} color={S.green} style={{ flexShrink: 0, marginTop: '2px' }}/>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: S.t1, marginBottom: '6px' }}>Wilt u een officiële taxatie?</h3>
                    <p style={{ fontSize: '13px', color: S.t2, lineHeight: 1.6, marginBottom: '16px' }}>
                      Deze score is gebaseerd op CBS en BAG data. Voor een NWWI-gecertificeerd taxatierapport kunt u contact opnemen met een Groundr makelaar.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link href="/microsite/stadsmakelaars" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 16px', background: S.green, color: 'white', textDecoration: 'none', fontSize: '13.5px', fontWeight: 500 }}>
                        Bekijk makelaar <ArrowRight size={14}/>
                      </Link>
                      <Link href="/submit/1" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 16px', background: S.surface, color: S.t1, textDecoration: 'none', border: `1px solid ${S.border}`, fontSize: '13.5px', fontWeight: 500 }}>
                        Woning aanmelden
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {result.amenities.length > 0 && (
                <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} color={S.green}/>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Voorzieningen in de buurt</span>
                  </div>
                  <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    {result.amenities.slice(0, 8).map((a, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${S.border}`, fontSize: '12.5px' }}>
                        <span style={{ color: S.t2 }}>{a.name}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: S.green, fontWeight: 500 }}>
                          {a.distance_m < 1000 ? `${Math.round(a.distance_m)}m` : `${(a.distance_m/1000).toFixed(1)}km`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '11.5px', color: S.t3, textAlign: 'center' }}>
            Gegevens afkomstig van CBS, BAG/PDOK en OpenStreetMap. Niet bindend. © {new Date().getFullYear()} Groundr B.V.
          </div>
        </div>
      )}

      {/* Empty state — USPs */}
      {!result && !loading && (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '56px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { icon: <BarChart2 size={22} color={S.green}/>, title: 'Investeringsscore', desc: '6-factor score op basis van huurrendement, WOZ-groei, energielabel en buurtdata.' },
              { icon: <MapPin size={22} color={S.green}/>, title: 'Buurtanalyse', desc: 'Gemiddelde prijs per m², huurrendement en woningsamenstelling in een 2km radius.' },
              { icon: <TrendingUp size={22} color={S.green}/>, title: 'Gratis & direct', desc: 'Geen registratie nodig. Gebaseerd op CBS, BAG en OpenStreetMap open data.' },
            ].map((item, i) => (
              <div key={i} style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, padding: '24px 20px' }}>
                <div style={{ marginBottom: '12px' }}>{item.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: S.t1, marginBottom: '6px' }}>{item.title}</div>
                <div style={{ fontSize: '12.5px', color: S.t2, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${S.border}`, background: S.surface, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
        <span style={{ fontSize: '12px', color: S.t3 }}>© {new Date().getFullYear()} Groundr B.V.</span>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/markt/eindhoven" style={{ fontSize: '12px', color: S.t3, textDecoration: 'none' }}>Marktdata Eindhoven</Link>
          <Link href="/privacy" style={{ fontSize: '12px', color: S.t3, textDecoration: 'none' }}>Privacy</Link>
        </div>
      </div>
    </div>
  )
}