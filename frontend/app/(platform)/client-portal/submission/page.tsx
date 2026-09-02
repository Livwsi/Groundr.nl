'use client'

import { useState, useEffect } from 'react'
import { Home, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { useAuth } from '@/store/auth'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Submission {
  id:          number
  street?:     string
  city?:       string
  status:      'pending' | 'approved' | 'rejected' | 'active'
  created_at:  string
  bid_count?:  number
  highest_bid?: number | null
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:  { label: 'Under review',  color: COLOR.warningText,  bg: COLOR.warningLight,  icon: <Clock size={14} />        },
  approved: { label: 'Approved',      color: COLOR.successText,  bg: COLOR.successLight,  icon: <CheckCircle size={14} />  },
  active:   { label: 'Listed',        color: COLOR.brandText,    bg: COLOR.brandLight,    icon: <Home size={14} />         },
  rejected: { label: 'Not accepted',  color: COLOR.dangerText,   bg: COLOR.dangerLight,   icon: <XCircle size={14} />      },
}

const TIMELINE = [
  { label: 'Submitted',      done: true  },
  { label: 'Under review',   done: true  },
  { label: 'Makelaar visit', done: false },
  { label: 'Listed',         done: false },
  { label: 'Offers in',      done: false },
  { label: 'Sold',           done: false },
]

export default function SubmissionPage() {
  const { user } = useAuth()
  const [sub,     setSub]     = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/submissions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list: Submission[] = data.submissions ?? data ?? []
      setSub(list[0] ?? null)
    } catch {
      setError('Could not load your submission.')
    } finally {
      setLoading(false)
    }
  }

  const meta = sub ? (STATUS_META[sub.status] ?? STATUS_META.pending) : null

  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          My submission
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
          Track the status of your property submission.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: SPACE[10], color: COLOR.textMuted }}>Loading…</div>
      )}
      {error && (
        <div style={{ padding: SPACE[4], color: COLOR.dangerText, background: COLOR.dangerLight, borderRadius: RADIUS.md, fontSize: '13.5px', marginBottom: SPACE[4] }}>
          {error}
        </div>
      )}

      {!loading && !sub && !error && (
        <Card>
          <div style={{ textAlign: 'center', padding: SPACE[10], color: COLOR.textMuted }}>
            <Home size={40} color={COLOR.border} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '15px', marginBottom: SPACE[2], color: COLOR.textSecondary }}>No submission found.</p>
            <p style={{ fontSize: '13px' }}>
              Submit your property via your makelaar's intake link.
            </p>
          </div>
        </Card>
      )}

      {sub && meta && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: SPACE[4] }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[4] }}>
            {/* Status card */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[4] }}>
                <div style={{ width: '48px', height: '48px', background: meta.bg, border: `1px solid ${meta.color}33`, borderRadius: RADIUS.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
                    Current status
                  </div>
                  <div style={{ fontSize: '20px', fontFamily: FONT.display, color: COLOR.textPrimary }}>
                    {meta.label}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: COLOR.textMuted }}>Submitted</div>
                  <div style={{ fontSize: '13.5px', color: COLOR.textPrimary }}>{new Date(sub.created_at).toLocaleDateString('nl-NL')}</div>
                </div>
              </div>
            </Card>

            {/* Address */}
            {(sub.street || sub.city) && (
              <Card title="Property">
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <Home size={18} color={COLOR.brand} />
                  <span style={{ fontSize: '15px', color: COLOR.textPrimary }}>
                    {[sub.street, sub.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              </Card>
            )}

            {/* Timeline */}
            <Card title="Progress">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {TIMELINE.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: SPACE[3], padding: `${SPACE[3]} 0`, borderBottom: i < TIMELINE.length - 1 ? `1px solid ${COLOR.border}` : 'none' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: step.done ? COLOR.brand : COLOR.bgSurface2, border: `2px solid ${step.done ? COLOR.brand : COLOR.border}`, flexShrink: 0 }} />
                    <span style={{ fontSize: '13.5px', color: step.done ? COLOR.textPrimary : COLOR.textMuted, fontWeight: step.done ? 500 : 400 }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[4] }}>
            <StatCard value={String(sub.bid_count ?? 0)} label="Bids received" trend={sub.bid_count && sub.bid_count > 0 ? 'up' : 'neutral'} />
            <StatCard
              value={sub.highest_bid ? `€ ${sub.highest_bid.toLocaleString('nl-NL')}` : '—'}
              label="Highest bid"
              color={sub.highest_bid ? COLOR.success : undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}
