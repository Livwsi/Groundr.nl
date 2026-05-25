'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, FileText, CheckCircle, Clock, Phone, Mail, LogOut,
  AlertTriangle, Calendar, Search, Trash2, Upload, Download,
  MapPin, ChevronRight, Plus, X
} from 'lucide-react'
import MeldingModal from '@/components/meldingen/MeldingModal'

// ── Style constants ───────────────────────────────────────
const S = {
  bg:      '#F4F6F9',
  surface: '#FFFFFF',
  surface2:'#F8FAFB',
  border:  '#E2E5EA',
  t1:      '#0B1320',
  t2:      '#44546A',
  t3:      '#8A9BB0',
  green:   '#059669',
  greenLt: '#ECFDF5',
  greenTx: '#047857',
  greenRim:'rgba(5,150,105,0.2)',
  amber:   '#D97706',
  amberLt: '#FFFBEB',
  red:     '#DC2626',
  redLt:   '#FEF2F2',
  shadow:  '0 1px 3px rgba(11,19,32,0.06)',
  shadowMd:'0 2px 12px rgba(11,19,32,0.08)',
}

const inp = {
  background: S.surface, border: `1px solid ${S.border}`,
  color: S.t1, width: '100%', padding: '8px 12px',
  fontSize: '13.5px', outline: 'none', fontFamily: 'inherit',
}

const lbl = {
  fontSize: '11px', fontWeight: 500 as const, color: S.t3,
  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  marginBottom: '5px', display: 'block',
}

function buildTimeline(submission: any, viewings: any[], bids: any[]) {
  const hasViewing = viewings.length > 0
  const confirmedV = viewings.some(v => v.status === 'confirmed')
  const hasBid     = bids.length > 0
  const fmt = (d: string) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  return [
    { id: 1, label: 'Dossier aangemaakt',         done: !!submission, date: submission ? fmt(submission.created_at) : '—' },
    { id: 2, label: 'Bezichtiging aangevraagd',   done: hasViewing,   date: hasViewing ? fmt(viewings[0].date) : '—' },
    { id: 3, label: 'Bezichtiging bevestigd',     done: confirmedV,   date: confirmedV ? fmt(viewings.find((v:any) => v.status === 'confirmed')?.date) : '—' },
    { id: 4, label: 'Bod uitgebracht',            done: hasBid,       date: hasBid ? fmt(bids[0].placed_at) : '—' },
    { id: 5, label: 'Bod geaccepteerd',           done: false,        date: 'In afwachting' },
    { id: 6, label: 'Koopovereenkomst opgesteld', done: false,        date: '—' },
    { id: 7, label: 'Koopakte ondertekend',       done: false,        date: '—' },
    { id: 8, label: 'Overdracht afgerond',        done: false,        date: '—' },
  ]
}

const PROP_TYPES = [
  { value: '', label: 'Alle types' },
  { value: 'house', label: 'Woning' },
  { value: 'apartment', label: 'Appartement' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
]

export default function DossierDashboard() {
  const router = useRouter()

  const [email,       setEmail]       = useState('gebruiker')
  const [showMelding, setShowMelding] = useState(false)
  const [viewings,    setViewings]    = useState<any[]>([])
  const [submission,  setSubmission]  = useState<any>(null)
  const [bids,        setBids]        = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [searches,    setSearches]    = useState<any[]>([])
  const [showSearch,  setShowSearch]  = useState(false)
  const [searchForm,  setSearchForm]  = useState({ city: '', min_price: '', max_price: '', min_area_m2: '', property_type: '', email_alerts: true })
  const [savingSearch,setSavingSearch]= useState(false)
  const [searchMsg,   setSearchMsg]   = useState('')
  const [documents,   setDocuments]   = useState<any[]>([])
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('dossier_token')
    if (!token) { router.push('/dossier/login'); return }
    setEmail(localStorage.getItem('dossier_email') || 'gebruiker')
    loadRealData(token)
    loadSearches(token)
    loadDocuments(token)
  }, [])

  async function loadRealData(token: string) {
    setLoading(true)
    try {
      const [vRes, bRes, sRes] = await Promise.all([
        fetch('http://localhost:8000/api/viewings/my',        { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/submissions/my-bids', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/submissions/my',     { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [vData, bData, sData] = await Promise.all([vRes.json(), bRes.ok ? bRes.json() : { bids: [] }, sRes.ok ? sRes.json() : { submissions: [] }])
      setViewings(vData.viewings || [])
      setBids(bData.bids || [])
      const subs = sData.submissions || []
      if (subs.length > 0) setSubmission(subs[0])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadSearches(token: string) {
    try { const res = await fetch('http://localhost:8000/api/searches/', { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); setSearches(data.searches || []) } catch {}
  }

  async function loadDocuments(token: string) {
    try { const res = await fetch('http://localhost:8000/api/documents/', { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); setDocuments(data.documents || []) } catch {}
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setUploadError('')
    try {
      const token = localStorage.getItem('dossier_token')
      const fd    = new FormData(); fd.append('file', file)
      const res   = await fetch('http://localhost:8000/api/documents/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data  = await res.json()
      if (!res.ok) { setUploadError(data.detail || 'Upload mislukt.'); return }
      loadDocuments(token!)
    } catch { setUploadError('Verbindingsfout.') }
    finally { setUploading(false); e.target.value = '' }
  }

  async function handleDeleteDoc(id: number) {
    const token = localStorage.getItem('dossier_token')
    await fetch(`http://localhost:8000/api/documents/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadDocuments(token!)
  }

  async function handleSaveSearch(e: React.FormEvent) {
    e.preventDefault(); setSavingSearch(true); setSearchMsg('')
    try {
      const token = localStorage.getItem('dossier_token')
      const res   = await fetch('http://localhost:8000/api/searches/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          city: searchForm.city || null,
          min_price:   searchForm.min_price   ? parseFloat(searchForm.min_price)   : null,
          max_price:   searchForm.max_price   ? parseFloat(searchForm.max_price)   : null,
          min_area_m2: searchForm.min_area_m2 ? parseFloat(searchForm.min_area_m2) : null,
          property_type: searchForm.property_type || null,
          email_alerts: searchForm.email_alerts,
        }),
      })
      if (res.ok) { setSearchMsg('Zoekopdracht opgeslagen!'); setShowSearch(false); setSearchForm({ city: '', min_price: '', max_price: '', min_area_m2: '', property_type: '', email_alerts: true }); loadSearches(localStorage.getItem('dossier_token')!) }
    } catch {}
    finally { setSavingSearch(false) }
  }

  async function handleDeleteSearch(id: number) {
    const token = localStorage.getItem('dossier_token')
    await fetch(`http://localhost:8000/api/searches/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadSearches(token!)
  }

  function handleLogout() { localStorage.removeItem('dossier_token'); localStorage.removeItem('dossier_user_id'); localStorage.removeItem('dossier_email'); router.push('/dossier/login') }

  function formatSize(bytes: number) { return bytes < 1024 * 1024 ? `${(bytes/1024).toFixed(0)} KB` : `${(bytes/(1024*1024)).toFixed(1)} MB` }
  function formatPrice(p: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p) }

  const timeline       = buildTimeline(submission, viewings, bids)
  const completedSteps = timeline.filter(s => s.done).length
  const progress       = Math.round((completedSteps / timeline.length) * 100)
  const currentStep    = timeline.find(s => !s.done)?.label || 'Afgerond'
  const property       = submission?.property || viewings[0]?.property || null

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: S.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '22px', height: '22px', background: S.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Home size={12} color="white" />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: S.t1 }}>Mijn Dossier</span>
          <span style={{ color: S.border, margin: '0 4px' }}>·</span>
          <span style={{ fontSize: '12px', color: S.t3 }}>Groundr</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: S.t3 }}>{email}</span>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', fontSize: '13px', color: S.t3, cursor: 'pointer' }}>
            <LogOut size={14} /> Uitloggen
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: S.t1, letterSpacing: '-0.3px' }}>Welkom terug</h1>
          <p style={{ fontSize: '13px', color: S.t3, marginTop: '3px' }}>Hier vindt u alle informatie over uw woningtransactie.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: S.t3, fontSize: '13px' }}>Laden...</div>
        ) : (
          <>
            {/* ── PROPERTY HEADER ── */}
            <div style={{
              background: S.surface, border: `1px solid ${S.border}`,
              boxShadow: S.shadow, padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: '20px',
              marginBottom: '20px',
              borderLeft: `3px solid ${S.green}`,
            }}>
              <div style={{ width: '48px', height: '48px', background: S.greenLt, border: `1px solid ${S.greenRim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Home size={22} color={S.green} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '17px', fontWeight: 600, color: S.t1, marginBottom: '2px' }}>
                  {property ? `${property.street} ${property.house_number || ''}` : 'Woning'}
                </div>
                <div style={{ fontSize: '13px', color: S.t3, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={11} />
                  {property ? property.city : 'Geen woning gevonden'}
                  {submission?.reference && <span style={{ fontFamily: 'monospace', fontSize: '11px', color: S.t3, marginLeft: '8px' }}>{submission.reference}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '20px', fontWeight: 500, color: S.t1 }}>
                  {submission?.asking_price ? formatPrice(submission.asking_price) : 'Open bieding'}
                </div>
                <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 500, background: S.greenLt, color: S.greenTx, border: `1px solid ${S.greenRim}` }}>
                  {submission?.status === 'approved' ? 'Te koop' : 'In behandeling'}
                </span>
              </div>
            </div>

            {/* ── PROGRESS BAR ── */}
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, padding: '18px 24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Voortgang transactie</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12.5px', fontWeight: 500, color: S.green }}>{completedSteps} / {timeline.length} stappen</span>
              </div>
              <div style={{ height: '4px', background: S.border, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: S.green, transition: 'width 0.7s ease' }} />
              </div>
              <div style={{ fontSize: '12px', color: S.t3, marginTop: '8px' }}>
                Huidige stap: <strong style={{ color: S.t1 }}>{currentStep}</strong>
              </div>
            </div>

            {/* ── SAVED SEARCHES ── */}
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, marginBottom: '20px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `linear-gradient(180deg, ${S.surface}, ${S.surface2})` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={14} color={S.green} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Zoekopdrachten</span>
                </div>
                <button onClick={() => { setShowSearch(!showSearch); setSearchMsg('') }} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  height: '28px', padding: '0 10px',
                  background: S.greenLt, color: S.greenTx, border: `1px solid ${S.greenRim}`,
                  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                }}>
                  <Plus size={12} /> Nieuwe zoekopdracht
                </button>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {searchMsg && (
                  <div style={{ background: S.greenLt, border: `1px solid ${S.greenRim}`, color: S.greenTx, fontSize: '12.5px', padding: '8px 12px', marginBottom: '12px' }}>
                    {searchMsg}
                  </div>
                )}

                {showSearch && (
                  <div style={{ background: S.surface2, border: `1px solid ${S.border}`, padding: '16px', marginBottom: '16px' }}>
                    <form onSubmit={handleSaveSearch}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div><label style={lbl}>Stad</label><input type="text" value={searchForm.city} onChange={e => setSearchForm({...searchForm, city: e.target.value})} placeholder="Eindhoven" style={inp} /></div>
                        <div><label style={lbl}>Type woning</label>
                          <select value={searchForm.property_type} onChange={e => setSearchForm({...searchForm, property_type: e.target.value})} style={inp}>
                            {PROP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div><label style={lbl}>Min. prijs (€)</label><input type="number" value={searchForm.min_price} onChange={e => setSearchForm({...searchForm, min_price: e.target.value})} placeholder="200000" style={inp} /></div>
                        <div><label style={lbl}>Max. prijs (€)</label><input type="number" value={searchForm.max_price} onChange={e => setSearchForm({...searchForm, max_price: e.target.value})} placeholder="600000" style={inp} /></div>
                        <div><label style={lbl}>Min. oppervlak (m²)</label><input type="number" value={searchForm.min_area_m2} onChange={e => setSearchForm({...searchForm, min_area_m2: e.target.value})} placeholder="80" style={inp} /></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                          <input type="checkbox" id="alerts" checked={searchForm.email_alerts} onChange={e => setSearchForm({...searchForm, email_alerts: e.target.checked})} />
                          <label htmlFor="alerts" style={{ fontSize: '13px', color: S.t2, cursor: 'pointer' }}>E-mail alerts bij nieuwe woningen</label>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" disabled={savingSearch} style={{ height: '32px', padding: '0 14px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '12.5px', fontWeight: 500, cursor: 'pointer', opacity: savingSearch ? 0.6 : 1 }}>
                          {savingSearch ? 'Opslaan...' : 'Zoekopdracht opslaan'}
                        </button>
                        <button type="button" onClick={() => setShowSearch(false)} style={{ height: '32px', padding: '0 12px', background: S.surface, color: S.t2, border: `1px solid ${S.border}`, fontSize: '12.5px', cursor: 'pointer' }}>
                          Annuleren
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {searches.length === 0 ? (
                  <p style={{ fontSize: '13px', color: S.t3 }}>Geen zoekopdrachten opgeslagen. Maak er een aan om automatisch op de hoogte te blijven van nieuwe woningen.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {searches.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: S.surface2, border: `1px solid ${S.border}` }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1 }}>
                            {[s.city, s.property_type].filter(Boolean).join(' · ') || 'Alle woningen'}
                          </div>
                          <div style={{ fontSize: '12px', color: S.t3, marginTop: '2px' }}>
                            {s.min_price && `€${(s.min_price/1000).toFixed(0)}k`}{s.min_price && s.max_price && ' – '}{s.max_price && `€${(s.max_price/1000).toFixed(0)}k`}
                            {s.min_area_m2 && ` · min. ${s.min_area_m2}m²`}
                            {s.email_alerts && <span style={{ color: S.green, marginLeft: '6px' }}>· Alerts aan</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteSearch(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, padding: '4px' }}
                          onMouseEnter={e => (e.currentTarget.style.color = S.red)}
                          onMouseLeave={e => (e.currentTarget.style.color = S.t3)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── VIEWINGS ── */}
            {viewings.length > 0 && (
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(180deg, ${S.surface}, ${S.surface2})` }}>
                  <Calendar size={14} color={S.green} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Mijn bezichtigingen</span>
                </div>
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viewings.map(v => {
                    const statusColor = v.status === 'confirmed' ? S.green : v.status === 'rejected' ? S.red : S.amber
                    const statusBg    = v.status === 'confirmed' ? S.greenLt : v.status === 'rejected' ? S.redLt : S.amberLt
                    const statusLabel = v.status === 'confirmed' ? 'Bevestigd' : v.status === 'rejected' ? 'Afgewezen' : 'In afwachting'
                    return (
                      <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: S.surface2, border: `1px solid ${S.border}` }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1 }}>
                            {v.property ? `${v.property.street} ${v.property.house_number}, ${v.property.city}` : 'Bezichtiging'}
                          </div>
                          <div style={{ fontSize: '12px', color: S.t3, marginTop: '2px' }}>
                            {new Date(v.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} · {v.time}
                          </div>
                        </div>
                        <span style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 500, background: statusBg, color: statusColor, border: `1px solid ${statusColor}30` }}>
                          {statusLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── BIDS ── */}
            {bids.length > 0 && (
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(180deg, ${S.surface}, ${S.surface2})` }}>
                  <ChevronRight size={14} color={S.green} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Mijn biedingen</span>
                </div>
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bids.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: S.surface2, border: `1px solid ${S.border}` }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1 }}>Bod geplaatst</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '15px', fontWeight: 500, color: S.green }}>{formatPrice(b.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TIMELINE + DOCS + MAKELAAR ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              {/* Timeline */}
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, background: `linear-gradient(180deg, ${S.surface}, ${S.surface2})` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Tijdlijn</span>
                    <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 7px', background: S.amberLt, color: S.amber, border: `1px solid rgba(217,119,6,0.2)` }}>
                      {completedSteps} / {timeline.length}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {timeline.map((step, i) => (
                    <div key={step.id} style={{ display: 'flex', gap: '12px', paddingBottom: i < timeline.length - 1 ? '14px' : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
                        <div style={{
                          width: '20px', height: '20px',
                          background: step.done ? S.greenLt : S.surface2,
                          border: step.done ? `1.5px solid ${S.green}` : `1.5px solid ${S.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {step.done
                            ? <CheckCircle size={12} color={S.green} />
                            : <Clock size={10} color={S.t3} />}
                        </div>
                        {i < timeline.length - 1 && (
                          <div style={{ width: '1px', flex: 1, background: step.done ? `rgba(5,150,105,0.25)` : S.border, marginTop: '3px', minHeight: '14px' }} />
                        )}
                      </div>
                      <div style={{ paddingTop: '1px', flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: step.done ? 500 : 400, color: step.done ? S.t1 : S.t3 }}>{step.label}</div>
                        <div style={{ fontSize: '11.5px', color: S.t3, marginTop: '1px' }}>{step.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right col: docs + makelaar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Documents */}
                <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `linear-gradient(180deg, ${S.surface}, ${S.surface2})` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} color={S.green} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Documenten</span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 10px', background: S.greenLt, color: S.greenTx, border: `1px solid ${S.greenRim}`, fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                      <Upload size={12} />{uploading ? 'Uploaden...' : 'Upload'}
                      <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
                    </label>
                  </div>
                  <div style={{ padding: '12px 20px' }}>
                    {uploadError && <div style={{ background: S.redLt, border: `1px solid rgba(220,38,38,0.2)`, color: S.red, fontSize: '12.5px', padding: '8px 12px', marginBottom: '10px' }}>{uploadError}</div>}
                    {documents.length === 0 ? (
                      <p style={{ fontSize: '13px', color: S.t3 }}>Nog geen documenten. Upload PDF, afbeeldingen of Word-bestanden.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {documents.map(doc => (
                          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: S.surface2, border: `1px solid ${S.border}` }}>
                            <FileText size={14} color={S.t3} style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: S.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.original_name}</div>
                              <div style={{ fontSize: '11px', color: S.t3 }}>{formatSize(doc.file_size)}</div>
                            </div>
                            <button onClick={() => window.open(`http://localhost:8000/api/documents/${doc.id}/download`, '_blank')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, padding: '2px' }}
                              onMouseEnter={e => (e.currentTarget.style.color = S.green)}
                              onMouseLeave={e => (e.currentTarget.style.color = S.t3)}>
                              <Download size={14} />
                            </button>
                            <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, padding: '2px' }}
                              onMouseEnter={e => (e.currentTarget.style.color = S.red)}
                              onMouseLeave={e => (e.currentTarget.style.color = S.t3)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Makelaar */}
                <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(180deg, ${S.surface}, ${S.surface2})` }}>
                    <Phone size={14} color={S.green} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>Uw makelaar</span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ width: '40px', height: '40px', background: S.t1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: 'white', flexShrink: 0 }}>SM</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: S.t1 }}>Stadsmakelaars</div>
                        <div style={{ fontSize: '12px', color: S.t3 }}>Hooghuisstraat 31A, Eindhoven</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { icon: <Phone size={13} />, label: '085 080 55 98', href: 'tel:085-0805598' },
                        { icon: <Mail size={13} />,  label: 'info@stadsmakelaars.nl', href: 'mailto:info@stadsmakelaars.nl' },
                      ].map((item, i) => (
                        <a key={i} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px', background: S.surface2, border: `1px solid ${S.border}`, fontSize: '13px', color: S.t1, textDecoration: 'none', transition: 'border-color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = S.green)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}>
                          <span style={{ color: S.green }}>{item.icon}</span>{item.label}
                        </a>
                      ))}
                      <button onClick={() => setShowMelding(true)} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px', background: S.redLt, border: `1px solid rgba(220,38,38,0.2)`, fontSize: '13px', color: S.red, cursor: 'pointer', marginTop: '4px', width: '100%' }}>
                        <AlertTriangle size={13} /> Probleem melden
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${S.border}`, background: S.surface, marginTop: '32px', padding: '16px 32px', textAlign: 'center', fontSize: '12px', color: S.t3 }}>
        Powered by <strong style={{ color: S.t1 }}>Groundr</strong> · AVG/GDPR compliant ·{' '}
        <a href="#" style={{ color: S.t3, textDecoration: 'none' }}>Privacybeleid</a>
        {' · '}
        <a href="#" style={{ color: S.t3, textDecoration: 'none' }}>Gebruiksvoorwaarden</a>
      </div>

      {showMelding && (
        <MeldingModal
          makelaarId={1}
          street={property?.street || 'Woning'}
          city={property?.city || 'Eindhoven'}
          onClose={() => setShowMelding(false)}
        />
      )}
    </div>
  )
}