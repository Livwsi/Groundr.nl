'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, MapPin } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

interface Melding {
  id: number; title: string; description: string; category: string
  priority: string; status: string; resolution_note: string | null
  created_at: string
  property: { street: string; house_number: string; city: string } | null
  reporter: { email: string; name: string | null }
}

const CATEGORY_ICONS: Record<string, string> = { general: '📋', structural: '🏗️', electrical: '⚡', plumbing: '🔧', heating: '🌡️', other: '❓' }

export default function MeldingenPage() {
  const { t, lang } = useLanguage()
  const nl = lang === 'nl'

  const [meldingen,   setMeldingen]   = useState<Melding[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<'all' | 'open' | 'resolved' | 'closed'>('all')
  const [resolving,   setResolving]   = useState<number | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [actionId,    setActionId]    = useState<number | null>(null)

  useEffect(() => { loadMeldingen() }, [])

  async function loadMeldingen() {
    setLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res  = await fetch('http://localhost:8000/api/meldingen/', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setMeldingen(data.meldingen || [])
    } catch {}
    finally { setLoading(false) }
  }

  async function resolve(id: number) {
    setActionId(id)
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:8000/api/meldingen/${id}/resolve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note: resolveNote }),
    })
    setMeldingen(prev => prev.map(m => m.id === id ? { ...m, status: 'resolved', resolution_note: resolveNote } : m))
    setResolving(null); setResolveNote(''); setActionId(null)
  }

  async function close(id: number) {
    setActionId(id)
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:8000/api/meldingen/${id}/close`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    setMeldingen(prev => prev.map(m => m.id === id ? { ...m, status: 'closed' } : m))
    setActionId(null)
  }

  const priorityConfig = (p: string) => ({
    low:    { label: nl ? 'Laag' : 'Low',       color: '#888',    bg: 'rgba(136,136,136,0.1)' },
    normal: { label: nl ? 'Normaal' : 'Normal', color: '#1a6fc4', bg: 'rgba(26,111,196,0.1)'  },
    high:   { label: nl ? 'Hoog' : 'High',      color: '#c47c1a', bg: 'rgba(196,124,26,0.1)'  },
    urgent: { label: 'Urgent',                  color: '#b84033', bg: 'rgba(184,64,51,0.1)'   },
  }[p] || { label: p, color: '#888', bg: 'rgba(136,136,136,0.1)' })

  const statusConfig = (s: string) => ({
    open:     { label: nl ? 'Open' : 'Open',         color: '#c47c1a' },
    resolved: { label: nl ? 'Opgelost' : 'Resolved', color: '#00b37e' },
    closed:   { label: nl ? 'Gesloten' : 'Closed',   color: '#888'    },
  }[s] || { label: s, color: '#888' })

  const filterLabels = { all: nl ? 'Alle' : 'All', open: nl ? 'Open' : 'Open', resolved: nl ? 'Opgelost' : 'Resolved', closed: nl ? 'Gesloten' : 'Closed' }
  const filtered     = meldingen.filter(m => filter === 'all' || m.status === filter)
  const openCount    = meldingen.filter(m => m.status === 'open').length
  const resolvedCount= meldingen.filter(m => m.status === 'resolved').length

  return (
    <div className="min-h-screen bg-g900">
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center gap-4">
        <Link href="/dashboard" className="text-g300 opacity-50 hover:opacity-100 transition-opacity"><ArrowLeft size={16} /></Link>
        <img src="/logo.svg" alt="Groundr" className="h-10 w-auto" />
        <span className="text-g300 opacity-30 text-sm">/ {t('meldingen.title')}</span>
        {openCount > 0 && (
          <span className="font-mono text-xs font-bold px-2 py-0.5 ml-1"
            style={{ background: 'rgba(196,124,26,0.15)', color: '#c47c1a', border: '1px solid rgba(196,124,26,0.3)' }}>
            {openCount} {t('meldingen.open').toLowerCase()}
          </span>
        )}
        <div className="ml-auto"><LanguageToggle /></div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">{t('meldingen.title')}</h1>
          <p className="text-sm text-g300 opacity-50 mt-1">{nl ? 'Problemen en meldingen van kopers en verkopers' : 'Issues and reports from buyers and sellers'}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: t('meldingen.open'),     value: openCount,       color: '#c47c1a' },
            { label: t('meldingen.resolved'), value: resolvedCount,   color: '#00b37e' },
            { label: nl ? 'Totaal' : 'Total', value: meldingen.length,color: 'white'   },
          ].map((s, i) => (
            <div key={i} className="bg-g800 border border-g700 p-4">
              <div className="text-xs text-g300 opacity-40 mb-1">{s.label}</div>
              <div className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-0 mb-6 border-b border-g700">
          {(['all', 'open', 'resolved', 'closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-5 py-3 text-sm font-semibold transition-all"
              style={{ borderBottom: filter === f ? '2px solid #00b37e' : '2px solid transparent', color: filter === f ? '#00b37e' : 'rgba(255,255,255,0.3)', marginBottom: '-1px' }}>
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-16 text-g300 opacity-40 text-sm">{t('common.loading')}</div>}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 bg-g800 border border-g700 flex items-center justify-center mb-4"><AlertTriangle size={22} className="text-g400" /></div>
            <p className="text-white font-semibold mb-1">{t('meldingen.empty')}</p>
            <p className="text-g300 opacity-40 text-sm">{nl ? 'Meldingen van kopers/verkopers verschijnen hier' : 'Reports from buyers/sellers will appear here'}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filtered.map(m => {
            const pc = priorityConfig(m.priority)
            const sc = statusConfig(m.status)
            return (
              <div key={m.id} className="bg-g800 border border-g700 overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl flex-shrink-0 mt-0.5">{CATEGORY_ICONS[m.category] || '📋'}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-semibold text-white">{m.title}</div>
                        <span className="text-xs font-bold px-2 py-0.5" style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.color}30` }}>{pc.label}</span>
                      </div>
                      {m.property && (
                        <div className="flex items-center gap-1 text-xs text-g300 opacity-50">
                          <MapPin size={10} />{m.property.street} {m.property.house_number}, {m.property.city}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: sc.color }}>{sc.label}</span>
                </div>

                <div className="px-5 pb-3 border-t border-g700/50 pt-3">
                  <p className="text-sm text-g300 opacity-70">{m.description}</p>
                  {m.resolution_note && (
                    <div className="mt-2 p-2 text-xs" style={{ background: 'rgba(0,179,126,0.08)', color: '#00b37e', border: '1px solid rgba(0,179,126,0.2)' }}>
                      {nl ? 'Oplossing' : 'Resolution'}: {m.resolution_note}
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-g700/50 flex items-center justify-between">
                  <div className="text-xs text-g300 opacity-40">
                    {m.reporter.name || m.reporter.email} · {new Date(m.created_at).toLocaleDateString('nl-NL')}
                  </div>
                  {m.status === 'open' && (
                    <div className="flex gap-2">
                      {resolving === m.id ? (
                        <div className="flex gap-2 items-center">
                          <input value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                            placeholder={nl ? 'Oplossingsnotitie...' : 'Resolution note...'}
                            className="bg-g900 border border-g700 text-white placeholder-white/20 px-3 py-1.5 text-xs outline-none w-48" />
                          <button onClick={() => resolve(m.id)} disabled={actionId === m.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: '#00b37e', color: '#061a11' }}>
                            <CheckCircle size={12} />{actionId === m.id ? '...' : (nl ? 'Oplossen' : 'Resolve')}
                          </button>
                          <button onClick={() => setResolving(null)} className="text-xs text-g300 opacity-50 hover:opacity-100 px-2">✕</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setResolving(m.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold"
                            style={{ background: 'rgba(0,179,126,0.1)', color: '#00b37e', border: '1px solid rgba(0,179,126,0.3)' }}>
                            <CheckCircle size={12} />{nl ? 'Oplossen' : 'Resolve'}
                          </button>
                          <button onClick={() => close(m.id)} disabled={actionId === m.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                            style={{ background: 'rgba(136,136,136,0.1)', color: '#888', border: '1px solid rgba(136,136,136,0.2)' }}>
                            <XCircle size={12} />{t('meldingen.closed')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}