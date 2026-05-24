'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, FileText, CheckCircle, Clock,
  Phone, Mail, LogOut, AlertTriangle, Calendar, Search, Trash2, Upload, Download
} from 'lucide-react'
import MeldingModal from '@/components/meldingen/MeldingModal'

function buildTimeline(submission: any, viewings: any[], bids: any[]) {
  const hasViewing = viewings.length > 0
  const confirmedV = viewings.some(v => v.status === 'confirmed')
  const hasBid     = bids.length > 0

  const fmt = (d: string) => new Date(d).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return [
    { id: 1, label: 'Dossier aangemaakt',         done: !!submission,  date: submission ? fmt(submission.created_at) : '—' },
    { id: 2, label: 'Bezichtiging aangevraagd',   done: hasViewing,    date: hasViewing ? fmt(viewings[0].date) : '—' },
    { id: 3, label: 'Bezichtiging bevestigd',     done: confirmedV,    date: confirmedV ? fmt(viewings.find((v:any) => v.status === 'confirmed')?.date) : '—' },
    { id: 4, label: 'Bod uitgebracht',            done: hasBid,        date: hasBid ? fmt(bids[0].placed_at) : '—' },
    { id: 5, label: 'Bod geaccepteerd',           done: false,         date: 'In afwachting' },
    { id: 6, label: 'Koopovereenkomst opgesteld', done: false,         date: '—' },
    { id: 7, label: 'Koopakte ondertekend',       done: false,         date: '—' },
    { id: 8, label: 'Overdracht afgerond',        done: false,         date: '—' },
  ]
}

const PROPERTY_TYPES = [
  { value: '',            label: 'Alle types' },
  { value: 'house',       label: 'Woning' },
  { value: 'apartment',   label: 'Appartement' },
  { value: 'villa',       label: 'Villa' },
  { value: 'studio',      label: 'Studio' },
]

export default function DossierDashboard() {
  const router = useRouter()

  const [email,       setEmail]       = useState('gebruiker')
  const [showMelding, setShowMelding] = useState(false)
  const [viewings,    setViewings]    = useState<any[]>([])
  const [submission,  setSubmission]  = useState<any>(null)
  const [bids,        setBids]        = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)

  // Saved searches state
  const [searches,     setSearches]     = useState<any[]>([])
  const [showSearch,   setShowSearch]   = useState(false)
  const [searchForm,   setSearchForm]   = useState({
    city: '', min_price: '', max_price: '', min_area_m2: '', property_type: '', email_alerts: true
  })
  const [savingSearch, setSavingSearch] = useState(false)
  const [searchMsg,    setSearchMsg]    = useState('')

  // Documents state
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
        fetch('http://localhost:8000/api/viewings/my',       { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/submissions/my-bids',{ headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/submissions/my',    { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [vData, bData, sData] = await Promise.all([
        vRes.json(), bRes.ok ? bRes.json() : { bids: [] }, sRes.ok ? sRes.json() : { submissions: [] },
      ])
      setViewings(vData.viewings || [])
      setBids(bData.bids || [])
      const subs = sData.submissions || []
      if (subs.length > 0) setSubmission(subs[0])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadSearches(token: string) {
    try {
      const res  = await fetch('http://localhost:8000/api/searches/', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setSearches(data.searches || [])
    } catch {}
  }

  async function loadDocuments(token: string) {
    try {
      const res  = await fetch('http://localhost:8000/api/documents/', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch {}
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const token    = localStorage.getItem('dossier_token')
      const formData = new FormData()
      formData.append('file', file)
      const res  = await fetch('http://localhost:8000/api/documents/upload', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      })
      const data = await res.json()
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

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handleSaveSearch(e: React.FormEvent) {
    e.preventDefault()
    setSavingSearch(true)
    setSearchMsg('')
    try {
      const token = localStorage.getItem('dossier_token')
      const res   = await fetch('http://localhost:8000/api/searches/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          city:          searchForm.city || null,
          min_price:     searchForm.min_price     ? parseFloat(searchForm.min_price)   : null,
          max_price:     searchForm.max_price     ? parseFloat(searchForm.max_price)   : null,
          min_area_m2:   searchForm.min_area_m2   ? parseFloat(searchForm.min_area_m2) : null,
          property_type: searchForm.property_type || null,
          email_alerts:  searchForm.email_alerts,
        }),
      })
      if (res.ok) {
        setSearchMsg('Zoekopdracht opgeslagen!')
        setShowSearch(false)
        setSearchForm({ city: '', min_price: '', max_price: '', min_area_m2: '', property_type: '', email_alerts: true })
        loadSearches(token!)
      }
    } catch {}
    finally { setSavingSearch(false) }
  }

  async function handleDeleteSearch(id: number) {
    const token = localStorage.getItem('dossier_token')
    await fetch(`http://localhost:8000/api/searches/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    })
    loadSearches(token!)
  }

  function handleLogout() {
    localStorage.removeItem('dossier_token')
    localStorage.removeItem('dossier_user_id')
    localStorage.removeItem('dossier_email')
    router.push('/dossier/login')
  }

  const timeline       = buildTimeline(submission, viewings, bids)
  const completedSteps = timeline.filter(s => s.done).length
  const progress       = Math.round((completedSteps / timeline.length) * 100)
  const currentStep    = timeline.find(s => !s.done)?.label || 'Afgerond'
  const property       = submission?.property || viewings[0]?.property || null

  const inputStyle = {
    background: 'rgba(14,59,40,0.04)', border: '1px solid rgba(14,59,40,0.12)',
    color: '#0e3b28', width: '100%', padding: '8px 12px', fontSize: '13px', outline: 'none'
  }
  const labelStyle = { fontSize: '11px', color: 'rgba(14,59,40,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }

  return (
    <div className="min-h-screen" style={{ background: '#f0faf5' }}>

      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: 'radial-gradient(rgba(14,59,40,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Nav */}
      <nav className="relative z-10 px-6 h-14 flex items-center justify-between"
        style={{ background: 'white', borderBottom: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 1px 8px rgba(14,59,40,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7" style={{ background: '#0e3b28' }}>
            <Home size={14} color="#2fc586" />
          </div>
          <span className="font-display font-bold text-base tracking-tight" style={{ color: '#0e3b28' }}>Mijn Dossier</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: 'rgba(14,59,40,0.45)' }}>{email}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70" style={{ color: 'rgba(14,59,40,0.4)' }}>
            <LogOut size={13} /> Uitloggen
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight mb-1" style={{ color: '#0e3b28' }}>Welkom terug</h1>
          <p className="text-sm" style={{ color: 'rgba(14,59,40,0.5)' }}>Hier vindt u alle informatie over uw woningtransactie.</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'rgba(14,59,40,0.4)' }}>Laden...</div>
        ) : (
          <>
            {/* Property card */}
            <div className="p-6 mb-6 flex items-center gap-5" style={{ background: '#0e3b28', boxShadow: '0 4px 20px rgba(14,59,40,0.2)' }}>
              <div className="w-16 h-16 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(47,197,134,0.15)', border: '1px solid rgba(47,197,134,0.3)' }}>
                <Home size={28} color="#2fc586" />
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-white text-lg mb-0.5">
                  {property ? `${property.street} ${property.house_number || ''}` : 'Woning'}
                </div>
                <div className="text-sm" style={{ color: 'rgba(113,221,175,0.6)' }}>
                  {property ? property.city : 'Geen woning gevonden'}
                  {submission?.reference && <span className="ml-3 font-mono text-xs opacity-60">{submission.reference}</span>}
                </div>
              </div>
              <div className="text-right">
                {submission?.asking_price ? (
                  <div className="font-mono font-bold text-white text-xl">
                    {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(submission.asking_price)}
                  </div>
                ) : (
                  <div className="font-mono font-bold text-white text-xl">Open bieding</div>
                )}
                <div className="text-xs mt-0.5 px-2 py-0.5 inline-block" style={{ background: 'rgba(47,197,134,0.15)', color: '#2fc586', border: '1px solid rgba(47,197,134,0.3)' }}>
                  {submission?.status === 'approved' ? 'Te koop' : 'In behandeling'}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="p-5 mb-6" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: '#0e3b28' }}>Voortgang transactie</span>
                <span className="font-mono text-sm font-bold" style={{ color: '#2fc586' }}>{completedSteps}/{timeline.length} stappen</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'rgba(14,59,40,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: '#2fc586' }} />
              </div>
              <div className="text-xs mt-2" style={{ color: 'rgba(14,59,40,0.4)' }}>
                Huidige stap: <strong style={{ color: '#0e3b28' }}>{currentStep}</strong>
              </div>
            </div>

            {/* Saved searches */}
            <div className="p-5 mb-6" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-sm uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.4)' }}>
                  Zoekopdrachten
                </h2>
                <button onClick={() => { setShowSearch(!showSearch); setSearchMsg('') }}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5"
                  style={{ background: 'rgba(47,197,134,0.1)', color: '#0e3b28', border: '1px solid rgba(47,197,134,0.25)' }}>
                  <Search size={11} /> + Nieuwe zoekopdracht
                </button>
              </div>

              {searchMsg && (
                <div className="text-xs p-2 mb-3" style={{ background: 'rgba(47,197,134,0.08)', border: '1px solid rgba(47,197,134,0.2)', color: '#0e3b28' }}>
                  {searchMsg}
                </div>
              )}

              {showSearch && (
                <form onSubmit={handleSaveSearch} className="mb-4 p-4" style={{ background: 'rgba(14,59,40,0.03)', border: '1px solid rgba(14,59,40,0.08)' }}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label style={labelStyle}>Stad</label>
                      <input type="text" value={searchForm.city} onChange={e => setSearchForm({...searchForm, city: e.target.value})} placeholder="Eindhoven" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Type woning</label>
                      <select value={searchForm.property_type} onChange={e => setSearchForm({...searchForm, property_type: e.target.value})} style={inputStyle}>
                        {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Min. prijs (€)</label>
                      <input type="number" value={searchForm.min_price} onChange={e => setSearchForm({...searchForm, min_price: e.target.value})} placeholder="200000" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Max. prijs (€)</label>
                      <input type="number" value={searchForm.max_price} onChange={e => setSearchForm({...searchForm, max_price: e.target.value})} placeholder="500000" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Min. oppervlak (m²)</label>
                      <input type="number" value={searchForm.min_area_m2} onChange={e => setSearchForm({...searchForm, min_area_m2: e.target.value})} placeholder="80" style={inputStyle} />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input type="checkbox" id="alerts" checked={searchForm.email_alerts} onChange={e => setSearchForm({...searchForm, email_alerts: e.target.checked})} className="w-4 h-4" />
                      <label htmlFor="alerts" className="text-xs cursor-pointer" style={{ color: '#0e3b28' }}>E-mail alerts bij nieuwe woningen</label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingSearch}
                      className="px-4 py-2 text-xs font-bold disabled:opacity-50"
                      style={{ background: '#0e3b28', color: '#2fc586' }}>
                      {savingSearch ? 'Opslaan...' : 'Zoekopdracht opslaan'}
                    </button>
                    <button type="button" onClick={() => setShowSearch(false)}
                      className="px-4 py-2 text-xs"
                      style={{ border: '1px solid rgba(14,59,40,0.15)', color: 'rgba(14,59,40,0.5)' }}>
                      Annuleren
                    </button>
                  </div>
                </form>
              )}

              {searches.length === 0 ? (
                <p className="text-xs" style={{ color: 'rgba(14,59,40,0.35)' }}>
                  Geen zoekopdrachten opgeslagen. Maak er een aan om automatisch op de hoogte te blijven van nieuwe woningen.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {searches.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3"
                      style={{ background: 'rgba(14,59,40,0.03)', border: '1px solid rgba(14,59,40,0.06)' }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#0e3b28' }}>
                          {[s.city, s.property_type].filter(Boolean).join(' · ') || 'Alle woningen'}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(14,59,40,0.4)' }}>
                          {s.min_price && `€${(s.min_price/1000).toFixed(0)}k`}
                          {s.min_price && s.max_price && ' – '}
                          {s.max_price && `€${(s.max_price/1000).toFixed(0)}k`}
                          {s.min_area_m2 && ` · min. ${s.min_area_m2}m²`}
                          {s.email_alerts && ' · 📧 alerts aan'}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteSearch(s.id)}
                        className="opacity-30 hover:opacity-100 transition-opacity"
                        style={{ color: '#b84033' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Viewings */}
            {viewings.length > 0 && (
              <div className="p-5 mb-6" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4" style={{ color: 'rgba(14,59,40,0.4)' }}>Mijn bezichtigingen</h2>
                <div className="flex flex-col gap-2">
                  {viewings.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3" style={{ background: 'rgba(14,59,40,0.03)', border: '1px solid rgba(14,59,40,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <Calendar size={14} color="#2fc586" />
                        <div>
                          <div className="text-sm font-semibold" style={{ color: '#0e3b28' }}>
                            {v.property ? `${v.property.street} ${v.property.house_number}, ${v.property.city}` : 'Bezichtiging'}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'rgba(14,59,40,0.4)' }}>
                            {new Date(v.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} om {v.time}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-1" style={{
                        background: v.status === 'confirmed' ? 'rgba(47,197,134,0.1)' : v.status === 'rejected' ? 'rgba(184,64,51,0.1)' : 'rgba(196,124,26,0.1)',
                        color:      v.status === 'confirmed' ? '#2fc586' : v.status === 'rejected' ? '#b84033' : '#c47c1a',
                      }}>
                        {v.status === 'confirmed' ? 'Bevestigd' : v.status === 'rejected' ? 'Afgewezen' : 'In afwachting'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bids */}
            {bids.length > 0 && (
              <div className="p-5 mb-6" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4" style={{ color: 'rgba(14,59,40,0.4)' }}>Mijn biedingen</h2>
                <div className="flex flex-col gap-2">
                  {bids.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3" style={{ background: 'rgba(14,59,40,0.03)', border: '1px solid rgba(14,59,40,0.06)' }}>
                      <div className="text-sm font-semibold" style={{ color: '#0e3b28' }}>Bod geplaatst</div>
                      <div className="font-mono font-bold" style={{ color: '#2fc586' }}>
                        {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(b.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Timeline */}
              <div className="p-5" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4" style={{ color: 'rgba(14,59,40,0.4)' }}>Tijdlijn</h2>
                <div className="flex flex-col gap-0">
                  {timeline.map((step, i) => (
                    <div key={step.id} className="flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: step.done ? '#2fc586' : 'rgba(14,59,40,0.08)', border: step.done ? 'none' : '1px solid rgba(14,59,40,0.15)' }}>
                          {step.done ? <CheckCircle size={14} color="white" /> : <Clock size={12} color="rgba(14,59,40,0.3)" />}
                        </div>
                        {i < timeline.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ background: step.done ? 'rgba(47,197,134,0.3)' : 'rgba(14,59,40,0.08)', minHeight: '16px' }} />
                        )}
                      </div>
                      <div className="pt-0.5">
                        <div className="text-sm font-semibold" style={{ color: step.done ? '#0e3b28' : 'rgba(14,59,40,0.35)' }}>{step.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(14,59,40,0.35)' }}>{step.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-6">
                {/* Documents — real uploads */}
                <div className="p-5" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-bold text-sm uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.4)' }}>Documenten</h2>
                    <label className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 cursor-pointer"
                      style={{ background: 'rgba(47,197,134,0.1)', color: '#0e3b28', border: '1px solid rgba(47,197,134,0.25)' }}>
                      <Upload size={11} />
                      {uploading ? 'Uploaden...' : '+ Upload'}
                      <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
                    </label>
                  </div>
                  {uploadError && (
                    <p className="text-xs p-2 mb-3" style={{ background: 'rgba(184,64,51,0.08)', border: '1px solid rgba(184,64,51,0.2)', color: '#b84033' }}>
                      {uploadError}
                    </p>
                  )}
                  {documents.length === 0 ? (
                    <p className="text-xs" style={{ color: 'rgba(14,59,40,0.35)' }}>
                      Nog geen documenten geüpload. Upload PDF, afbeeldingen of Word-bestanden.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 p-3"
                          style={{ background: 'rgba(14,59,40,0.03)', border: '1px solid rgba(14,59,40,0.06)' }}>
                          <FileText size={16} color="rgba(14,59,40,0.3)" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: '#0e3b28' }}>{doc.original_name}</div>
                            <div className="text-xs" style={{ color: 'rgba(14,59,40,0.4)' }}>{formatSize(doc.file_size)}</div>
                          </div>
                          <button onClick={() => window.open(`http://localhost:8000/api/documents/${doc.id}/download`, '_blank')}
                            className="opacity-40 hover:opacity-100 transition-opacity mr-1" title="Download">
                            <Download size={14} color="#0e3b28" />
                          </button>
                          <button onClick={() => handleDeleteDoc(doc.id)}
                            className="opacity-30 hover:opacity-100 transition-opacity" title="Verwijderen">
                            <Trash2 size={14} color="#b84033" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Makelaar */}
                <div className="p-5" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                  <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4" style={{ color: 'rgba(14,59,40,0.4)' }}>Uw makelaar</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center font-bold text-white flex-shrink-0" style={{ background: '#0e3b28', fontSize: '14px' }}>SM</div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#0e3b28' }}>Stadsmakelaars</div>
                      <div className="text-xs" style={{ color: 'rgba(14,59,40,0.4)' }}>Hooghuisstraat 31A, Eindhoven</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="flex items-center gap-3 p-3 text-sm w-full text-left" style={{ background: 'rgba(14,59,40,0.04)', border: '1px solid rgba(14,59,40,0.06)', color: '#0e3b28' }}>
                      <Phone size={14} color="#2fc586" /> 085 080 55 98
                    </button>
                    <button className="flex items-center gap-3 p-3 text-sm w-full text-left" style={{ background: 'rgba(14,59,40,0.04)', border: '1px solid rgba(14,59,40,0.06)', color: '#0e3b28' }}>
                      <Mail size={14} color="#2fc586" /> info@stadsmakelaars.nl
                    </button>
                    <button onClick={() => setShowMelding(true)} className="flex items-center gap-3 p-3 text-sm w-full text-left mt-1 transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(184,64,51,0.06)', border: '1px solid rgba(184,64,51,0.2)', color: '#b84033' }}>
                      <AlertTriangle size={14} color="#b84033" /> Probleem melden
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative z-10 text-center py-6 text-xs" style={{ color: 'rgba(14,59,40,0.25)' }}>
        Mogelijk gemaakt door{' '}
        <span className="font-bold" style={{ color: '#0e3b28' }}>Groun<span style={{ color: '#2fc586' }}>dr</span></span>
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