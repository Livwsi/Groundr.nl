'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Home, FileText, AlertCircle, Eye, ShieldCheck } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { useAuth } from '@/store/auth'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface AdminStats {
  pending_submissions: number
  open_meldingen:      number
  pending_viewings:    number
  total_properties:    number
}

const QUICK_LINKS = [
  { href: '/platform/listings',   label: 'Listings',    icon: '🏠', desc: 'Active listings portfolio' },
  { href: '/platform/approvals',  label: 'Approvals',   icon: '✅', desc: 'Submissions awaiting review' },
  { href: '/platform/viewings',   label: 'Viewings',    icon: '📅', desc: 'Viewing requests & slots' },
  { href: '/platform/bids',       label: 'Bids',        icon: '💰', desc: 'All bids on listings' },
  { href: '/platform/issues',     label: 'Issues',      icon: '⚠️', desc: 'Open platform issues' },
  { href: '/platform/appraisals', label: 'Appraisals',  icon: '📋', desc: 'Taxatie reports' },
  { href: '/platform/documents',  label: 'Documents',   icon: '📄', desc: 'Document management' },
  { href: '/platform/analytics',  label: 'Analytics',   icon: '📊', desc: 'Platform analytics' },
  { href: '/platform/market',     label: 'Market data', icon: '📈', desc: 'Market intelligence' },
]

export default function AdminPage() {
  const { user } = useAuth()
  const [stats,   setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const token = localStorage.getItem('groundr_token')
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const [vR, mR, sR] = await Promise.all([
        fetch(`${API_BASE}/api/viewings/requests`,   { headers }),
        fetch(`${API_BASE}/api/meldingen/`,          { headers }),
        fetch(`${API_BASE}/api/submissions/pending`, { headers }),
      ])
      const [vD, mD, sD] = await Promise.all([vR.json(), mR.json(), sR.json()])
      setStats({
        pending_submissions: (sD.submissions ?? []).length,
        open_meldingen:      (mD.meldingen   ?? []).filter((m: any) => m.status === 'open').length,
        pending_viewings:    (vD.requests    ?? []).filter((r: any) => r.status === 'pending').length,
        total_properties:    0,
      })
    } catch {
      setStats({ pending_submissions: 0, open_meldingen: 0, pending_viewings: 0, total_properties: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          Admin overview
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
          Welcome, {user?.full_name ?? user?.email}. Full platform access.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: SPACE[4], marginBottom: SPACE[6] }}>
        <StatCard
          value={loading ? '—' : String(stats?.pending_submissions ?? 0)}
          label="Pending approvals"
          color={stats && stats.pending_submissions > 0 ? COLOR.warning : undefined}
        />
        <StatCard
          value={loading ? '—' : String(stats?.open_meldingen ?? 0)}
          label="Open issues"
          color={stats && stats.open_meldingen > 0 ? COLOR.danger : undefined}
        />
        <StatCard
          value={loading ? '—' : String(stats?.pending_viewings ?? 0)}
          label="Pending viewings"
          color={stats && stats.pending_viewings > 0 ? COLOR.info : undefined}
        />
        <StatCard
          value="—"
          label="Active listings"
        />
      </div>

      {/* Quick access grid */}
      <Card title="Platform modules" icon={<ShieldCheck size={14} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE[3] }}>
          {QUICK_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: SPACE[3],
                padding: SPACE[4],
                background: COLOR.bgSurface2,
                border: `1px solid ${COLOR.border}`,
                borderRadius: RADIUS.md,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = COLOR.brand }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = COLOR.border }}
              >
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{link.icon}</span>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: COLOR.textPrimary, marginBottom: '2px' }}>
                    {link.label}
                  </div>
                  <div style={{ fontSize: '12px', color: COLOR.textMuted }}>{link.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
