'use client'

import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Bids are sealed: GET /api/submissions/{id}/bids returns amounts and
// timestamps only, never bidder identity.
interface Bid {
  amount:      number
  placed_at:   string
  updated_at?: string | null
}

interface ListingWithBids {
  id:            number
  address:       string
  reference?:    string
  asking_price?: number | null
  bids:          Bid[]
  highest_bid:   number | null
  bid_count:     number
}

export default function BidsPage() {
  const [listings, setListings] = useState<ListingWithBids[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const token   = localStorage.getItem('groundr_token')
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      // The analytics summary already carries bid_count and highest_bid per
      // submission. This used to GET /api/submissions (POST-only, so it 405'd)
      // and then fetch bids one submission at a time.
      const res  = await fetch(`${API_BASE}/api/listings/analytics/summary`, { headers })
      if (!res.ok) throw new Error()
      const data = await res.json()

      const withBids: ListingWithBids[] = (data.submissions ?? [])
        .filter((s: any) => (s.bid_count ?? 0) > 0)
        .map((s: any) => ({
          id:          s.id,
          address:     s.street
            ? `${s.street} ${s.house_number ?? ''}`.trim() + (s.city ? `, ${s.city}` : '')
            : s.reference ?? `Submission #${s.id}`,
          reference:   s.reference,
          asking_price: s.asking_price ?? null,
          bids:        [],
          highest_bid: s.highest_bid ?? null,
          bid_count:   s.bid_count ?? 0,
        }))

      // Bid detail lives on a per-submission route; only fetch it for the
      // submissions that actually have bids.
      await Promise.all(withBids.map(async (l) => {
        try {
          const bR = await fetch(`${API_BASE}/api/submissions/${l.id}/bids`, { headers })
          if (!bR.ok) return
          const bD = await bR.json()
          l.bids = bD.bids ?? []
        } catch { /* keep the summary figures */ }
      }))

      setListings(withBids)
    } catch { /* empty state */ } finally {
      setLoading(false)
    }
  }

  const totalBids    = listings.reduce((sum, l) => sum + l.bid_count, 0)
  const highestOverall = listings.reduce((max, l) => l.highest_bid && l.highest_bid > max ? l.highest_bid : max, 0)

  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          Bids
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>All bids across your listings.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
        <StatCard value={loading ? '—' : String(listings.length)}  label="Listings with bids" />
        <StatCard value={loading ? '—' : String(totalBids)}         label="Total bids" trend={totalBids > 0 ? 'up' : 'neutral'} />
        <StatCard value={loading ? '—' : highestOverall > 0 ? `€ ${highestOverall.toLocaleString('nl-NL')}` : '—'} label="Highest bid" />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: SPACE[8], color: COLOR.textMuted }}>Loading…</div>}
      {!loading && listings.length === 0 && (
        <Card>
          <div style={{ padding: SPACE[10], textAlign: 'center', color: COLOR.textMuted }}>
            <TrendingUp size={32} color={COLOR.border} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px' }}>No bids received yet.</p>
          </div>
        </Card>
      )}

      {listings.map(l => (
        <Card key={l.id} title={l.address} style={{ marginBottom: SPACE[4] }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                {['#', 'Amount', 'Placed'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: `${SPACE[2]} ${SPACE[3]}`, fontSize: '11px', fontWeight: 500, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...l.bids].sort((a, b) => b.amount - a.amount).map((b, i) => (
                <tr key={`${l.id}-${b.placed_at}-${b.amount}`} style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontFamily: FONT.mono, fontSize: '13px', color: COLOR.textMuted }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontFamily: FONT.mono, fontSize: '13.5px', color: COLOR.brand, fontWeight: 500 }}>
                    € {b.amount.toLocaleString('nl-NL')}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '12.5px', color: COLOR.textMuted }}>
                    {new Date(b.placed_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  )
}
