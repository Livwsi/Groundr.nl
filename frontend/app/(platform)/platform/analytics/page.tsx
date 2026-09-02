'use client'

import { useState, useEffect } from 'react'
import { BarChart2, TrendingUp, Eye, MessageSquare } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Totals {
  total_listings:    number
  total_submissions: number
  total_viewings:    number
  total_bids:        number
  avg_days_to_sale?: number
}

interface SubmissionStat {
  id:            number
  street:        string
  city:          string
  bid_count:     number
  viewing_count: number
  created_at:    string
}

export default function AnalyticsPage() {
  const [totals,      setTotals]      = useState<Totals | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionStat[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/listings/analytics/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTotals(data.totals ?? null)
      setSubmissions(data.submissions ?? [])
    } catch {
      setError('Could not load analytics data.')
    } finally {
      setLoading(false)
    }
  }

  const maxBids     = Math.max(...submissions.map(s => s.bid_count), 1)
  const maxViewings = Math.max(...submissions.map(s => s.viewing_count), 1)

  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          Analytics
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>Performance overview for your listings portfolio.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
        <StatCard value={loading ? '—' : String(totals?.total_listings    ?? 0)} label="Total listings" />
        <StatCard value={loading ? '—' : String(totals?.total_submissions ?? 0)} label="Submissions" />
        <StatCard value={loading ? '—' : String(totals?.total_viewings    ?? 0)} label="Viewings" trend="up" />
        <StatCard value={loading ? '—' : String(totals?.total_bids        ?? 0)} label="Bids received" trend="up" />
      </div>

      {error && <div style={{ color: COLOR.dangerText, fontSize: '13.5px', marginBottom: SPACE[4] }}>{error}</div>}

      {/* Submissions table */}
      <Card title="Listing performance" icon={<BarChart2 size={14} />}>
        {loading && <div style={{ padding: SPACE[8], textAlign: 'center', color: COLOR.textMuted }}>Loading…</div>}
        {!loading && submissions.length === 0 && (
          <div style={{ padding: SPACE[8], textAlign: 'center', color: COLOR.textMuted, fontSize: '14px' }}>No data yet.</div>
        )}
        {submissions.map(s => (
          <div key={s.id} style={{ borderBottom: `1px solid ${COLOR.border}`, padding: `${SPACE[4]} 0` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE[2] }}>
              <div style={{ fontSize: '13.5px', fontWeight: 500, color: COLOR.textPrimary }}>{s.street}, {s.city}</div>
              <div style={{ display: 'flex', gap: SPACE[4], fontSize: '12.5px', color: COLOR.textMuted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12} />{s.viewing_count}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={12} />{s.bid_count}</span>
              </div>
            </div>
            {/* Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[1] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                <span style={{ fontSize: '11px', color: COLOR.textMuted, width: '55px' }}>Viewings</span>
                <div style={{ flex: 1, height: '6px', background: COLOR.bgSurface2, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(s.viewing_count / maxViewings) * 100}%`, height: '100%', background: COLOR.info, transition: 'width 0.3s' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                <span style={{ fontSize: '11px', color: COLOR.textMuted, width: '55px' }}>Bids</span>
                <div style={{ flex: 1, height: '6px', background: COLOR.bgSurface2, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(s.bid_count / maxBids) * 100}%`, height: '100%', background: COLOR.brand, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
