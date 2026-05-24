'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Home, MapPin, Euro, Clock, AlertTriangle, CheckCircle, Camera, Phone, Mail } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const AGENCY = { name: 'Stadsmakelaars', phone: '085 080 55 98', email: 'info@stadsmakelaars.nl' }

export default function SubmitListingPage() {
  const params     = useParams()
  const router     = useRouter()
  const makelaarId = params.makelaarId as string
  const { lang }   = useLanguage()
  const nl         = lang === 'nl'

  const [step,      setStep]      = useState<'form' | 'success'>('form')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [photos,    setPhotos]    = useState<string[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  const [form, setForm] = useState({
    address: '', area_m2: '', property_type: 'house', energy_label: 'unknown',
    price_mode: 'open', asking_price: '', urgency: 'normal', bid_deadline: '', description: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dossier_token')
    if (!token) { sessionStorage.setItem('after_login', `/submit/${makelaarId}`); router.push('/register'); return }
    setIsLoggedIn(true)
  }, [])

  if (isLoggedIn === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0faf5' }}>
      <div className="text-sm" style={{ color: 'rgba(14,59,40,0.4)' }}>{nl ? 'Laden...' : 'Loading...'}</div>
    </div>
  )

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).slice(0, 8 - photos.length).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setPhotos(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const token = localStorage.getItem('token') || localStorage.getItem('dossier_token')
    try {
      const res = await fetch('http://localhost:8000/api/submissions/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          makelaar_id: parseInt(makelaarId), address: form.address,
          area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
          property_type: form.property_type, energy_label: form.energy_label,
          asking_price: form.price_mode !== 'open' && form.asking_price ? parseFloat(form.asking_price) : null,
          show_price: form.price_mode !== 'open', urgency: form.urgency,
          bid_deadline: form.bid_deadline || null, description: form.description || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || (nl ? 'Er is iets misgegaan.' : 'Something went wrong.')); return }
      setStep('success')
    } catch { setError(nl ? 'Kan geen verbinding maken met de server.' : 'Cannot connect to server.') }
    finally { setLoading(false) }
  }

  const URGENCY_OPTIONS = [
    { value: 'normal', label: nl ? 'Normaal'  : 'Normal', desc: nl ? 'Geen tijdsdruk'              : 'No time pressure',      color: '#2fc586' },
    { value: 'urgent', label: 'Urgent',                   desc: nl ? 'Zo snel mogelijk verkopen'   : 'Sell as soon as possible', color: '#c47c1a' },
    { value: 'asap',   label: nl ? 'Moet weg' : 'ASAP',  desc: nl ? 'Direct verkopen, elke prijs' : 'Sell immediately',       color: '#b84033' },
  ]

  const PRICE_MODES = [
    { value: 'open',  label: nl ? 'Open bieding'       : 'Open bid',          desc: nl ? 'Geen vraagprijs — laat bieders beslissen' : 'No asking price — let bidders decide' },
    { value: 'fixed', label: nl ? 'Vraagprijs'         : 'Asking price',      desc: nl ? 'Vaste prijs, geen biedingen'              : 'Fixed price, no bidding' },
    { value: 'bid',   label: nl ? 'Vraagprijs + bieden': 'Price + bidding',   desc: nl ? 'Prijs zichtbaar, biedingen toegestaan'    : 'Price shown, bidding allowed' },
  ]

  const PROP_TYPES = [
    { value: 'house',         label: nl ? 'Woning'        : 'House' },
    { value: 'apartment',     label: nl ? 'Appartement'   : 'Apartment' },
    { value: 'villa',         label: 'Villa' },
    { value: 'townhouse',     label: nl ? 'Tussenwoning'  : 'Townhouse' },
    { value: 'semi_detached', label: nl ? '2-onder-1-kap' : 'Semi-detached' },
    { value: 'detached',      label: nl ? 'Vrijstaand'    : 'Detached' },
  ]

  const inputStyle = { background: '#f7faf8', border: '1px solid rgba(14,59,40,0.12)', color: '#0e3b28' }
  const labelStyle = "block text-xs font-semibold mb-2 uppercase tracking-wider"

  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f0faf5' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6" style={{ background: '#0e3b28' }}>
          <CheckCircle size={40} color="#2fc586" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-3" style={{ color: '#0e3b28' }}>
          {nl ? 'Aanmelding ingediend!' : 'Application submitted!'}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(14,59,40,0.6)' }}>
          {nl ? `${AGENCY.name} beoordeelt uw woning binnen 24 uur.` : `${AGENCY.name} will review your property within 24 hours.`}
        </p>
        <button onClick={() => router.push('/microsite/stadsmakelaars')} className="text-sm font-semibold px-6 py-3" style={{ background: '#0e3b28', color: '#2fc586' }}>
          {nl ? 'Terug naar woningen' : 'Back to listings'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 py-12" style={{ background: '#f0faf5' }}>
      <div className="fixed inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(14,59,40,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Language toggle */}
      <div className="fixed top-4 right-4 z-50"><LanguageToggle /></div>

      <div className="relative max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4" style={{ background: '#0e3b28' }}>
            <Home size={22} color="#2fc586" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2" style={{ color: '#0e3b28' }}>
            {nl ? 'Woning aanmelden' : 'Submit property'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(14,59,40,0.5)' }}>
            {nl ? `Meld uw woning aan bij ${AGENCY.name}. Na goedkeuring staat uw woning live.` : `Submit your property to ${AGENCY.name}. After approval it goes live.`}
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Photos */}
          <div className="p-6 mb-4" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
            <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0e3b28' }}>
              <Camera size={16} color="#2fc586" />{nl ? "Foto's" : 'Photos'}
            </h2>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(184,64,51,0.9)', color: 'white' }}>×</button>
                </div>
              ))}
              {photos.length < 8 && (
                <label className="aspect-square flex flex-col items-center justify-center cursor-pointer"
                  style={{ border: '2px dashed rgba(14,59,40,0.15)', background: 'rgba(14,59,40,0.02)', color: 'rgba(14,59,40,0.3)' }}>
                  <Camera size={20} /><span className="text-xs mt-1">{nl ? 'Toevoegen' : 'Add'}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
            <p className="text-xs" style={{ color: 'rgba(14,59,40,0.35)' }}>
              {nl ? "Voeg tot 8 foto's toe." : 'Add up to 8 photos.'}
            </p>
          </div>

          {/* Property details */}
          <div className="p-6 mb-4" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
            <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0e3b28' }}>
              <MapPin size={16} color="#2fc586" />{nl ? 'Woning gegevens' : 'Property details'}
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelStyle} style={{ color: 'rgba(14,59,40,0.5)' }}>{nl ? 'Volledig adres' : 'Full address'} *</label>
                <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                  placeholder="Stratumsedijk 23 Eindhoven" required className="w-full px-4 py-3 text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle} style={{ color: 'rgba(14,59,40,0.5)' }}>{nl ? 'Woonoppervlak (m²)' : 'Living area (m²)'}</label>
                  <input type="number" value={form.area_m2} onChange={e => setForm({...form, area_m2: e.target.value})} placeholder="120" className="w-full px-4 py-3 text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle} style={{ color: 'rgba(14,59,40,0.5)' }}>{nl ? 'Type woning' : 'Property type'}</label>
                  <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})} className="w-full px-4 py-3 text-sm outline-none" style={inputStyle}>
                    {PROP_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelStyle} style={{ color: 'rgba(14,59,40,0.5)' }}>{nl ? 'Energielabel' : 'Energy label'}</label>
                <select value={form.energy_label} onChange={e => setForm({...form, energy_label: e.target.value})} className="w-full px-4 py-3 text-sm outline-none" style={inputStyle}>
                  <option value="unknown">{nl ? 'Onbekend' : 'Unknown'}</option>
                  {['A','A+','A++','B','C','D','E','F','G'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelStyle} style={{ color: 'rgba(14,59,40,0.5)' }}>{nl ? 'Omschrijving (optioneel)' : 'Description (optional)'}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder={nl ? 'Vertel iets over uw woning...' : 'Tell us about your property...'} rows={3}
                  className="w-full px-4 py-3 text-sm outline-none resize-none" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-6 mb-4" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
            <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0e3b28' }}>
              <Euro size={16} color="#2fc586" />{nl ? 'Prijsstrategie' : 'Pricing strategy'}
            </h2>
            <div className="flex flex-col gap-2 mb-4">
              {PRICE_MODES.map(mode => (
                <label key={mode.value} className="flex items-start gap-3 p-3 cursor-pointer transition-all"
                  style={{ background: form.price_mode === mode.value ? 'rgba(47,197,134,0.06)' : 'rgba(14,59,40,0.02)', border: form.price_mode === mode.value ? '1px solid rgba(47,197,134,0.3)' : '1px solid rgba(14,59,40,0.08)' }}>
                  <input type="radio" name="price_mode" value={mode.value} checked={form.price_mode === mode.value} onChange={() => setForm({...form, price_mode: mode.value})} className="mt-0.5" style={{ accentColor: '#2fc586' }} />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#0e3b28' }}>{mode.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(14,59,40,0.45)' }}>{mode.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {form.price_mode !== 'open' && (
              <div>
                <label className={labelStyle} style={{ color: 'rgba(14,59,40,0.5)' }}>{nl ? 'Vraagprijs (€)' : 'Asking price (€)'} *</label>
                <input type="number" value={form.asking_price} onChange={e => setForm({...form, asking_price: e.target.value})}
                  placeholder="450000" required={form.price_mode !== 'open'} className="w-full px-4 py-3 text-sm outline-none" style={inputStyle} />
              </div>
            )}
          </div>

          {/* Urgency */}
          <div className="p-6 mb-4" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
            <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0e3b28' }}>
              <AlertTriangle size={16} color="#2fc586" />{nl ? 'Urgentie en deadline' : 'Urgency and deadline'}
            </h2>
            <div className="flex flex-col gap-2 mb-4">
              {URGENCY_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-3 p-3 cursor-pointer transition-all"
                  style={{ background: form.urgency === opt.value ? `${opt.color}10` : 'rgba(14,59,40,0.02)', border: form.urgency === opt.value ? `1px solid ${opt.color}40` : '1px solid rgba(14,59,40,0.08)' }}>
                  <input type="radio" name="urgency" value={opt.value} checked={form.urgency === opt.value} onChange={() => setForm({...form, urgency: opt.value})} style={{ accentColor: opt.color }} />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: opt.color }}>{opt.label}</div>
                    <div className="text-xs" style={{ color: 'rgba(14,59,40,0.45)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <label className={labelStyle} style={{ color: 'rgba(14,59,40,0.5)' }}>
                <Clock size={11} className="inline mr-1" />{nl ? 'Biedingstermijn (optioneel)' : 'Bid deadline (optional)'}
              </label>
              <input type="date" value={form.bid_deadline} onChange={e => setForm({...form, bid_deadline: e.target.value})} className="w-full px-4 py-3 text-sm outline-none" style={inputStyle} />
              <p className="text-xs mt-1.5" style={{ color: 'rgba(14,59,40,0.4)' }}>
                {nl ? 'Na deze datum kunnen er geen biedingen meer worden geplaatst.' : 'After this date no more bids can be placed.'}
              </p>
            </div>
          </div>

          {error && <div className="p-4 mb-4 text-sm" style={{ background: 'rgba(184,64,51,0.08)', border: '1px solid rgba(184,64,51,0.3)', color: '#b84033' }}>{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 text-base font-bold transition-opacity disabled:opacity-50 mb-4" style={{ background: '#0e3b28', color: '#2fc586' }}>
            {loading ? (nl ? 'Bezig met aanmelden...' : 'Submitting...') : (nl ? 'Woning aanmelden →' : 'Submit property →')}
          </button>

          <div className="p-5 text-center" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#0e3b28' }}>
              {nl ? `Hulp nodig? Neem contact op met ${AGENCY.name}` : `Need help? Contact ${AGENCY.name}`}
            </p>
            <div className="flex justify-center gap-4">
              <a href={"tel:" + AGENCY.phone.replace(/\s/g, '')} className="flex items-center gap-2 px-4 py-2 text-sm" style={{ background: '#0e3b28', color: '#2fc586' }}>
                <Phone size={13} />{AGENCY.phone}
              </a>
              <a href={"mailto:" + AGENCY.email} className="flex items-center gap-2 px-4 py-2 text-sm" style={{ background: 'rgba(14,59,40,0.05)', border: '1px solid rgba(14,59,40,0.15)', color: '#0e3b28' }}>
                <Mail size={13} />{AGENCY.email}
              </a>
            </div>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(14,59,40,0.35)' }}>
            {nl ? 'Na aanmelding beoordeelt de makelaar uw woning binnen 24 uur.' : 'After submission the agent will review your property within 24 hours.'}
          </p>
        </form>
      </div>
    </div>
  )
}