'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, FileText, CheckCircle, Clock } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', amberLt: '#FFFBEB', red: '#DC2626', redLt: '#FEF2F2',
  shadow: '0 1px 3px rgba(11,19,32,0.06)',
}

interface Report {
  id: number; address: string; status: string; property_type: string
  living_area_m2: number | null; marktwaarde: number | null
  nwwi_number: string | null; created_at: string; finalized_at: string | null
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p)
}

export default function TaxatieListPage() {
  const router   = useRouter()
  const { lang } = useLanguage()
  const nl       = lang === 'nl'

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
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(API_BASE+'/api/taxatie/', { headers: { Authorization: `Bearer ${token}` } })
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
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(API_BASE+'/api/taxatie/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address }),
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
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>

      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: S.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, display: 'flex' }}><ArrowLeft size={16} /></button>
          <img src="/logo.svg" alt="Groundr" style={{ height: '32px' }} />
          <span style={{ color: S.border }}>·</span>
          <span style={{ fontSize: '13.5px', color: S.t2 }}>{nl ? 'Taxatierapporten' : 'Valuation reports'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LanguageToggle />
          <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 14px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={13} />{nl ? 'Nieuw rapport' : 'New report'}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: S.t1, letterSpacing: '-0.3px' }}>{nl ? 'Taxatierapporten' : 'Valuation reports'}</h1>
          <p style={{ fontSize: '13px', color: S.t3, marginTop: '3px' }}>{nl ? 'NWWI-klaar taxatierapport in 5 stappen' : 'NWWI-ready valuation report in 5 steps'}</p>
        </div>

        {/* New report form */}
        {showForm && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: S.t1, marginBottom: '16px' }}>{nl ? 'Nieuw taxatierapport' : 'New valuation report'}</div>
            {error && <div style={{ background: S.redLt, border: `1px solid rgba(220,38,38,0.2)`, color: S.red, fontSize: '13px', padding: '10px 14px', marginBottom: '12px' }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder={nl ? 'Adres van de te taxeren woning' : 'Address of the property to value'} required
                style={{ flex: 1, height: '40px', padding: '0 14px', background: S.surface, border: `1px solid ${S.border}`, fontFamily: 'inherit', fontSize: '14px', color: S.t1, outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
              <button type="submit" disabled={creating} style={{ height: '40px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', opacity: creating ? 0.6 : 1 }}>
                {creating ? '...' : (nl ? 'Starten →' : 'Start →')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ height: '40px', padding: '0 12px', background: S.surface, color: S.t2, border: `1px solid ${S.border}`, cursor: 'pointer', fontSize: '13.5px' }}>✕</button>
            </form>
            <p style={{ fontSize: '12px', color: S.t3, marginTop: '8px' }}>{nl ? 'BAG-gegevens worden automatisch ingevuld.' : 'BAG data will be auto-filled.'}</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, background: S.border, border: `1px solid ${S.border}`, marginBottom: '28px', boxShadow: S.shadow }}>
          {[
            { label: nl ? 'Concepten' : 'Drafts',        value: drafts.length,    color: S.amber },
            { label: nl ? 'Gefinaliseerd' : 'Finalized', value: finalized.length, color: S.green },
            { label: nl ? 'Totaal' : 'Total',            value: reports.length,   color: S.t1 },
          ].map((s, i) => (
            <div key={i} style={{ background: S.surface, padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '24px', fontWeight: 500, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '48px', color: S.t3, fontSize: '13px' }}>{nl ? 'Laden...' : 'Loading...'}</div>}

        {!loading && reports.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', background: S.surface, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: S.shadow }}>
              <FileText size={22} color={S.green} />
            </div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: S.t1, marginBottom: '4px' }}>{nl ? 'Nog geen rapporten' : 'No reports yet'}</p>
            <p style={{ fontSize: '13px', color: S.t3, marginBottom: '16px' }}>{nl ? 'Maak uw eerste taxatierapport aan.' : 'Create your first valuation report.'}</p>
            <button onClick={() => setShowForm(true)} style={{ height: '36px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer' }}>
              + {nl ? 'Nieuw rapport' : 'New report'}
            </button>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
            {reports.map((r, i) => (
              <div key={r.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < reports.length - 1 ? `1px solid ${S.border}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                onClick={() => router.push(`/taxatie/${r.id}`)}
                onMouseEnter={e => (e.currentTarget.style.background = S.surface2)}
                onMouseLeave={e => (e.currentTarget.style.background = S.surface)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', background: r.status === 'final' ? S.greenLt : S.surface2, border: `1px solid ${r.status === 'final' ? S.greenRim : S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {r.status === 'final' ? <CheckCircle size={16} color={S.green} /> : <Clock size={16} color={S.t3} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: S.t1 }}>{r.address}</div>
                    <div style={{ fontSize: '12px', color: S.t3, marginTop: '2px' }}>
                      {new Date(r.created_at).toLocaleDateString('nl-NL')}
                      {r.nwwi_number && <span style={{ fontFamily: 'monospace', color: S.green, marginLeft: '10px' }}>{r.nwwi_number}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {r.marktwaarde && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '14px', fontWeight: 500, color: S.t1 }}>{formatPrice(r.marktwaarde)}</div>
                      <div style={{ fontSize: '11px', color: S.t3 }}>{nl ? 'Marktwaarde' : 'Market value'}</div>
                    </div>
                  )}
                  <span style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 500, background: r.status === 'final' ? S.greenLt : S.amberLt, color: r.status === 'final' ? S.greenTx : S.amber, border: `1px solid ${r.status === 'final' ? S.greenRim : 'rgba(217,119,6,0.2)'}` }}>
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