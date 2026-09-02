'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Plus, Eye, MessageSquare } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Listing {
  id:            number
  street:        string
  city:          string
  asking_price?: number | null
  status:        string
  viewing_count?: number
  bid_count?:    number
  created_at:    string
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:   { bg: COLOR.successLight, color: COLOR.successText },
  pending:  { bg: COLOR.warningLight, color: COLOR.warningText },
  sold:     { bg: COLOR.bgSurface2,   color: COLOR.textMuted   },
  inactive: { bg: COLOR.dangerLight,  color: COLOR.dangerText  },
}

export default function ListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/listings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setListings(data.listings ?? data ?? [])
    } catch {
      setError('Could not load listings.')
    } finally {
      setLoading(false)
    }
  }

  const active = listings.filter(l => l.status === 'active').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACE[6] }}>
        <div>
          <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
            Listings
          </h1>
          <p style={{ fontSize: '14px', color: COLOR.textMuted }}>Your active property portfolio.</p>
        </div>
        <Button variant="primary" iconLeft={<Plus size={14} />} onClick={() => router.push('/platform/approvals')}>
          New listing
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
        <StatCard value={loading ? '—' : String(listings.length)} label="Total listings" />
        <StatCard value={loading ? '—' : String(active)}          label="Active"           trend={active > 0 ? 'up' : 'neutral'} />
        <StatCard value={loading ? '—' : String(listings.filter(l => l.status === 'sold').length)} label="Sold this period" />
      </div>

      <Card title="All listings" icon={<Home size={14} />}>
        {loading && <div style={{ padding: SPACE[8], textAlign: 'center', color: COLOR.textMuted, fontSize: '14px' }}>Loading…</div>}
        {error   && <div style={{ padding: SPACE[4], color: COLOR.dangerText, background: COLOR.dangerLight, borderRadius: RADIUS.md, fontSize: '13.5px' }}>{error}</div>}
        {!loading && !error && listings.length === 0 && (
          <div style={{ padding: SPACE[10], textAlign: 'center', color: COLOR.textMuted }}>
            <Home size={32} color={COLOR.border} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', marginBottom: SPACE[3] }}>No listings yet.</p>
            <Button variant="ghost" onClick={() => router.push('/platform/approvals')}>
              Review pending submissions →
            </Button>
          </div>
        )}
        {!loading && listings.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                {['Address', 'Price', 'Status', 'Views', 'Bids', 'Listed', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: `${SPACE[2]} ${SPACE[3]}`, fontSize: '11px', fontWeight: 500, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listings.map(l => {
                const s = STATUS_STYLE[l.status] ?? STATUS_STYLE.pending
                return (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${COLOR.border}`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = COLOR.bgSurface2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13.5px', color: COLOR.textPrimary }}>
                      {l.street}, {l.city}
                    </td>
                    <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontFamily: FONT.mono, fontSize: '13px', color: COLOR.textPrimary }}>
                      {l.asking_price ? `€ ${l.asking_price.toLocaleString('nl-NL')}` : '—'}
                    </td>
                    <td style={{ padding: `${SPACE[3]} ${SPACE[3]}` }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: RADIUS.full, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13px', color: COLOR.textSecondary }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12} />{l.viewing_count ?? 0}</span>
                    </td>
                    <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13px', color: COLOR.textSecondary }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={12} />{l.bid_count ?? 0}</span>
                    </td>
                    <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '12.5px', color: COLOR.textMuted }}>
                      {new Date(l.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td style={{ padding: `${SPACE[3]} ${SPACE[3]}` }}>
                      <Button size="sm" variant="secondary" onClick={() => router.push(`/property/${l.id}`)}>View</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
