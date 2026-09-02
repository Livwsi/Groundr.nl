'use client'

import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface ViewingRequest {
  id:           number
  property_id:  number
  buyer_name?:  string
  buyer_email?: string
  status:       'pending' | 'confirmed' | 'rejected'
  requested_at: string
}

interface Slot {
  id:         number
  date:       string
  start_time: string
  end_time:   string
  booked:     boolean
}

export default function ViewingsPage() {
  const [requests,  setRequests]  = useState<ViewingRequest[]>([])
  const [slots,     setSlots]     = useState<Slot[]>([])
  const [loading,   setLoading]   = useState(true)
  const [actionId,  setActionId]  = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const token   = localStorage.getItem('groundr_token')
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const [rR, sR] = await Promise.all([
        fetch(`${API_BASE}/api/viewings/requests`,      { headers }),
        fetch(`${API_BASE}/api/viewings/availability/1`, { headers }),
      ])
      const [rD, sD] = await Promise.all([rR.json(), sR.json()])
      setRequests(rD.requests ?? [])
      setSlots(sD.slots ?? [])
    } catch { /* show empty state */ } finally {
      setLoading(false)
    }
  }

  async function confirm(id: number) {
    setActionId(id)
    const token = localStorage.getItem('groundr_token')
    await fetch(`${API_BASE}/api/viewings/${id}/confirm`, {
      method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed' } : r))
    setActionId(null)
  }

  async function reject(id: number) {
    setActionId(id)
    const token = localStorage.getItem('groundr_token')
    await fetch(`${API_BASE}/api/viewings/${id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ note: '' }),
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r))
    setActionId(null)
  }

  const pending   = requests.filter(r => r.status === 'pending').length
  const confirmed = requests.filter(r => r.status === 'confirmed').length

  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          Viewings
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>Manage viewing requests and availability slots.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
        <StatCard value={loading ? '—' : String(pending)}          label="Pending requests" color={pending > 0 ? COLOR.warning : undefined} />
        <StatCard value={loading ? '—' : String(confirmed)}        label="Confirmed" trend={confirmed > 0 ? 'up' : 'neutral'} />
        <StatCard value={loading ? '—' : String(slots.filter(s => !s.booked).length)} label="Open slots" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: SPACE[4] }}>
        <Card title="Viewing requests" icon={<Calendar size={14} />}>
          {loading && <div style={{ padding: SPACE[8], textAlign: 'center', color: COLOR.textMuted, fontSize: '14px' }}>Loading…</div>}
          {!loading && requests.length === 0 && (
            <div style={{ padding: SPACE[10], textAlign: 'center', color: COLOR.textMuted, fontSize: '13.5px' }}>
              No viewing requests yet.
            </div>
          )}
          {requests.map(r => (
            <div key={r.id} style={{ borderBottom: `1px solid ${COLOR.border}`, padding: `${SPACE[4]} 0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: COLOR.textPrimary, marginBottom: '4px' }}>
                  {r.buyer_name ?? r.buyer_email ?? `Buyer #${r.id}`}
                </div>
                <div style={{ fontSize: '12px', color: COLOR.textMuted }}>
                  Property #{r.property_id}  ·  {new Date(r.requested_at).toLocaleDateString('nl-NL')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                {r.status === 'pending' ? (
                  <>
                    <Button size="sm" variant="primary"     loading={actionId === r.id} onClick={() => confirm(r.id)} iconLeft={<CheckCircle size={12} />}>Confirm</Button>
                    <Button size="sm" variant="destructive" loading={actionId === r.id} onClick={() => reject(r.id)}  iconLeft={<XCircle size={12} />}>Reject</Button>
                  </>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'capitalize', color: r.status === 'confirmed' ? COLOR.successText : COLOR.dangerText }}>
                    {r.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </Card>

        <Card title="Availability slots" icon={<Clock size={14} />}>
          {slots.length === 0 && !loading && (
            <div style={{ padding: SPACE[4], color: COLOR.textMuted, fontSize: '13px' }}>No slots configured.</div>
          )}
          {slots.map(s => (
            <div key={s.id} style={{ borderBottom: `1px solid ${COLOR.border}`, padding: `${SPACE[3]} 0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: COLOR.textPrimary }}>
                  {new Date(s.date).toLocaleDateString('nl-NL', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: '12px', color: COLOR.textMuted }}>{s.start_time} – {s.end_time}</div>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: RADIUS.full,
                background: s.booked ? COLOR.warningLight : COLOR.successLight,
                color:      s.booked ? COLOR.warningText  : COLOR.successText,
              }}>
                {s.booked ? 'Booked' : 'Free'}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
