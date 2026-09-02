'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Submission {
  id:            number
  reference?:    string
  asking_price?: number
  created_at:    string
  // The API nests these — see GET /api/submissions/pending
  property?: {
    street?:       string
    house_number?: string
    city?:         string
    area_m2?:      number
  }
  seller?: {
    full_name?: string
    email?:     string
  }
}

export default function ApprovalsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [actionId,    setActionId]    = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNote,  setRejectNote]  = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/submissions/pending`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSubmissions(data.submissions ?? [])
    } catch {
      setError('Could not load pending submissions.')
    } finally {
      setLoading(false)
    }
  }

  async function approve(id: number) {
    setActionId(id)
    try {
      const token = localStorage.getItem('groundr_token')
      await fetch(`${API_BASE}/api/submissions/${id}/approve`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setSubmissions(prev => prev.filter(s => s.id !== id))
    } finally { setActionId(null) }
  }

  async function reject(id: number) {
    setActionId(id)
    try {
      const token = localStorage.getItem('groundr_token')
      await fetch(`${API_BASE}/api/submissions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ note: rejectNote }),
      })
      setSubmissions(prev => prev.filter(s => s.id !== id))
      setRejectingId(null)
      setRejectNote('')
    } finally { setActionId(null) }
  }

  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          Approvals
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
          Review and approve incoming property submissions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
        <StatCard value={loading ? '—' : String(submissions.length)} label="Pending" color={submissions.length > 0 ? COLOR.warning : undefined} />
        <StatCard value="—" label="Approved this week" trend="up" />
      </div>

      <Card title="Pending submissions" icon={<Clock size={14} />}>
        {loading && <div style={{ padding: SPACE[8], textAlign: 'center', color: COLOR.textMuted, fontSize: '14px' }}>Loading…</div>}
        {error   && <div style={{ padding: SPACE[4], color: COLOR.dangerText, background: COLOR.dangerLight, borderRadius: RADIUS.md, fontSize: '13.5px' }}>{error}</div>}
        {!loading && !error && submissions.length === 0 && (
          <div style={{ padding: SPACE[10], textAlign: 'center', color: COLOR.textMuted }}>
            <CheckCircle size={32} color={COLOR.success} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px' }}>All caught up — no pending submissions.</p>
          </div>
        )}
        {submissions.map(s => (
          <div key={s.id} style={{ borderBottom: `1px solid ${COLOR.border}`, padding: `${SPACE[4]} 0` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: COLOR.textPrimary, marginBottom: '4px' }}>
                  {s.property?.street
                    ? `${s.property.street} ${s.property.house_number ?? ''}`.trim() +
                      (s.property.city ? `, ${s.property.city}` : '')
                    : `Submission #${s.id}`}
                </div>
                <div style={{ fontSize: '12.5px', color: COLOR.textMuted }}>
                  {s.seller?.full_name ?? s.seller?.email ?? 'Onbekende verkoper'}  ·  {new Date(s.created_at).toLocaleDateString('nl-NL')}{s.reference ? `  ·  ${s.reference}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: SPACE[2] }}>
                <Button size="sm" variant="primary" loading={actionId === s.id}
                  iconLeft={<CheckCircle size={12} />}
                  onClick={() => approve(s.id)}
                >
                  Approve
                </Button>
                <Button size="sm" variant="destructive"
                  iconLeft={<XCircle size={12} />}
                  onClick={() => setRejectingId(s.id)}
                >
                  Reject
                </Button>
              </div>
            </div>

            {rejectingId === s.id && (
              <div style={{ marginTop: SPACE[3], display: 'flex', gap: SPACE[2] }}>
                <input
                  type="text"
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Reason for rejection (optional)"
                  style={{ flex: 1, height: '32px', padding: `0 ${SPACE[3]}`, border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.md, fontSize: '13px', fontFamily: FONT.body, outline: 'none' }}
                />
                <Button size="sm" variant="destructive" loading={actionId === s.id} onClick={() => reject(s.id)}>
                  Confirm
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setRejectingId(null); setRejectNote('') }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}
