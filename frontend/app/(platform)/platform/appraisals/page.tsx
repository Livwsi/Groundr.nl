'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Taxatie {
  id:         number
  address:    string
  status:     string
  created_at: string
  value?:     number | null
}

const STATUS_COLOR: Record<string, string> = {
  draft:     COLOR.textMuted,
  pending:   COLOR.warning,
  completed: COLOR.success,
  rejected:  COLOR.danger,
}

export default function AppraisalsPage() {
  const router = useRouter()
  const [list,    setList]    = useState<Taxatie[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/taxatie`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setList(data.reports ?? data ?? [])
    } catch {
      setError('Could not load appraisals. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACE[6] }}>
        <div>
          <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
            Appraisals
          </h1>
          <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
            NWWI-ready valuation reports for your portfolio.
          </p>
        </div>
        <Button variant="primary" iconLeft={<Plus size={14} />} onClick={() => router.push('/taxatie')}>
          New taxatie
        </Button>
      </div>

      <Card title="Taxatie reports" icon={<ClipboardList size={14} />}>
        {loading && (
          <div style={{ textAlign: 'center', padding: SPACE[8], color: COLOR.textMuted, fontSize: '14px' }}>
            Loading reports…
          </div>
        )}
        {error && (
          <div style={{ padding: SPACE[4], color: COLOR.dangerText, background: COLOR.dangerLight, borderRadius: RADIUS.md, fontSize: '13.5px' }}>
            {error}
          </div>
        )}
        {!loading && !error && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: SPACE[10], color: COLOR.textMuted }}>
            <ClipboardList size={32} color={COLOR.border} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', marginBottom: SPACE[3] }}>No appraisals yet.</p>
            <Button variant="ghost" onClick={() => router.push('/taxatie')}>
              Start your first taxatie →
            </Button>
          </div>
        )}
        {!loading && list.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                {['Address', 'Status', 'Value', 'Date', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: `${SPACE[2]} ${SPACE[3]}`, fontSize: '11px', fontWeight: 500, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${COLOR.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = COLOR.bgSurface2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13.5px', color: COLOR.textPrimary }}>
                    {t.address}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}` }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: STATUS_COLOR[t.status] ?? COLOR.textMuted, textTransform: 'capitalize' }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13px', fontFamily: FONT.mono, color: COLOR.textPrimary }}>
                    {t.value ? `€ ${t.value.toLocaleString('nl-NL')}` : '—'}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '12.5px', color: COLOR.textMuted }}>
                    {new Date(t.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}` }}>
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/taxatie/${t.id}`)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
