'use client'

import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Bid {
  id:          number
  amount:      number
  buyer_name?: string
  status:      string
  created_at:  string
}

interface ListingWithBids {
  id:          number
  address:     string
  bids:        Bid[]
  highest_bid: number | null
  bid_count:   number
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
      const res  = await fetch(`${API_BASE}/api/submissions`, { headers })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const subs = data.submissions ?? data ?? []

      const withBids = await Promise.all(subs.slice(0, 10).map(async (s: any) => {
        try {
          const bR   = await fetch(`${API_BASE}/api/submissions/${s.id}/bids`, { headers })
          const bD   = await bR.json()
          return { id: s.id, address: s.street ? `${s.street}, ${s.city ?? ''}` : `Submission #${s.id}`, bids: bD.bids ?? [], highest_bid: bD.highest_bid ?? null, bid_count: bD.count ?? 0 }
        } catch {
          return { id: s.id, address: `Submission #${s.id}`, bids: [], highest_bid: null, bid_count: 0 }
        }
      }))
      setListings(withBids.filter((l: ListingWithBids) => l.bid_count > 0))
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
                {['Buyer', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: `${SPACE[2]} ${SPACE[3]}`, fontSize: '11px', fontWeight: 500, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {l.bids.map(b => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13.5px', color: COLOR.textPrimary }}>{b.buyer_name ?? `Buyer #${b.id}`}</td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontFamily: FONT.mono, fontSize: '13.5px', color: COLOR.brand, fontWeight: 500 }}>
                    € {b.amount.toLocaleString('nl-NL')}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}` }}>
                    <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: RADIUS.full, background: COLOR.bgSurface2, color: COLOR.textMuted, textTransform: 'capitalize' }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '12.5px', color: COLOR.textMuted }}>
                    {new Date(b.created_at).toLocaleDateString('nl-NL')}
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
