'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, FileText, CheckCircle, Clock } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

interface Report {
  id:             number
  address:        string
  status:         string
  property_type:  string
  living_area_m2: number | null
  marktwaarde:    number | null
  nwwi_number:    string | null
  created_at:     string
  finalized_at:   string | null
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p)
}

export default function TaxatieListPage() {
  const router    = useRouter()
  const { lang }  = useLanguage()
  const nl        = lang === 'nl'

  const [reports,  setReports]  = useState<Report[]>([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [address,  setAddress]  = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => { loadReports() }, [])

  async function loadReports() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch('http://localhost:8000/api/taxatie/', { headers: { Authorization: `Bearer ${token}` } })
      const data  = await res.json()
      setReports(data.reports || [])
    } catch { setError(nl ? 'Kan rapporten niet laden.' : 'Cannot load reports.') }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) return
    setCreating(true); setError('')
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch('http://localhost:8000/api/taxatie/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ address }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Er is iets misgegaan.'); return }
      router.push(`/taxatie/${data.report_id}`)
    } catch { setError('Verbindingsfout.') }
    finally { setCreating(false) }
  }

  const drafts    = reports.filter(r => r.status === 'draft')
  const finalized = reports.filter(r => r.status === 'final')

  return (
    <div className="min-h-screen bg-g900">
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-g300 opacity-50 hover:opacity-100 transition-opacity"><ArrowLeft size={16} /></button>
          <img src="/logo.svg" alt="Groundr" className="h-10 w-auto" />
          <span className="text-g300 opacity-30 text-sm">/ {nl ? 'Taxatierapporten' : 'Valuation reports'}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-g400 text-g900 font-bold px-4 py-2 text-sm hover:bg-g300 transition-colors">
            <Plus size={14} />{nl ? 'Nieuw rapport' : 'New report'}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            {nl ? 'Taxatierapporten' : 'Valuation reports'}
          </h1>
          <p className="text-sm text-g300 opacity-50 mt-1">
            {nl ? 'NWWI-klaar taxatierapport in 5 stappen' : 'NWWI-ready valuation report in 5 steps'}
          </p>
        </div>

        {/* New report form */}
        {showForm && (
          <div className="bg-g800 border border-g700 p-6 mb-8">
            <h2 className="font-display font-bold text-white mb-4">{nl ? 'Nieuw taxatierapport' : 'New valuation report'}</h2>
            {error && <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-4">{error}</div>}
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder={nl ? 'Adres van de te taxeren woning' : 'Address of the property to value'}
                required
                className="flex-1 bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
              />
              <button type="submit" disabled={creating}
                className="bg-g400 text-g900 font-bold px-6 text-sm hover:bg-g300 transition-colors disabled:opacity-50">
                {creating ? '...' : (nl ? 'Starten →' : 'Start →')}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="bg-g700 text-g300 font-semibold px-4 text-sm">
                ✕
              </button>
            </form>
            <p className="text-xs text-g300 opacity-40 mt-2">
              {nl ? 'BAG-gegevens worden automatisch ingevuld.' : 'BAG data will be auto-filled.'}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: nl ? 'Concepten' : 'Drafts',      value: drafts.length,    color: '#c47c1a' },
            { label: nl ? 'Gefinaliseerd' : 'Final',   value: finalized.length, color: '#2fc586' },
            { label: nl ? 'Totaal' : 'Total',          value: reports.length,   color: 'white'   },
          ].map((s, i) => (
            <div key={i} className="bg-g800 border border-g700 p-4">
              <div className="text-xs text-g300 opacity-40 mb-1">{s.label}</div>
              <div className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {loading && <div className="text-center py-16 text-g300 opacity-40 text-sm">{nl ? 'Laden...' : 'Loading...'}</div>}

        {!loading && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-g800 border border-g700 flex items-center justify-center mb-4"><FileText size={24} className="text-g400" /></div>
            <p className="text-white font-display font-bold mb-1">{nl ? 'Nog geen rapporten' : 'No reports yet'}</p>
            <p className="text-g300 opacity-40 text-sm mb-4">{nl ? 'Maak uw eerste taxatierapport aan.' : 'Create your first valuation report.'}</p>
            <button onClick={() => setShowForm(true)} className="bg-g400 text-g900 font-bold px-6 py-2.5 text-sm">
              + {nl ? 'Nieuw rapport' : 'New report'}
            </button>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <div className="flex flex-col gap-3">
            {reports.map(r => (
              <div key={r.id}
                className="bg-g800 border border-g700 p-5 flex items-center justify-between hover:border-g500 transition-colors cursor-pointer"
                onClick={() => router.push(`/taxatie/${r.id}`)}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-g700 flex items-center justify-center flex-shrink-0">
                    {r.status === 'final'
                      ? <CheckCircle size={18} className="text-g400" />
                      : <Clock size={18} className="text-g300 opacity-50" />}
                  </div>
                  <div>
                    <div className="font-display font-bold text-white">{r.address}</div>
                    <div className="text-xs text-g300 opacity-50 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('nl-NL')}
                      {r.nwwi_number && <span className="ml-3 font-mono text-g400">{r.nwwi_number}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {r.marktwaarde && (
                    <div className="text-right">
                      <div className="font-mono font-semibold text-white">{formatPrice(r.marktwaarde)}</div>
                      <div className="text-xs text-g300 opacity-40">{nl ? 'Marktwaarde' : 'Market value'}</div>
                    </div>
                  )}
                  <span className="text-xs font-bold px-2 py-1"
                    style={{
                      background: r.status === 'final' ? 'rgba(47,197,134,0.1)' : 'rgba(196,124,26,0.1)',
                      color:      r.status === 'final' ? '#2fc586' : '#c47c1a',
                      border:     r.status === 'final' ? '1px solid rgba(47,197,134,0.3)' : '1px solid rgba(196,124,26,0.3)',
                    }}>
                    {r.status === 'final' ? (nl ? 'Definitief' : 'Final') : (nl ? 'Concept' : 'Draft')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}