'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Home, MapPin, CheckCircle, XCircle } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

interface Submission {
  id: number; reference: string; status: string; urgency: string
  asking_price: number | null; show_price: boolean; description: string | null
  bid_deadline: string | null; created_at: string
  seller: { id: number; email: string; full_name: string | null }
  property: { id: number; street: string; house_number: string; city: string; area_m2: number | null }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)
}

export default function ApprovalsPage() {
  const { t, lang } = useLanguage()
  const nl = lang === 'nl'

  const [submissions,   setSubmissions]   = useState<Submission[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [rejectNote,    setRejectNote]    = useState('')
  const [rejectingId,   setRejectingId]   = useState<number | null>(null)

  useEffect(() => { loadSubmissions() }, [])

  async function loadSubmissions() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch('http://localhost:8000/api/submissions/pending', { headers: { Authorization: `Bearer ${token}` } })
      const data  = await res.json()
      setSubmissions(data.submissions || [])
    } catch { setError(t('common.error')) }
    finally { setLoading(false) }
  }

  async function handleApprove(id: number) {
    setActionLoading(id)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(`http://localhost:8000/api/submissions/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setSubmissions(prev => prev.filter(s => s.id !== id))
    } catch { setError(t('common.error')) }
    finally { setActionLoading(null) }
  }

  async function handleReject(id: number) {
    setActionLoading(id)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(`http://localhost:8000/api/submissions/${id}/reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ note: rejectNote }),
      })
      if (res.ok) { setSubmissions(prev => prev.filter(s => s.id !== id)); setRejectingId(null); setRejectNote('') }
    } catch { setError(t('common.error')) }
    finally { setActionLoading(null) }
  }

  const urgencyLabel = (u: string) => ({
    normal: nl ? 'Normaal' : 'Normal',
    urgent: 'Urgent',
    asap:   nl ? 'Moet weg' : 'ASAP',
  }[u] || u)

  const urgencyColor = (u: string) => ({
    normal: { color: '#2fc586', bg: 'rgba(47,197,134,0.1)' },
    urgent: { color: '#c47c1a', bg: 'rgba(196,124,26,0.1)' },
    asap:   { color: '#b84033', bg: 'rgba(184,64,51,0.1)' },
  }[u] || { color: '#2fc586', bg: 'rgba(47,197,134,0.1)' })

  return (
    <div className="min-h-screen bg-g900">
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center gap-4">
        <Link href="/dashboard" className="text-g300 opacity-50 hover:opacity-100 transition-opacity"><ArrowLeft size={16} /></Link>
        <img src="/logo.svg" alt="Groundr" className="h-10 w-auto" />
        <span className="text-g300 opacity-30 text-sm">/ {t('approvals.title')}</span>
        {submissions.length > 0 && (
          <span className="font-mono text-xs font-bold px-2 py-0.5 ml-1"
            style={{ background: 'rgba(196,124,26,0.15)', color: '#c47c1a', border: '1px solid rgba(196,124,26,0.3)' }}>
            {submissions.length} {nl ? 'wachtend' : 'pending'}
          </span>
        )}
        <div className="ml-auto"><LanguageToggle /></div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">{t('approvals.pending')}</h1>
          <p className="text-sm text-g300 opacity-50 mt-1">{nl ? 'Woningen die verkopers hebben aangemeld voor uw microsite.' : 'Properties submitted by sellers for your microsite.'}</p>
        </div>

        {error && <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-6">{error}</div>}
        {loading && <div className="text-center py-16 text-g300 opacity-40 text-sm">{t('common.loading')}</div>}

        {!loading && submissions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-g800 border border-g700 flex items-center justify-center mb-4"><CheckCircle size={24} className="text-g400" /></div>
            <p className="text-white font-display font-bold mb-1">{t('approvals.empty')}</p>
            <p className="text-g300 opacity-40 text-sm">{nl ? 'Alle aanmeldingen zijn beoordeeld.' : 'All submissions have been reviewed.'}</p>
          </div>
        )}

        {!loading && submissions.length > 0 && (
          <div className="flex flex-col gap-4">
            {submissions.map(sub => {
              const uc = urgencyColor(sub.urgency)
              return (
                <div key={sub.id} className="bg-g800 border border-g700 overflow-hidden">
                  <div className="p-5 border-b border-g700">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-g700 flex items-center justify-center flex-shrink-0"><Home size={18} className="text-g400" /></div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="font-display font-bold text-white">{sub.property.street} {sub.property.house_number}</div>
                            <span className="text-xs font-bold px-2 py-0.5" style={{ background: uc.bg, color: uc.color, border: `1px solid ${uc.color}30` }}>
                              {urgencyLabel(sub.urgency)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-g300 opacity-50">
                            <MapPin size={10} />{sub.property.city}{sub.property.area_m2 && ` · ${sub.property.area_m2} m²`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-xs text-g400 mb-0.5">{sub.reference}</div>
                        <div className="text-xs text-g300 opacity-40">{new Date(sub.created_at).toLocaleDateString('nl-NL')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-3 gap-4 border-b border-g700">
                    <div>
                      <div className="text-xs text-g300 opacity-40 mb-1">{nl ? 'Verkoper' : 'Seller'}</div>
                      <div className="text-sm text-white">{sub.seller.full_name || sub.seller.email}</div>
                      <div className="text-xs text-g300 opacity-40">{sub.seller.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-g300 opacity-40 mb-1">{nl ? 'Vraagprijs' : 'Asking price'}</div>
                      <div className="text-sm text-white font-mono">
                        {sub.asking_price ? formatPrice(sub.asking_price) : <span className="text-g300 opacity-50">{nl ? 'Open bieding' : 'Open bid'}</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-g300 opacity-40 mb-1">{nl ? 'Deadline' : 'Deadline'}</div>
                      <div className="text-sm text-white">
                        {sub.bid_deadline ? new Date(sub.bid_deadline).toLocaleDateString('nl-NL') : <span className="text-g300 opacity-50">{nl ? 'Geen deadline' : 'No deadline'}</span>}
                      </div>
                    </div>
                    {sub.description && (
                      <div className="col-span-3">
                        <div className="text-xs text-g300 opacity-40 mb-1">{nl ? 'Omschrijving' : 'Description'}</div>
                        <div className="text-sm text-g300 opacity-70">{sub.description}</div>
                      </div>
                    )}
                  </div>

                  {rejectingId === sub.id && (
                    <div className="p-5 border-b border-g700 bg-g900/50">
                      <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                        {nl ? 'Reden voor afwijzing (optioneel)' : 'Reason for rejection (optional)'}
                      </label>
                      <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                        placeholder={nl ? 'Bijv. onvoldoende informatie...' : 'E.g. insufficient information...'}
                        rows={2} className="w-full bg-g800 border border-g700 text-white placeholder-white/20 px-4 py-2 text-sm outline-none focus:border-g400 resize-none" />
                    </div>
                  )}

                  <div className="p-4 flex items-center gap-3">
                    {rejectingId === sub.id ? (
                      <>
                        <button onClick={() => handleReject(sub.id)} disabled={actionLoading === sub.id}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-bold disabled:opacity-50"
                          style={{ background: '#b84033', color: 'white' }}>
                          <XCircle size={14} />{actionLoading === sub.id ? '...' : (nl ? 'Definitief afwijzen' : 'Confirm rejection')}
                        </button>
                        <button onClick={() => { setRejectingId(null); setRejectNote('') }} className="px-4 py-2 text-sm text-g300 opacity-50 hover:opacity-100">
                          {t('common.cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleApprove(sub.id)} disabled={actionLoading === sub.id}
                          className="flex items-center gap-2 px-5 py-2 text-sm font-bold disabled:opacity-50"
                          style={{ background: '#2fc586', color: '#061a11' }}>
                          <CheckCircle size={14} />{actionLoading === sub.id ? '...' : t('approvals.approve')}
                        </button>
                        <button onClick={() => setRejectingId(sub.id)}
                          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold"
                          style={{ background: 'rgba(184,64,51,0.1)', color: '#b84033', border: '1px solid rgba(184,64,51,0.3)' }}>
                          <XCircle size={14} />{t('approvals.reject')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}