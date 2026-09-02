// app/markt/eindhoven/page.tsx
// Public market trends dashboard for Eindhoven
// SEO gold — positions Groundr as authoritative data source

'use client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Home, BarChart2, ArrowRight, Zap } from 'lucide-react'

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', red: '#DC2626',
  shadow: '0 1px 3px rgba(11,19,32,0.06)',
}

function formatPrice(p: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p) }

function PriceChart({ history }: { history: { year: number; avg_price: number; median_price: number }[] }) {
  if (!history.length) return null
  const W = 600, H = 140, pad = { t: 10, r: 10, b: 28, l: 10 }
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
  const max = Math.max(...history.map(h => h.avg_price))
  const min = Math.min(...history.map(h => h.avg_price)) * 0.9

  function pts(key: 'avg_price' | 'median_price') {
    return history.map((h, i) => ({
      x: pad.l + (i / (history.length - 1)) * cw,
      y: pad.t + (1 - (h[key] - min) / (max - min)) * ch,
      val: h[key], year: h.year,
    }))
  }

  const avgPts = pts('avg_price')
  const medPts = pts('median_price')
  const avgPath = avgPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const medPath = medPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${avgPath} L ${avgPts[avgPts.length-1].x} ${H-pad.b} L ${avgPts[0].x} ${H-pad.b} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '120px' }}>
      <defs>
        <linearGradient id="mktFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={S.green} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={S.green} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#mktFill)"/>
      <path d={avgPath} fill="none" stroke={S.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={medPath} fill="none" stroke={S.amber} strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
      {avgPts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={S.green}/>
          <text x={p.x} y={H - 6} textAnchor="middle" fontSize="9" fill={S.t3}>{p.year}</text>
        </g>
      ))}
    </svg>
  )
}

export default function MarktEindhovenPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(API_BASE+'/api/market/eindhoven')
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const ENERGY_COLORS: Record<string, string> = {
    'A++': '#047857', 'A+': '#059669', 'A': '#10b981',
    'B': '#84cc16', 'C': '#eab308', 'D': '#f97316',
    'E': '#ef4444', 'F': '#dc2626', 'G': '#991b1b',
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
          <Link href="/mijnwoning" style={{ fontSize: '13px', color: S.t2, textDecoration: 'none' }}>Mijn woning</Link>
          <Link href="/microsite/stadsmakelaars" style={{ fontSize: '13px', color: S.t2, textDecoration: 'none' }}>Woningen</Link>
          <Link href="/login" style={{ height: '32px', padding: '0 14px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13px', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Login</Link>
        </div>
      </nav>

      {/* Header */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, padding: '48px 32px 36px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: S.greenLt, border: `1px solid ${S.greenRim}`, color: S.greenTx, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
            <BarChart2 size={11}/> Marktdata
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 600, color: S.t1, letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Woningmarkt Eindhoven
          </h1>
          <p style={{ fontSize: '14px', color: S.t2, maxWidth: '560px' }}>
            Prijsontwikkeling, woningtypes en energielabels op basis van CBS WOZ-data en het BAG-register. Bijgewerkt jaarlijks.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>

        {loading && <div style={{ textAlign: 'center', padding: '64px', color: S.t3, fontSize: '13px' }}>Laden...</div>}

        {!loading && data && (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, background: S.border, border: `1px solid ${S.border}`, marginBottom: '24px', boxShadow: S.shadow }}>
              {[
                { label: 'Gem. WOZ-waarde', value: data.stats.current_avg ? formatPrice(data.stats.current_avg) : '—', color: S.t1 },
                { label: 'Mediaan WOZ', value: data.stats.current_median ? formatPrice(data.stats.current_median) : '—', color: S.t1 },
                { label: `Stijging ${data.stats.data_from}–${data.stats.data_to}`, value: data.stats.pct_change_total ? `+${data.stats.pct_change_total}%` : '—', color: S.green },
                { label: 'Jaar-op-jaar', value: data.stats.yoy_change ? `${data.stats.yoy_change > 0 ? '+' : ''}${data.stats.yoy_change}%` : '—', color: data.stats.yoy_change >= 0 ? S.green : S.red },
              ].map((s, i) => (
                <div key={i} style={{ background: S.surface, padding: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{s.label}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 500, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Price history chart */}
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, marginBottom: '20px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={14} color={S.green}/>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>WOZ-prijsontwikkeling Eindhoven</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: S.t3 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '2px', background: S.green, display: 'inline-block' }}/> Gemiddeld</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '2px', background: S.amber, display: 'inline-block', opacity: 0.7 }}/> Mediaan</span>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <PriceChart history={data.history}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: S.t3 }}>
                  <span>Bron: CBS WOZ-data via PDOK</span>
                  <span>{data.total_properties} woningen in dataset</span>
                </div>
              </div>
            </div>

            {/* Property types + energy labels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

              {/* Property types */}
              {data.property_types?.length > 0 && (
                <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Home size={14} color={S.green}/>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Woningtypes</span>
                  </div>
                  <div style={{ padding: '14px 20px' }}>
                    {data.property_types.map((t: any, i: number) => {
                      const total = data.property_types.reduce((s: number, x: any) => s + x.count, 0)
                      const pct   = Math.round(t.count / total * 100)
                      return (
                        <div key={i} style={{ marginBottom: i < data.property_types.length - 1 ? '10px' : 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12.5px' }}>
                            <span style={{ color: S.t2, textTransform: 'capitalize' }}>{t.type}</span>
                            <span style={{ color: S.t3, fontFamily: 'monospace' }}>{pct}%</span>
                          </div>
                          <div style={{ height: '4px', background: S.border, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: S.green }}/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Energy labels */}
              {data.energy_labels?.length > 0 && (
                <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={14} color={S.green}/>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Energielabels</span>
                  </div>
                  <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {data.energy_labels.map((e: any) => {
                      const total = data.energy_labels.reduce((s: number, x: any) => s + x.count, 0)
                      const pct   = Math.round(e.count / total * 100)
                      const color = ENERGY_COLORS[e.label] || S.t3
                      return (
                        <div key={e.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 14px', background: `${color}15`, border: `1px solid ${color}40`, minWidth: '56px' }}>
                          <span style={{ fontWeight: 700, fontSize: '16px', color }}>{e.label}</span>
                          <span style={{ fontSize: '10px', color: S.t3, marginTop: '2px' }}>{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, padding: '24px', boxShadow: S.shadow, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: S.t1, marginBottom: '5px' }}>Wat is uw woning waard?</div>
                <p style={{ fontSize: '13px', color: S.t2 }}>Voer uw adres in voor een gratis investeringsscore en buurtanalyse.</p>
              </div>
              <Link href="/mijnwoning" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 18px', background: S.green, color: 'white', textDecoration: 'none', fontSize: '13.5px', fontWeight: 500, flexShrink: 0 }}>
                Analyseer mijn woning <ArrowRight size={14}/>
              </Link>
            </div>

            <div style={{ marginTop: '20px', fontSize: '11.5px', color: S.t3, textAlign: 'center' }}>
              Gegevens: CBS WOZ-statistieken · BAG/PDOK · OpenStreetMap · {data.stats.data_to} · © {new Date().getFullYear()} Groundr B.V.
            </div>
          </>
        )}
      </div>
    </div>
  )
}