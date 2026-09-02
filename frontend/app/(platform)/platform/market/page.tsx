'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, MapPin } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface MarketData {
  city?:               string
  avg_price_per_m2?:   number
  median_woz?:         number
  total_properties?:   number
  pct_apartments?:     number
  pct_houses?:         number
  rental_yield_est?:   number
  price_growth_6y?:    number
  segments?:           { label: string; count: number; avg_price: number }[]
}

export default function MarketPage() {
  const [data,    setData]    = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/market`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const d = await res.json()
      setData(d.market ?? d ?? null)
    } catch {
      setError('Could not load market data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          Market data
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
          Dutch real estate market intelligence. Powered by BAG, CBS & PDOK data.
        </p>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: SPACE[10], color: COLOR.textMuted }}>Loading market data…</div>}

      {error && (
        <Card>
          <div style={{ padding: SPACE[8], textAlign: 'center', color: COLOR.textMuted }}>
            <TrendingUp size={32} color={COLOR.border} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', marginBottom: SPACE[2] }}>Market data is loading.</p>
            <p style={{ fontSize: '13px' }}>
              Visit the <a href="/markt/eindhoven" style={{ color: COLOR.brand, textDecoration: 'none' }}>Eindhoven market page</a> for detailed insights.
            </p>
          </div>
        </Card>
      )}

      {data && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
            <StatCard
              value={data.avg_price_per_m2 ? `€ ${Math.round(data.avg_price_per_m2).toLocaleString('nl-NL')}` : '—'}
              label="Avg price / m²"
            />
            <StatCard
              value={data.median_woz ? `€ ${Math.round(data.median_woz / 1000)}k` : '—'}
              label="Median WOZ"
            />
            <StatCard
              value={data.rental_yield_est ? `${data.rental_yield_est.toFixed(1)}%` : '—'}
              label="Rental yield est."
              trend={data.rental_yield_est && data.rental_yield_est > 5 ? 'up' : 'neutral'}
            />
            <StatCard
              value={data.price_growth_6y ? `${data.price_growth_6y > 0 ? '+' : ''}${data.price_growth_6y.toFixed(1)}%` : '—'}
              label="Price growth (6 yr)"
              trend={data.price_growth_6y && data.price_growth_6y > 0 ? 'up' : 'down'}
            />
          </div>

          {data.segments && data.segments.length > 0 && (
            <Card title="Market segments" icon={<MapPin size={14} />}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                    {['Segment', 'Properties', 'Avg price'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: `${SPACE[2]} ${SPACE[3]}`, fontSize: '11px', fontWeight: 500, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.segments.map(seg => (
                    <tr key={seg.label} style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                      <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13.5px', color: COLOR.textPrimary }}>{seg.label}</td>
                      <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13px', color: COLOR.textSecondary }}>{seg.count.toLocaleString('nl-NL')}</td>
                      <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontFamily: FONT.mono, fontSize: '13px', color: COLOR.textPrimary }}>
                        € {Math.round(seg.avg_price).toLocaleString('nl-NL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Always show link to full market page */}
      <Card style={{ marginTop: SPACE[4] }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: COLOR.textPrimary, marginBottom: '4px' }}>
              Eindhoven market report
            </div>
            <div style={{ fontSize: '13px', color: COLOR.textMuted }}>
              Full neighbourhood analysis with BAG data, WOZ trends, and comparables.
            </div>
          </div>
          <a href="/markt/eindhoven" style={{ fontSize: '13.5px', color: COLOR.brand, textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
            Open report →
          </a>
        </div>
      </Card>
    </div>
  )
}
