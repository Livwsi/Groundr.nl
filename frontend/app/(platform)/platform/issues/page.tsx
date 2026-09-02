'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Melding {
  id:           number
  title?:       string
  description?: string
  status:       'open' | 'resolved' | 'closed'
  created_at:   string
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  open:     { bg: COLOR.dangerLight,  color: COLOR.dangerText  },
  resolved: { bg: COLOR.successLight, color: COLOR.successText },
  closed:   { bg: COLOR.bgSurface2,   color: COLOR.textMuted   },
}

export default function IssuesPage() {
  const [meldingen,   setMeldingen]   = useState<Melding[]>([])
  const [loading,     setLoading]     = useState(true)
  const [actionId,    setActionId]    = useState<number | null>(null)
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [note,        setNote]        = useState('')
  const [filter,      setFilter]      = useState<'all' | 'open'>('open')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/meldingen/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMeldingen(data.meldingen ?? [])
    } catch { /* empty state */ } finally {
      setLoading(false)
    }
  }

  async function resolve(id: number) {
    setActionId(id)
    const token = localStorage.getItem('groundr_token')
    await fetch(`${API_BASE}/api/meldingen/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ note }),
    })
    setMeldingen(prev => prev.map(m => m.id === id ? { ...m, status: 'resolved' } : m))
    setResolvingId(null)
    setNote('')
    setActionId(null)
  }

  const displayed = filter === 'open' ? meldingen.filter(m => m.status === 'open') : meldingen
  const openCount = meldingen.filter(m => m.status === 'open').length

  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          Issues
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>Track and resolve platform issues and reports.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
        <StatCard value={loading ? '—' : String(openCount)} label="Open issues" color={openCount > 0 ? COLOR.danger : undefined} />
        <StatCard value={loading ? '—' : String(meldingen.filter(m => m.status === 'resolved').length)} label="Resolved" trend="up" />
      </div>

      <Card
        title="All issues"
        icon={<AlertCircle size={14} />}
        action={
          <div style={{ display: 'flex', gap: SPACE[1] }}>
            {(['open', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ fontSize: '12px', fontWeight: 500, padding: '3px 10px', borderRadius: RADIUS.full, border: `1px solid ${filter === f ? COLOR.brand : COLOR.border}`, background: filter === f ? COLOR.brandLight : 'transparent', color: filter === f ? COLOR.brandText : COLOR.textMuted, cursor: 'pointer', fontFamily: FONT.body, textTransform: 'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        }
      >
        {loading && <div style={{ padding: SPACE[8], textAlign: 'center', color: COLOR.textMuted, fontSize: '14px' }}>Loading…</div>}
        {!loading && displayed.length === 0 && (
          <div style={{ padding: SPACE[10], textAlign: 'center', color: COLOR.textMuted }}>
            <CheckCircle size={32} color={COLOR.success} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px' }}>No {filter === 'open' ? 'open ' : ''}issues.</p>
          </div>
        )}
        {displayed.map(m => {
          const s = STATUS_STYLE[m.status] ?? STATUS_STYLE.open
          return (
            <div key={m.id} style={{ borderBottom: `1px solid ${COLOR.border}`, padding: `${SPACE[4]} 0` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: COLOR.textPrimary, marginBottom: '4px' }}>
                    {m.title ?? `Issue #${m.id}`}
                  </div>
                  {m.description && (
                    <div style={{ fontSize: '13px', color: COLOR.textSecondary, marginBottom: '4px' }}>{m.description}</div>
                  )}
                  <div style={{ fontSize: '12px', color: COLOR.textMuted }}>{new Date(m.created_at).toLocaleDateString('nl-NL')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: RADIUS.full, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
                    {m.status}
                  </span>
                  {m.status === 'open' && (
                    <Button size="sm" variant="ghost" onClick={() => setResolvingId(m.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
              {resolvingId === m.id && (
                <div style={{ marginTop: SPACE[3], display: 'flex', gap: SPACE[2] }}>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note (optional)" style={{ flex: 1, height: '32px', padding: `0 ${SPACE[3]}`, border: `1px solid ${COLOR.border}`, borderRadius: RADIUS.md, fontSize: '13px', fontFamily: FONT.body, outline: 'none' }} />
                  <Button size="sm" variant="primary" loading={actionId === m.id} onClick={() => resolve(m.id)}>Mark resolved</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setResolvingId(null); setNote('') }}>Cancel</Button>
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
