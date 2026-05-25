'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Eye, Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react'

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', amberLt: '#FFFBEB',
  red: '#DC2626', blue: '#2563EB',
  shadow: '0 1px 3px rgba(11,19,32,0.06)', shadowMd: '0 2px 12px rgba(11,19,32,0.08)',
}

interface Submission {
  id: number; reference: string; street: string; house_number: string; city: string
  area_m2: number | null; asking_price: number | null; urgency: string; status: string
  created_at: string; bid_count: number; highest_bid: number | null
  viewing_count: number; confirmed_viewings: number; melding_count: number; conversion_rate: number
}

interface Listing { id: number; street: string; house_number: string; city: string; asking_price: number | null; status: string; days_on_market: number }

interface Totals { listings: number; submissions: number; total_bids: number; total_viewings: number; total_meldingen: number; avg_days_on_market: number }

function formatPrice(p: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p) }

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, padding: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '28px', fontWeight: 500, color: color || S.t1, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: S.t3, marginTop: '5px' }}>{sub}</div>}
    </div>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', background: S.border, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: S.t3, width: '20px', textAlign: 'right' }}>{value}</span>
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
      const res  = await fetch('http://localhost:8000/api/listings/analytics/summary', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setTotals(data.totals); setSubmissions(data.submissions || []); setListings(data.listings || [])
    } catch {}
    finally { setLoading(false) }
  }

  const sorted      = [...submissions].sort((a, b) => sortBy === 'bids' ? b.bid_count - a.bid_count : sortBy === 'viewings' ? b.viewing_count - a.viewing_count : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const maxBids     = Math.max(...submissions.map(s => s.bid_count), 1)
  const maxViewings = Math.max(...submissions.map(s => s.viewing_count), 1)

  const domColor = (d: number) => d > 60 ? S.red : d > 30 ? S.amber : S.green

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>

      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: '56px', display: 'flex', alignItems: 'center', gap: '16px', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: S.shadow }}>
        <Link href="/dashboard" style={{ color: S.t3, display: 'flex', alignItems: 'center' }}><ArrowLeft size={16} /></Link>
        <img src="/logo.svg" alt="Groundr" style={{ height: '32px', width: 'auto' }} />
        <span style={{ color: S.border }}>·</span>
        <span style={{ fontSize: '13.5px', color: S.t2 }}>Analytics</span>
      </nav>

      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: S.t1, letterSpacing: '-0.3px' }}>Prestatie overzicht</h1>
          <p style={{ fontSize: '13px', color: S.t3, marginTop: '3px' }}>Biedingen, bezichtigingen en conversies per woning</p>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '48px', color: S.t3, fontSize: '13px' }}>Laden...</div>}

        {!loading && totals && (
          <>
            {/* KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, background: S.border, border: `1px solid ${S.border}`, marginBottom: '28px', boxShadow: S.shadow }}>
              <StatCard label="Totaal biedingen"            value={totals.total_bids}           sub={`${totals.submissions} actieve woningen`}   color={S.green} />
              <StatCard label="Bezichtigingen aangevraagd"  value={totals.total_viewings}        sub="via viewing scheduler"                       color={S.green} />
              <StatCard label="Gem. dagen op markt"         value={totals.avg_days_on_market}    sub={`${totals.listings} listings totaal`}        color={totals.avg_days_on_market > 30 ? S.amber : S.green} />
            </div>

            {/* Property performance */}
            {submissions.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: S.t1 }}>Woning prestaties</h2>
                  <div style={{ display: 'flex', gap: 0, border: `1px solid ${S.border}`, boxShadow: S.shadow }}>
                    {(['date', 'bids', 'viewings'] as const).map((s, i) => (
                      <button key={s} onClick={() => setSortBy(s)} style={{
                        height: '30px', padding: '0 12px', fontSize: '12px', fontWeight: 500,
                        background: sortBy === s ? S.greenLt : S.surface,
                        color: sortBy === s ? S.greenTx : S.t3,
                        border: 'none', borderRight: i < 2 ? `1px solid ${S.border}` : 'none',
                        cursor: 'pointer',
                      }}>
                        {s === 'date' ? 'Datum' : s === 'bids' ? 'Biedingen' : 'Bezichtigingen'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sorted.map(sub => (
                    <div key={sub.id} style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'background 0.12s' }}
                        onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                        onMouseEnter={e => (e.currentTarget.style.background = S.surface2)}
                        onMouseLeave={e => (e.currentTarget.style.background = S.surface)}>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: S.t1 }}>{sub.street} {sub.house_number}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: S.t3 }}>{sub.reference}</span>
                            {sub.urgency !== 'normal' && (
                              <span style={{ fontSize: '10.5px', fontWeight: 500, padding: '2px 7px', background: sub.urgency === 'asap' ? '#FEF2F2' : S.amberLt, color: sub.urgency === 'asap' ? S.red : S.amber, border: `1px solid ${sub.urgency === 'asap' ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)'}` }}>
                                {sub.urgency === 'asap' ? 'Moet weg' : 'Urgent'}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: S.t3 }}>
                            <MapPin size={10} />{sub.city}
                            {sub.area_m2 && <span style={{ marginLeft: '6px' }}>{sub.area_m2} m²</span>}
                            {sub.asking_price && <span style={{ marginLeft: '6px' }}>{formatPrice(sub.asking_price)}</span>}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: '16px', flexShrink: 0 }}>
                          {[
                            { val: sub.bid_count,      label: 'biedingen',      color: S.green, bar: { v: sub.bid_count, m: maxBids, c: S.green } },
                            { val: sub.viewing_count,  label: 'bezichtigingen', color: S.t1,    bar: { v: sub.viewing_count, m: maxViewings, c: S.blue } },
                            { val: `${sub.conversion_rate}%`, label: 'conversie', color: sub.conversion_rate >= 50 ? S.green : sub.conversion_rate > 0 ? S.amber : S.t3, bar: null },
                          ].map((item, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '20px', fontWeight: 500, color: item.color }}>{item.val}</div>
                              <div style={{ fontSize: '11px', color: S.t3, marginBottom: '4px' }}>{item.label}</div>
                              {item.bar && <Bar value={item.bar.v} max={item.bar.m} color={item.bar.c} />}
                            </div>
                          ))}
                        </div>

                        <div style={{ color: S.t3, flexShrink: 0 }}>
                          {expanded === sub.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {expanded === sub.id && (
                        <div style={{ borderTop: `1px solid ${S.border}`, padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: S.surface2 }}>
                          {[
                            { label: 'Hoogste bod',              value: sub.highest_bid ? formatPrice(sub.highest_bid) : '—', color: sub.highest_bid ? S.green : S.t3 },
                            { label: 'Bevestigde bezichtigingen', value: sub.confirmed_viewings, color: S.t1 },
                            { label: 'Meldingen',                value: sub.melding_count,       color: sub.melding_count > 0 ? S.amber : S.t3 },
                            { label: 'Status',                   value: sub.status === 'approved' ? 'Goedgekeurd' : sub.status, color: sub.status === 'approved' ? S.green : S.amber },
                          ].map((item, i) => (
                            <div key={i}>
                              <div style={{ fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.label}</div>
                              <div style={{ fontFamily: i < 2 ? "'DM Mono', monospace" : 'inherit', fontSize: '14px', fontWeight: 500, color: item.color }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Days on market */}
            {listings.length > 0 && (
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: S.t1, marginBottom: '14px' }}>Listings — dagen op markt</h2>
                <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
                  {listings.map((l, i) => (
                    <div key={l.id} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: i < listings.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1 }}>{l.street} {l.house_number}</div>
                        <div style={{ fontSize: '12px', color: S.t3 }}>{l.city}</div>
                      </div>
                      {l.asking_price && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', color: S.t1 }}>{formatPrice(l.asking_price)}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <div style={{ width: '100px', height: '4px', background: S.border, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(l.days_on_market / 90 * 100, 100)}%`, background: domColor(l.days_on_market) }} />
                        </div>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', fontWeight: 500, color: domColor(l.days_on_market), width: '32px', textAlign: 'right' }}>{l.days_on_market}d</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submissions.length === 0 && listings.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', background: S.surface, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: S.shadow }}>
                  <TrendingUp size={22} color={S.green} />
                </div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: S.t1, marginBottom: '4px' }}>Nog geen data</p>
                <p style={{ fontSize: '13px', color: S.t3 }}>Voeg listings toe en keur aanmeldingen goed om analytics te zien.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}