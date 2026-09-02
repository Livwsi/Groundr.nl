'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle, Home, BarChart2, FileText, Download } from 'lucide-react'
import { useLanguage } from '@/store/language'

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', amberLt: '#FFFBEB', red: '#DC2626', redLt: '#FEF2F2',
  blue: '#2563EB',
  shadow: '0 1px 3px rgba(11,19,32,0.06)', shadowMd: '0 2px 12px rgba(11,19,32,0.08)',
}

const inp = {
  width: '100%', padding: '9px 12px',
  background: S.surface, border: `1px solid ${S.border}`,
  fontFamily: 'inherit', fontSize: '13.5px', color: S.t1, outline: 'none',
}

const lbl = {
  display: 'block', fontSize: '11px', fontWeight: 500 as const,
  color: S.t3, textTransform: 'uppercase' as const,
  letterSpacing: '0.06em', marginBottom: '5px',
}

interface Report {
  id: number; address: string; status: string; property_type: string
  year_built: number | null; living_area_m2: number | null; plot_area_m2: number | null
  energy_label: string | null; condition_score: number | null; condition_note: string | null
  marktwaarde: number | null; nwwi_number: string | null; comparables: Comparable[]
}

interface Comparable {
  id: number; address: string; sale_price: number; sale_date: string
  living_area_m2: number | null; corrections: Record<string, number>; adjusted_price: number
}

const STEPS = [
  { id: 1, key: 'details',     icon: <Home size={14} /> },
  { id: 2, key: 'condition',   icon: <CheckCircle size={14} /> },
  { id: 3, key: 'comparables', icon: <BarChart2 size={14} /> },
  { id: 4, key: 'valuation',   icon: <FileText size={14} /> },
  { id: 5, key: 'finalize',    icon: <Download size={14} /> },
]

function formatPrice(p: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p)
}

export default function TaxatieFormPage() {
  const router   = useRouter()
  const params   = useParams()
  const id       = parseInt(params.id as string)
  const { lang } = useLanguage()
  const nl       = lang === 'nl'

  const [step,        setStep]        = useState(1)
  const [report,      setReport]      = useState<Report | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [details,     setDetails]     = useState({ property_type: 'house', year_built: '', living_area_m2: '', plot_area_m2: '', energy_label: 'unknown' })
  const [condition,   setCondition]   = useState({ condition_score: 3, condition_note: '' })
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [newComp,     setNewComp]     = useState({ address: '', sale_price: '', sale_date: '', living_area_m2: '' })
  const [addingComp,  setAddingComp]  = useState(false)
  const [loadingSugg, setLoadingSugg] = useState(false)
  const [marktwaarde, setMarktwaarde] = useState('')

  useEffect(() => { loadReport() }, [])

  async function loadReport() {
    setLoading(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/taxatie/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data  = await res.json()
      setReport(data)
      setDetails({ property_type: data.property_type || 'house', year_built: data.year_built ? String(data.year_built) : '', living_area_m2: data.living_area_m2 ? String(data.living_area_m2) : '', plot_area_m2: data.plot_area_m2 ? String(data.plot_area_m2) : '', energy_label: data.energy_label || 'unknown' })
      if (data.condition_score) setCondition({ condition_score: data.condition_score, condition_note: data.condition_note || '' })
      if (data.marktwaarde) setMarktwaarde(String(data.marktwaarde))
    } catch { setError('Kan rapport niet laden.') }
    finally { setLoading(false) }
  }

  async function save(payload: Record<string, any>) {
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/taxatie/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      if (!res.ok) { const d = await res.json(); setError(d.detail || 'Opslaan mislukt.'); return false }
      await loadReport(); return true
    } catch { setError('Verbindingsfout.'); return false }
    finally { setSaving(false) }
  }

  async function loadSuggestions() {
    setLoadingSugg(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/taxatie/${id}/comparables`, { headers: { Authorization: `Bearer ${token}` } })
      const data  = await res.json()
      setSuggestions(data.suggestions || [])
    } catch {}
    finally { setLoadingSugg(false) }
  }

  async function addComparable(comp: { address: string; sale_price: number; sale_date: string; living_area_m2?: number }) {
    setAddingComp(true)
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/taxatie/${id}/comparables`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(comp) })
      if (res.ok) { await loadReport(); setNewComp({ address: '', sale_price: '', sale_date: '', living_area_m2: '' }) }
    } catch {}
    finally { setAddingComp(false) }
  }

  async function removeComparable(compId: number) {
    const token = localStorage.getItem('groundr_token')
    await fetch(`${API_BASE}/api/taxatie/${id}/comparables/${compId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await loadReport()
  }

  async function finalize() {
    if (!marktwaarde) { setError(nl ? 'Voer een marktwaarde in.' : 'Enter a market value.'); return }
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('groundr_token')
      const res   = await fetch(`${API_BASE}/api/taxatie/${id}/finalize`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ marktwaarde: parseFloat(marktwaarde) }) })
      const data  = await res.json()
      if (!res.ok) { setError(data.detail || 'Finalisatie mislukt.'); return }
      await loadReport(); setStep(5)
    } catch { setError('Verbindingsfout.') }
    finally { setSaving(false) }
  }

  const stepLabels = nl
    ? ['Woninggegevens', 'Staat', 'Referenten', 'Waardering', 'Rapport']
    : ['Property details', 'Condition', 'Comparables', 'Valuation', 'Report']

  const isFinal = report?.status === 'final'

  const PROP_TYPES = [['house',nl?'Woning':'House'],['apartment',nl?'Appartement':'Apartment'],['villa','Villa'],['townhouse',nl?'Tussenwoning':'Townhouse'],['semi_detached',nl?'2-onder-1-kap':'Semi-detached'],['detached',nl?'Vrijstaand':'Detached']]

  if (loading) return <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '13px', color: S.t3 }}>{nl ? 'Laden...' : 'Loading...'}</span></div>
  if (!report) return <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '13px', color: S.red }}>Rapport niet gevonden.</span></div>

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: '56px', display: 'flex', alignItems: 'center', gap: '16px', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: S.shadow }}>
        <button onClick={() => router.push('/taxatie')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, display: 'flex' }}><ArrowLeft size={16} /></button>
        <img src="/logo.svg" alt="Groundr" style={{ height: '32px' }} />
        <span style={{ color: S.border }}>·</span>
        <span style={{ fontSize: '13.5px', color: S.t2 }}>{nl ? 'Taxatie' : 'Valuation'}</span>
        <span style={{ color: S.border }}>·</span>
        <span style={{ fontSize: '13.5px', color: S.t1, fontWeight: 500 }}>{report.address}</span>
        {isFinal && <span style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 500, background: S.greenLt, color: S.greenTx, border: `1px solid ${S.greenRim}`, marginLeft: '4px' }}>{report.nwwi_number}</span>}
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '32px' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <button onClick={() => !isFinal && setStep(s.id)} disabled={isFinal && s.id < 5}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', minWidth: '80px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: step === s.id ? S.green : s.id < step || isFinal ? S.greenLt : S.surface2,
                  border: `1.5px solid ${step === s.id ? S.green : s.id < step || isFinal ? S.green : S.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: step === s.id ? 'white' : s.id < step || isFinal ? S.greenTx : S.t3,
                  boxShadow: step === s.id ? `0 0 0 3px ${S.greenRim}` : 'none',
                  transition: 'all 0.2s',
                }}>
                  {s.icon}
                </div>
                <span style={{ fontSize: '11px', fontWeight: step === s.id ? 500 : 400, color: step === s.id ? S.green : S.t3 }}>{stepLabels[i]}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '1.5px', background: s.id < step ? S.green : S.border, margin: '0 4px', marginBottom: '20px', opacity: s.id < step ? 0.4 : 1 }} />
              )}
            </div>
          ))}
        </div>

        {error && <div style={{ background: S.redLt, border: `1px solid rgba(220,38,38,0.2)`, color: S.red, fontSize: '13px', padding: '10px 14px', marginBottom: '16px' }}>{error}</div>}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2 }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: S.t1 }}>{stepLabels[0]}</h2>
              <p style={{ fontSize: '13px', color: S.t3, marginTop: '2px' }}>{nl ? 'Controleer en vul de woninggegevens aan.' : 'Review and complete the property details.'}</p>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ padding: '10px 14px', background: S.greenLt, border: `1px solid ${S.greenRim}`, fontSize: '13.5px', color: S.greenTx, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📍</span> {report.address}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>{nl ? 'Type woning' : 'Property type'}</label>
                  <select value={details.property_type} onChange={e => setDetails({...details, property_type: e.target.value})} style={inp}>
                    {PROP_TYPES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{nl ? 'Bouwjaar' : 'Year built'}</label>
                  <input type="number" value={details.year_built} onChange={e => setDetails({...details, year_built: e.target.value})} placeholder="1985" style={inp} onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
                </div>
                <div>
                  <label style={lbl}>{nl ? 'Woonoppervlak (m²)' : 'Living area (m²)'}</label>
                  <input type="number" value={details.living_area_m2} onChange={e => setDetails({...details, living_area_m2: e.target.value})} placeholder="120" style={inp} onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
                </div>
                <div>
                  <label style={lbl}>{nl ? 'Perceeloppervlak (m²)' : 'Plot area (m²)'}</label>
                  <input type="number" value={details.plot_area_m2} onChange={e => setDetails({...details, plot_area_m2: e.target.value})} placeholder="250" style={inp} onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>{nl ? 'Energielabel' : 'Energy label'}</label>
                  <select value={details.energy_label} onChange={e => setDetails({...details, energy_label: e.target.value})} style={{...inp, width: '50%'}}>
                    <option value="unknown">{nl ? 'Onbekend' : 'Unknown'}</option>
                    {['A','A+','A++','B','C','D','E','F','G'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={async () => { const ok = await save({ property_type: details.property_type, year_built: details.year_built ? parseInt(details.year_built) : null, living_area_m2: details.living_area_m2 ? parseFloat(details.living_area_m2) : null, plot_area_m2: details.plot_area_m2 ? parseFloat(details.plot_area_m2) : null, energy_label: details.energy_label }); if (ok) setStep(2) }} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? '...' : (nl ? 'Opslaan & verder' : 'Save & continue')} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2 }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: S.t1 }}>{stepLabels[1]}</h2>
              <p style={{ fontSize: '13px', color: S.t3, marginTop: '2px' }}>{nl ? 'Beoordeel de staat van de woning (1=slecht, 6=uitstekend).' : 'Rate the condition (1=poor, 6=excellent).'}</p>
            </div>
            <div style={{ padding: '20px' }}>
              <label style={lbl}>{nl ? 'Onderhoudsstaat (1–6)' : 'Condition score (1–6)'}</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                {[1,2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => setCondition({...condition, condition_score: n})} style={{ width: '44px', height: '44px', background: condition.condition_score === n ? S.green : S.surface2, color: condition.condition_score === n ? 'white' : S.t2, border: `1.5px solid ${condition.condition_score === n ? S.green : S.border}`, fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: S.t3, marginBottom: '18px' }}>
                <span>{nl ? 'Slecht' : 'Poor'}</span><span>{nl ? 'Uitstekend' : 'Excellent'}</span>
              </div>
              <div>
                <label style={lbl}>{nl ? 'Toelichting staat (optioneel)' : 'Condition notes (optional)'}</label>
                <textarea value={condition.condition_note} onChange={e => setCondition({...condition, condition_note: e.target.value})}
                  placeholder={nl ? 'Bijv. dak vernieuwd in 2022, keuken origineel...' : 'E.g. roof replaced 2022, original kitchen...'}
                  rows={3} style={{...inp, resize: 'none'}} onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 14px', background: S.surface, color: S.t2, border: `1px solid ${S.border}`, fontSize: '13px', cursor: 'pointer' }}>
                  <ArrowLeft size={14} />{nl ? 'Terug' : 'Back'}
                </button>
                <button onClick={async () => { const ok = await save({ condition_score: condition.condition_score, condition_note: condition.condition_note }); if (ok) { setStep(3); loadSuggestions() } }} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? '...' : (nl ? 'Opslaan & verder' : 'Save & continue')} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2 }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: S.t1 }}>{stepLabels[2]}</h2>
              <p style={{ fontSize: '13px', color: S.t3, marginTop: '2px' }}>{nl ? 'Voeg minimaal 1 referentiepand toe (max. 5).' : 'Add at least 1 comparable (max. 5).'}</p>
            </div>
            <div style={{ padding: '20px' }}>

              {/* Current comparables */}
              {report.comparables.length > 0 && (
                <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {report.comparables.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: S.greenLt, border: `1px solid ${S.greenRim}` }}>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1 }}>{c.address}</div>
                        <div style={{ fontSize: '12px', color: S.t3, marginTop: '2px' }}>{formatPrice(c.sale_price)} · {c.sale_date}{c.living_area_m2 && ` · ${c.living_area_m2}m²`}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500, color: S.green }}>{formatPrice(c.adjusted_price)}</div>
                          <div style={{ fontSize: '11px', color: S.t3 }}>{nl ? 'Gecorrigeerd' : 'Adjusted'}</div>
                        </div>
                        {!isFinal && <button onClick={() => removeComparable(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, fontSize: '18px', lineHeight: 1 }} onMouseEnter={e => (e.currentTarget.style.color=S.red)} onMouseLeave={e => (e.currentTarget.style.color=S.t3)}>×</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && report.comparables.length < 5 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={lbl}>{nl ? 'Suggesties uit database' : 'Database suggestions'}</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {suggestions.slice(0, 5).map((s, i) => (
                      <button key={i} onClick={() => addComparable({ address: s.address, sale_price: s.sale_price, sale_date: s.sale_date, living_area_m2: s.living_area_m2 })}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: S.surface2, border: `1px solid ${S.border}`, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor=S.green)} onMouseLeave={e => (e.currentTarget.style.borderColor=S.border)}>
                        <div>
                          <div style={{ fontSize: '13.5px', color: S.t1 }}>{s.address}</div>
                          <div style={{ fontSize: '12px', color: S.t3 }}>{s.sale_date} · {s.living_area_m2}m²</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '13px', color: S.t1 }}>{formatPrice(s.sale_price)}</span>
                          <span style={{ fontSize: '11.5px', color: S.greenTx, fontWeight: 500 }}>+ {nl ? 'Toevoegen' : 'Add'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual add */}
              {report.comparables.length < 5 && !isFinal && (
                <div style={{ padding: '14px', background: S.surface2, border: `1px solid ${S.border}`, marginBottom: '16px' }}>
                  <label style={lbl}>{nl ? 'Handmatig toevoegen' : 'Add manually'}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <input type="text" value={newComp.address} onChange={e => setNewComp({...newComp, address: e.target.value})} placeholder={nl ? 'Adres' : 'Address'} style={inp} onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
                    </div>
                    <input type="number" value={newComp.sale_price} onChange={e => setNewComp({...newComp, sale_price: e.target.value})} placeholder={nl ? 'Verkoopprijs (€)' : 'Sale price (€)'} style={inp} onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
                    <input type="date" value={newComp.sale_date} onChange={e => setNewComp({...newComp, sale_date: e.target.value})} style={inp} onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
                    <input type="number" value={newComp.living_area_m2} onChange={e => setNewComp({...newComp, living_area_m2: e.target.value})} placeholder="m²" style={inp} onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
                    <button onClick={() => { if (!newComp.address || !newComp.sale_price || !newComp.sale_date) return; addComparable({ address: newComp.address, sale_price: parseFloat(newComp.sale_price), sale_date: newComp.sale_date, living_area_m2: newComp.living_area_m2 ? parseFloat(newComp.living_area_m2) : undefined }) }} disabled={addingComp}
                      style={{ height: '38px', background: S.greenLt, color: S.greenTx, border: `1px solid ${S.greenRim}`, fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                      {addingComp ? '...' : `+ ${nl ? 'Toevoegen' : 'Add'}`}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 14px', background: S.surface, color: S.t2, border: `1px solid ${S.border}`, fontSize: '13px', cursor: 'pointer' }}>
                  <ArrowLeft size={14} />{nl ? 'Terug' : 'Back'}
                </button>
                <button onClick={() => { if (report.comparables.length === 0) { setError(nl ? 'Voeg minimaal 1 referentiepand toe.' : 'Add at least 1 comparable.'); return } setError(''); setStep(4) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer' }}>
                  {nl ? 'Verder' : 'Continue'} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, background: S.surface2 }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: S.t1 }}>{stepLabels[3]}</h2>
              <p style={{ fontSize: '13px', color: S.t3, marginTop: '2px' }}>{nl ? 'Stel de marktwaarde vast op basis van de referenten.' : 'Determine market value based on comparables.'}</p>
            </div>
            <div style={{ padding: '20px' }}>
              {/* Summary */}
              {report.comparables.length > 0 && (
                <div style={{ background: S.surface2, border: `1px solid ${S.border}`, padding: '14px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{nl ? 'Referenten samenvatting' : 'Comparables summary'}</div>
                  {report.comparables.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', padding: '7px 0', borderBottom: `1px solid ${S.border}` }}>
                      <span style={{ color: S.t2 }}>{c.address}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 500, color: S.t1 }}>{formatPrice(c.adjusted_price)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', padding: '10px 0 0', fontWeight: 500 }}>
                    <span style={{ color: S.t2 }}>{nl ? 'Gemiddeld gecorrigeerd' : 'Average adjusted'}</span>
                    <span style={{ fontFamily: 'monospace', color: S.green }}>{formatPrice(report.comparables.reduce((s, c) => s + c.adjusted_price, 0) / report.comparables.length)}</span>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '8px' }}>
                <label style={lbl}>{nl ? 'Marktwaarde (€)' : 'Market value (€)'}</label>
                <input type="number" value={marktwaarde} onChange={e => setMarktwaarde(e.target.value)}
                  placeholder={report.comparables.length > 0 ? String(Math.round(report.comparables.reduce((s,c) => s+c.adjusted_price,0)/report.comparables.length)) : '450000'}
                  style={{...inp, fontSize: '20px', padding: '12px 14px'}}
                  onFocus={e => (e.target.style.borderColor=S.green)} onBlur={e => (e.target.style.borderColor=S.border)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 14px', background: S.surface, color: S.t2, border: `1px solid ${S.border}`, fontSize: '13px', cursor: 'pointer' }}>
                  <ArrowLeft size={14} />{nl ? 'Terug' : 'Back'}
                </button>
                <button onClick={finalize} disabled={saving || !marktwaarde}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', opacity: saving || !marktwaarde ? 0.6 : 1 }}>
                  {saving ? '...' : (nl ? 'Rapport finaliseren →' : 'Finalize report →')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5 ── */}
        {step === 5 && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: '14px', background: S.greenLt }}>
              <div style={{ width: '40px', height: '40px', background: S.surface, border: `1px solid ${S.greenRim}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={22} color={S.green} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: S.t1 }}>{nl ? 'Rapport gefinaliseerd' : 'Report finalized'}</div>
                <div style={{ fontSize: '12.5px', color: S.greenTx }}>{report.nwwi_number}</div>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                {[
                  { label: nl ? 'Adres' : 'Address',             value: report.address },
                  { label: nl ? 'Marktwaarde' : 'Market value',  value: report.marktwaarde ? formatPrice(report.marktwaarde) : '—' },
                  { label: nl ? 'Woonoppervlak' : 'Living area', value: report.living_area_m2 ? `${report.living_area_m2} m²` : '—' },
                  { label: nl ? 'Bouwjaar' : 'Year built',       value: report.year_built ? String(report.year_built) : '—' },
                  { label: nl ? 'Energielabel' : 'Energy label', value: report.energy_label || '—' },
                  { label: nl ? 'Onderhoudsstaat' : 'Condition', value: report.condition_score ? `${report.condition_score}/6` : '—' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: S.surface2, border: `1px solid ${S.border}` }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: S.t1 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {report.comparables.length > 0 && (
                <div style={{ background: S.surface2, border: `1px solid ${S.border}`, padding: '14px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{nl ? 'Referentiepanden' : 'Comparables'}</div>
                  {report.comparables.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '7px 0', borderBottom: `1px solid ${S.border}` }}>
                      <span style={{ color: S.t2 }}>{c.address}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 500, color: S.t1 }}>{formatPrice(c.adjusted_price)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer' }}>
                  <Download size={14} />{nl ? 'PDF downloaden' : 'Download PDF'}
                </button>
                <button onClick={() => router.push('/taxatie')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 16px', background: S.surface, color: S.t1, border: `1px solid ${S.border}`, fontSize: '13.5px', cursor: 'pointer' }}>
                  {nl ? 'Terug naar overzicht' : 'Back to overview'}
                </button>
              </div>

              <p style={{ fontSize: '12px', color: S.t3, marginTop: '14px' }}>
                {nl ? 'Dit rapport is gegenereerd door Groundr. NWWI-registratie vereist handtekening van gecertificeerd taxateur.' : 'This report was generated by Groundr. NWWI registration requires signature of a certified valuer.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}