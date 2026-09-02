'use client'

import { useState, useEffect } from 'react'
import { Search, Calendar, FileText, Bell } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/store/auth'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface SavedSearch {
  id:        number
  city:      string
  min_price?: number
  max_price?: number
  min_area_m2?: number
  property_type?: string
  email_alerts: boolean
}

interface ViewingRequest {
  id:     number
  date:   string          // YYYY-MM-DD
  time:   string          // HH:MM
  status: 'pending' | 'confirmed' | 'rejected'
  property?: {
    street?:       string
    house_number?: string
    city?:         string
  }
}

export default function BuyerDashboardPage() {
  const { user } = useAuth()
  const [searches,  setSearches]  = useState<SavedSearch[]>([])
  const [viewings,  setViewings]  = useState<ViewingRequest[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const token   = localStorage.getItem('groundr_token')
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const [sR, vR] = await Promise.all([
        fetch(`${API_BASE}/api/searches/`, { headers }),
        // /api/viewings/requests is the agent view (filtered by makelaar).
        // The buyer's own requests are on /my.
        fetch(`${API_BASE}/api/viewings/my`, { headers }),
      ])
      const [sD, vD] = await Promise.all([sR.json(), vR.json()])
      setSearches(sD.searches  ?? [])
      setViewings(vD.viewings  ?? [])
    } catch { /* show empty states */ } finally {
      setLoading(false)
    }
  }

  const confirmedViewings = viewings.filter(v => v.status === 'confirmed')
  const pendingViewings   = viewings.filter(v => v.status === 'pending')

  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          My portal
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
          Welcome back, {user?.full_name ?? user?.email}. Track your searches and viewings.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
        <StatCard value={loading ? '—' : String(searches.length)}         label="Saved searches" />
        <StatCard value={loading ? '—' : String(confirmedViewings.length)} label="Confirmed viewings" trend={confirmedViewings.length > 0 ? 'up' : 'neutral'} />
        <StatCard value={loading ? '—' : String(pendingViewings.length)}   label="Pending viewings" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE[4] }}>
        {/* Saved searches */}
        <Card title="Saved searches" icon={<Search size={14} />}
          action={<Button size="sm" variant="ghost" href="/mijnwoning">Manage</Button>}
        >
          {loading && <div style={{ padding: SPACE[4], color: COLOR.textMuted, fontSize: '14px' }}>Loading…</div>}
          {!loading && searches.length === 0 && (
            <div style={{ padding: SPACE[6], textAlign: 'center', color: COLOR.textMuted, fontSize: '13.5px' }}>
              No saved searches yet.
            </div>
          )}
          {searches.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACE[3]} 0`, borderBottom: `1px solid ${COLOR.border}` }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: COLOR.textPrimary }}>{s.city}</div>
                <div style={{ fontSize: '12px', color: COLOR.textMuted }}>
                  {[
                    s.min_price  && `€${(s.min_price/1000).toFixed(0)}k`,
                    s.max_price  && `€${(s.max_price/1000).toFixed(0)}k`,
                    s.min_area_m2 && `${s.min_area_m2}m²+`,
                    s.property_type,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              {s.email_alerts && (
                <Bell size={13} color={COLOR.brand} />
              )}
            </div>
          ))}
        </Card>

        {/* Viewings */}
        <Card title="My viewings" icon={<Calendar size={14} />}>
          {loading && <div style={{ padding: SPACE[4], color: COLOR.textMuted, fontSize: '14px' }}>Loading…</div>}
          {!loading && viewings.length === 0 && (
            <div style={{ padding: SPACE[6], textAlign: 'center', color: COLOR.textMuted, fontSize: '13.5px' }}>
              No viewing requests yet.
            </div>
          )}
          {viewings.slice(0, 6).map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACE[3]} 0`, borderBottom: `1px solid ${COLOR.border}` }}>
              <div>
                <div style={{ fontSize: '13px', color: COLOR.textPrimary }}>
                  {v.property?.street
                    ? `${v.property.street} ${v.property.house_number ?? ''}`.trim() +
                      (v.property.city ? `, ${v.property.city}` : '')
                    : `Bezichtiging #${v.id}`}
                </div>
                <div style={{ fontSize: '12px', color: COLOR.textMuted }}>
                  {new Date(`${v.date}T${v.time || '00:00'}`).toLocaleString('nl-NL',
                    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: RADIUS.full,
                background: v.status === 'confirmed' ? COLOR.successLight : v.status === 'rejected' ? COLOR.dangerLight : COLOR.bgSurface2,
                color:      v.status === 'confirmed' ? COLOR.successText  : v.status === 'rejected' ? COLOR.dangerText  : COLOR.textMuted,
                textTransform: 'capitalize',
              }}>
                {v.status}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
