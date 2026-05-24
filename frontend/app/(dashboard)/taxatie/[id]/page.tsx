'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle, Home, BarChart2, FileText, Download } from 'lucide-react'
import { useLanguage } from '@/store/language'

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
  { id: 1, key: 'details',     icon: <Home size={16} /> },
  { id: 2, key: 'condition',   icon: <CheckCircle size={16} /> },
  { id: 3, key: 'comparables', icon: <BarChart2 size={16} /> },
  { id: 4, key: 'valuation',   icon: <FileText size={16} /> },
  { id: 5, key: 'finalize',    icon: <Download size={16} /> },
]

function formatPrice(p: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p)
}

const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '100%', padding: '10px 14px', fontSize: '14px', outline: 'none' }
const labelStyle = { fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }

export default function TaxatieFormPage() {
  const router  = useRouter()
  const params  = useParams()
  const id      = parseInt(params.id as string)
  const { lang } = useLanguage()
  const nl      = lang === 'nl'

  const [step,    setStep]    = useState(1)
  const [report,  setReport]  = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  // Step 1 form
  const [details, setDetails] = useState({ property_type: 'house', year_built: '', living_area_m2: '', plot_area_m2: '', energy_label: 'unknown' })

  // Step 2 form
  const [condition, setCondition] = useState({ condition_score: 3, condition_note: '' })

  // Step 3 form
  const [suggestions,   setSuggestions]   = useState<any[]>([])
  const [newComp,       setNewComp]       = useState({ address: '', sale_price: '', sale_date: '', living_area_m2: '' })
  const [addingComp,    setAddingComp]    = useState(false)
  const [loadingSugg,   setLoadingSugg]   = useState(false)

  // Step 4
  const [marktwaarde, setMarktwaarde] = useState('')

  useEffect(() => { loadReport() }, [])

  async function loadReport() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(`http://localhost:8000/api/taxatie/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data  = await res.json()
      setReport(data)
      // Pre-fill forms
      setDetails({
        property_type:  data.property_type || 'house',
        year_built:     data.year_built ? String(data.year_built) : '',
        living_area_m2: data.living_area_m2 ? String(data.living_area_m2) : '',
        plot_area_m2:   data.plot_area_m2 ? String(data.plot_area_m2) : '',
        energy_label:   data.energy_label || 'unknown',
      })
      if (data.condition_score) setCondition({ condition_score: data.condition_score, condition_note: data.condition_note || '' })
      if (data.marktwaarde) setMarktwaarde(String(data.marktwaarde))
    } catch { setError('Kan rapport niet laden.') }
    finally { setLoading(false) }
  }

  async function save(payload: Record<string, any>) {
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(`http://localhost:8000/api/taxatie/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) { const d = await res.json(); setError(d.detail || 'Opslaan mislukt.'); return false }
      await loadReport()
      return true
    } catch { setError('Verbindingsfout.'); return false }
    finally { setSaving(false) }
  }

  async function loadSuggestions() {
    setLoadingSugg(true)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(`http://localhost:8000/api/taxatie/${id}/comparables`, { headers: { Authorization: `Bearer ${token}` } })
      const data  = await res.json()
      setSuggestions(data.suggestions || [])
    } catch {}
    finally { setLoadingSugg(false) }
  }

  async function addComparable(comp: { address: string; sale_price: number; sale_date: string; living_area_m2?: number }) {
    setAddingComp(true)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(`http://localhost:8000/api/taxatie/${id}/comparables`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(comp),
      })
      if (res.ok) { await loadReport(); setNewComp({ address: '', sale_price: '', sale_date: '', living_area_m2: '' }) }
    } catch {}
    finally { setAddingComp(false) }
  }

  async function removeComparable(compId: number) {
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:8000/api/taxatie/${id}/comparables/${compId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await loadReport()
  }

  async function finalize() {
    if (!marktwaarde) { setError(nl ? 'Voer een marktwaarde in.' : 'Enter a market value.'); return }
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(`http://localhost:8000/api/taxatie/${id}/finalize`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ marktwaarde: parseFloat(marktwaarde) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Finalisatie mislukt.'); return }
      await loadReport()
      setStep(5)
    } catch { setError('Verbindingsfout.') }
    finally { setSaving(false) }
  }

  const stepLabels = nl
    ? ['Woninggegevens', 'Staat', 'Referenten', 'Waardering', 'Rapport']
    : ['Property details', 'Condition', 'Comparables', 'Valuation', 'Report']

  if (loading) return (
    <div className="min-h-screen bg-g900 flex items-center justify-center">
      <p className="text-g300 opacity-40 text-sm">{nl ? 'Laden...' : 'Loading...'}</p>
    </div>
  )

  if (!report) return (
    <div className="min-h-screen bg-g900 flex items-center justify-center">
      <p className="text-red-400 text-sm">Rapport niet gevonden.</p>
    </div>
  )

  const isFinal = report.status === 'final'

  return (
    <div className="min-h-screen bg-g900">
      {/* Nav */}
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center gap-4">
        <button onClick={() => router.push('/taxatie')} className="text-g300 opacity-50 hover:opacity-100 transition-opacity"><ArrowLeft size={16} /></button>
        <img src="/logo.svg" alt="Groundr" className="h-10 w-auto" />
        <span className="text-g300 opacity-30 text-sm">/ {nl ? 'Taxatie' : 'Valuation'} / {report.address}</span>
        {isFinal && <span className="text-xs font-bold px-2 py-0.5 ml-2" style={{ background: 'rgba(47,197,134,0.1)', color: '#2fc586', border: '1px solid rgba(47,197,134,0.3)' }}>{report.nwwi_number}</span>}
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <button
                onClick={() => !isFinal && setStep(s.id)}
                className="flex flex-col items-center gap-1.5 flex-1"
                disabled={isFinal && s.id < 5}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: step === s.id ? '#2fc586' : s.id < step || isFinal ? 'rgba(47,197,134,0.2)' : 'rgba(255,255,255,0.08)',
                    color:      step === s.id ? '#061a11' : s.id < step || isFinal ? '#2fc586' : 'rgba(255,255,255,0.3)',
                  }}>
                  {s.icon}
                </div>
                <span className="text-xs" style={{ color: step === s.id ? '#2fc586' : 'rgba(255,255,255,0.3)' }}>
                  {stepLabels[i]}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="h-px flex-1 mx-2" style={{ background: s.id < step ? 'rgba(47,197,134,0.3)' : 'rgba(255,255,255,0.08)' }} />
              )}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-6">{error}</div>}

        {/* ── STEP 1: Property details ── */}
        {step === 1 && (
          <div className="bg-g800 border border-g700 p-6">
            <h2 className="font-display font-bold text-white mb-1">{stepLabels[0]}</h2>
            <p className="text-sm text-g300 opacity-50 mb-6">{nl ? 'Controleer en vul de woninggegevens aan.' : 'Review and complete the property details.'}</p>

            <div className="mb-4 p-3 text-sm" style={{ background: 'rgba(47,197,134,0.08)', border: '1px solid rgba(47,197,134,0.2)', color: '#2fc586' }}>
              📍 {report.address}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>{nl ? 'Type woning' : 'Property type'}</label>
                <select value={details.property_type} onChange={e => setDetails({...details, property_type: e.target.value})} style={inputStyle}>
                  {[['house', nl?'Woning':'House'],['apartment',nl?'Appartement':'Apartment'],['villa','Villa'],['townhouse',nl?'Tussenwoning':'Townhouse'],['semi_detached',nl?'2-onder-1-kap':'Semi-detached'],['detached',nl?'Vrijstaand':'Detached']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{nl ? 'Bouwjaar' : 'Year built'}</label>
                <input type="number" value={details.year_built} onChange={e => setDetails({...details, year_built: e.target.value})} placeholder="1985" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{nl ? 'Woonoppervlak (m²)' : 'Living area (m²)'}</label>
                <input type="number" value={details.living_area_m2} onChange={e => setDetails({...details, living_area_m2: e.target.value})} placeholder="120" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{nl ? 'Perceeloppervlak (m²)' : 'Plot area (m²)'}</label>
                <input type="number" value={details.plot_area_m2} onChange={e => setDetails({...details, plot_area_m2: e.target.value})} placeholder="250" style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>{nl ? 'Energielabel' : 'Energy label'}</label>
                <select value={details.energy_label} onChange={e => setDetails({...details, energy_label: e.target.value})} style={inputStyle}>
                  {['unknown','A','A+','A++','B','C','D','E','F','G'].map(l => <option key={l} value={l}>{l === 'unknown' ? (nl?'Onbekend':'Unknown') : l}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={async () => {
                const ok = await save({
                  property_type:  details.property_type,
                  year_built:     details.year_built ? parseInt(details.year_built) : null,
                  living_area_m2: details.living_area_m2 ? parseFloat(details.living_area_m2) : null,
                  plot_area_m2:   details.plot_area_m2 ? parseFloat(details.plot_area_m2) : null,
                  energy_label:   details.energy_label,
                })
                if (ok) setStep(2)
              }} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-50"
                style={{ background: '#2fc586', color: '#061a11' }}>
                {saving ? '...' : (nl ? 'Opslaan & verder' : 'Save & continue')} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Condition ── */}
        {step === 2 && (
          <div className="bg-g800 border border-g700 p-6">
            <h2 className="font-display font-bold text-white mb-1">{stepLabels[1]}</h2>
            <p className="text-sm text-g300 opacity-50 mb-6">{nl ? 'Beoordeel de staat van de woning (1=slecht, 6=uitstekend).' : 'Rate the condition (1=poor, 6=excellent).'}</p>

            <div className="mb-6">
              <label style={labelStyle}>{nl ? 'Onderhoudsstaat (1–6)' : 'Condition score (1–6)'}</label>
              <div className="flex gap-3 mt-2">
                {[1,2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => setCondition({...condition, condition_score: n})}
                    className="w-12 h-12 font-bold text-lg transition-all"
                    style={{
                      background: condition.condition_score === n ? '#2fc586' : 'rgba(255,255,255,0.06)',
                      color:      condition.condition_score === n ? '#061a11' : 'rgba(255,255,255,0.5)',
                      border:     condition.condition_score === n ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-g300 opacity-40 mt-2 px-1">
                <span>{nl ? 'Slecht' : 'Poor'}</span>
                <span>{nl ? 'Uitstekend' : 'Excellent'}</span>
              </div>
            </div>

            <div className="mb-6">
              <label style={labelStyle}>{nl ? 'Toelichting staat (optioneel)' : 'Condition notes (optional)'}</label>
              <textarea value={condition.condition_note} onChange={e => setCondition({...condition, condition_note: e.target.value})}
                placeholder={nl ? 'Bijv. dak vernieuwd in 2022, keuken origineel...' : 'E.g. roof replaced 2022, original kitchen...'}
                rows={3} style={{...inputStyle, resize: 'none'}} />
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-g300 opacity-50 hover:opacity-100">
                <ArrowLeft size={14} /> {nl ? 'Terug' : 'Back'}
              </button>
              <button onClick={async () => {
                const ok = await save({ condition_score: condition.condition_score, condition_note: condition.condition_note })
                if (ok) { setStep(3); loadSuggestions() }
              }} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-50"
                style={{ background: '#2fc586', color: '#061a11' }}>
                {saving ? '...' : (nl ? 'Opslaan & verder' : 'Save & continue')} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Comparables ── */}
        {step === 3 && (
          <div className="bg-g800 border border-g700 p-6">
            <h2 className="font-display font-bold text-white mb-1">{stepLabels[2]}</h2>
            <p className="text-sm text-g300 opacity-50 mb-6">{nl ? 'Voeg minimaal 1 referentiepand toe (max. 5).' : 'Add at least 1 comparable (max. 5).'}</p>

            {/* Current comparables */}
            {report.comparables.length > 0 && (
              <div className="flex flex-col gap-2 mb-6">
                {report.comparables.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between p-3"
                    style={{ background: 'rgba(47,197,134,0.05)', border: '1px solid rgba(47,197,134,0.15)' }}>
                    <div>
                      <div className="text-sm font-semibold text-white">{c.address}</div>
                      <div className="text-xs text-g300 opacity-50 mt-0.5">
                        {formatPrice(c.sale_price)} · {c.sale_date}
                        {c.living_area_m2 && ` · ${c.living_area_m2}m²`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold" style={{ color: '#2fc586' }}>{formatPrice(c.adjusted_price)}</div>
                        <div className="text-xs text-g300 opacity-40">{nl ? 'Gecorrigeerd' : 'Adjusted'}</div>
                      </div>
                      {!isFinal && (
                        <button onClick={() => removeComparable(c.id)} className="text-g300 opacity-30 hover:opacity-100 hover:text-red-400 text-lg">×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Auto-suggestions */}
            {suggestions.length > 0 && report.comparables.length < 5 && (
              <div className="mb-6">
                <label style={labelStyle}>{nl ? 'Suggesties uit database' : 'Suggestions from database'}</label>
                <div className="flex flex-col gap-1.5 mt-2">
                  {suggestions.slice(0, 5).map((s, i) => (
                    <button key={i} onClick={() => addComparable({ address: s.address, sale_price: s.sale_price, sale_date: s.sale_date, living_area_m2: s.living_area_m2 })}
                      className="flex items-center justify-between p-3 text-left transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(47,197,134,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                      <div>
                        <div className="text-sm text-white">{s.address}</div>
                        <div className="text-xs text-g300 opacity-50">{s.sale_date} · {s.living_area_m2}m²</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-white">{formatPrice(s.sale_price)}</span>
                        <span className="text-xs text-g400">+ {nl ? 'Toevoegen' : 'Add'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual add */}
            {report.comparables.length < 5 && !isFinal && (
              <div className="p-4 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <label style={labelStyle}>{nl ? 'Referentiepand handmatig toevoegen' : 'Add comparable manually'}</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="col-span-2">
                    <input type="text" value={newComp.address} onChange={e => setNewComp({...newComp, address: e.target.value})}
                      placeholder={nl ? 'Adres' : 'Address'} style={inputStyle} />
                  </div>
                  <input type="number" value={newComp.sale_price} onChange={e => setNewComp({...newComp, sale_price: e.target.value})}
                    placeholder={nl ? 'Verkoopprijs (€)' : 'Sale price (€)'} style={inputStyle} />
                  <input type="date" value={newComp.sale_date} onChange={e => setNewComp({...newComp, sale_date: e.target.value})} style={inputStyle} />
                  <input type="number" value={newComp.living_area_m2} onChange={e => setNewComp({...newComp, living_area_m2: e.target.value})}
                    placeholder="m²" style={inputStyle} />
                  <button onClick={() => {
                    if (!newComp.address || !newComp.sale_price || !newComp.sale_date) return
                    addComparable({ address: newComp.address, sale_price: parseFloat(newComp.sale_price), sale_date: newComp.sale_date, living_area_m2: newComp.living_area_m2 ? parseFloat(newComp.living_area_m2) : undefined })
                  }} disabled={addingComp}
                    className="text-sm font-bold disabled:opacity-50"
                    style={{ background: 'rgba(47,197,134,0.1)', color: '#2fc586', border: '1px solid rgba(47,197,134,0.25)' }}>
                    {addingComp ? '...' : `+ ${nl ? 'Toevoegen' : 'Add'}`}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-g300 opacity-50 hover:opacity-100">
                <ArrowLeft size={14} /> {nl ? 'Terug' : 'Back'}
              </button>
              <button onClick={() => { if (report.comparables.length === 0) { setError(nl ? 'Voeg minimaal 1 referentiepand toe.' : 'Add at least 1 comparable.'); return } setError(''); setStep(4) }}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold"
                style={{ background: '#2fc586', color: '#061a11' }}>
                {nl ? 'Verder' : 'Continue'} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Valuation ── */}
        {step === 4 && (
          <div className="bg-g800 border border-g700 p-6">
            <h2 className="font-display font-bold text-white mb-1">{stepLabels[3]}</h2>
            <p className="text-sm text-g300 opacity-50 mb-6">{nl ? 'Stel de marktwaarde vast op basis van de referenten.' : 'Determine the market value based on comparables.'}</p>

            {/* Comparables summary */}
            {report.comparables.length > 0 && (
              <div className="mb-6 p-4" style={{ background: 'rgba(47,197,134,0.05)', border: '1px solid rgba(47,197,134,0.15)' }}>
                <div className="text-xs text-g300 opacity-50 mb-3 uppercase tracking-wider">{nl ? 'Referentiepanden samenvatting' : 'Comparables summary'}</div>
                {report.comparables.map(c => (
                  <div key={c.id} className="flex justify-between text-sm py-1.5 border-b border-g700/30 last:border-0">
                    <span className="text-g300 opacity-70">{c.address}</span>
                    <span className="font-mono text-white">{formatPrice(c.adjusted_price)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 mt-1">
                  <span className="text-g300 opacity-50">{nl ? 'Gemiddeld gecorrigeerd' : 'Average adjusted'}</span>
                  <span className="font-mono font-bold" style={{ color: '#2fc586' }}>
                    {formatPrice(report.comparables.reduce((s, c) => s + c.adjusted_price, 0) / report.comparables.length)}
                  </span>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label style={labelStyle}>{nl ? 'Marktwaarde (€)' : 'Market value (€)'}</label>
              <input type="number" value={marktwaarde} onChange={e => setMarktwaarde(e.target.value)}
                placeholder={report.comparables.length > 0
                  ? String(Math.round(report.comparables.reduce((s, c) => s + c.adjusted_price, 0) / report.comparables.length))
                  : '450000'}
                style={{ ...inputStyle, fontSize: '20px', padding: '14px' }} />
              <p className="text-xs text-g300 opacity-40 mt-2">
                {nl ? 'Dit wordt de definitieve marktwaarde in het rapport.' : 'This will be the final market value in the report.'}
              </p>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(3)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-g300 opacity-50 hover:opacity-100">
                <ArrowLeft size={14} /> {nl ? 'Terug' : 'Back'}
              </button>
              <button onClick={finalize} disabled={saving || !marktwaarde}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-50"
                style={{ background: '#2fc586', color: '#061a11' }}>
                {saving ? '...' : (nl ? 'Rapport finaliseren →' : 'Finalize report →')}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Final report ── */}
        {step === 5 && (
          <div className="bg-g800 border border-g700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(47,197,134,0.15)' }}>
                <CheckCircle size={24} color="#2fc586" />
              </div>
              <div>
                <h2 className="font-display font-bold text-white">{nl ? 'Rapport gefinaliseerd' : 'Report finalized'}</h2>
                <p className="text-sm text-g300 opacity-50">{report.nwwi_number}</p>
              </div>
            </div>

            {/* Report summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: nl ? 'Adres' : 'Address',             value: report.address },
                { label: nl ? 'Marktwaarde' : 'Market value',  value: report.marktwaarde ? formatPrice(report.marktwaarde) : '—' },
                { label: nl ? 'Woonoppervlak' : 'Living area', value: report.living_area_m2 ? `${report.living_area_m2} m²` : '—' },
                { label: nl ? 'Bouwjaar' : 'Year built',       value: report.year_built ? String(report.year_built) : '—' },
                { label: nl ? 'Energielabel' : 'Energy label', value: report.energy_label || '—' },
                { label: nl ? 'Onderhoudsstaat' : 'Condition', value: report.condition_score ? `${report.condition_score}/6` : '—' },
              ].map((item, i) => (
                <div key={i} className="p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-xs text-g300 opacity-40 mb-1">{item.label}</div>
                  <div className="text-sm font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="p-4 mb-6" style={{ background: 'rgba(47,197,134,0.05)', border: '1px solid rgba(47,197,134,0.15)' }}>
              <div className="text-xs text-g300 opacity-50 mb-2 uppercase tracking-wider">{nl ? 'Referentiepanden' : 'Comparables'}</div>
              {report.comparables.map(c => (
                <div key={c.id} className="flex justify-between text-sm py-1.5 border-b border-g700/30 last:border-0">
                  <span className="text-g300 opacity-70">{c.address}</span>
                  <span className="font-mono text-white">{formatPrice(c.adjusted_price)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-3 text-sm font-bold"
                style={{ background: '#2fc586', color: '#061a11' }}>
                <Download size={14} /> {nl ? 'PDF downloaden' : 'Download PDF'}
              </button>
              <button onClick={() => router.push('/taxatie')}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                {nl ? 'Terug naar overzicht' : 'Back to overview'}
              </button>
            </div>

            <p className="text-xs text-g300 opacity-30 mt-4">
              {nl ? 'Dit rapport is gegenereerd door Groundr. NWWI-registratie vereist handtekening van gecertificeerd taxateur.' : 'This report was generated by Groundr. NWWI registration requires signature of a certified valuer.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}