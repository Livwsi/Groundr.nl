'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Upload } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, RADIUS } from '@/lib/design/tokens'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Doc {
  id:          number
  filename:    string
  file_type?:  string
  uploaded_at: string
  size_bytes?: number
}

function formatBytes(b?: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [docs,    setDocs]    = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/documents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDocs(data.documents ?? data ?? [])
    } catch {
      setError('Could not load documents.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACE[6] }}>
        <div>
          <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
            Documents
          </h1>
          <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
            Manage contracts, reports, and dossier files.
          </p>
        </div>
        <Button variant="primary" iconLeft={<Upload size={14} />} onClick={() => window.open('/dossier', '_blank')}>
          Upload
        </Button>
      </div>

      <Card title="All documents" icon={<FileText size={14} />}>
        {loading && (
          <div style={{ textAlign: 'center', padding: SPACE[8], color: COLOR.textMuted, fontSize: '14px' }}>Loading…</div>
        )}
        {error && (
          <div style={{ padding: SPACE[4], color: COLOR.dangerText, background: COLOR.dangerLight, borderRadius: RADIUS.md, fontSize: '13.5px' }}>
            {error}
          </div>
        )}
        {!loading && !error && docs.length === 0 && (
          <div style={{ textAlign: 'center', padding: SPACE[10], color: COLOR.textMuted }}>
            <FileText size={32} color={COLOR.border} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px' }}>No documents uploaded yet.</p>
          </div>
        )}
        {!loading && docs.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                {['File', 'Type', 'Size', 'Uploaded', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: `${SPACE[2]} ${SPACE[3]}`, fontSize: '11px', fontWeight: 500, color: COLOR.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} style={{ borderBottom: `1px solid ${COLOR.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = COLOR.bgSurface2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '13.5px', color: COLOR.textPrimary }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                      <FileText size={14} color={COLOR.brand} />
                      {doc.filename}
                    </div>
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '12.5px', color: COLOR.textMuted, textTransform: 'uppercase' }}>
                    {doc.file_type ?? '—'}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '12.5px', color: COLOR.textMuted }}>
                    {formatBytes(doc.size_bytes)}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}`, fontSize: '12.5px', color: COLOR.textMuted }}>
                    {new Date(doc.uploaded_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td style={{ padding: `${SPACE[3]} ${SPACE[3]}` }}>
                    <Button size="sm" variant="secondary" iconLeft={<Download size={12} />}>
                      Download
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
