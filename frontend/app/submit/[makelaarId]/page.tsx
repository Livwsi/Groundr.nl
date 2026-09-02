'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Home, MapPin, Euro, Clock, AlertTriangle, CheckCircle, Camera, Phone, Mail, X } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', amberLt: '#FFFBEB',
  red: '#DC2626', redLt: '#FEF2F2',
  shadow: '0 1px 3px rgba(11,19,32,0.06)', shadowMd: '0 2px 12px rgba(11,19,32,0.08)',
}

const AGENCY = { name: 'Stadsmakelaars', phone: '085 080 55 98', email: 'info@stadsmakelaars.nl' }

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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, marginBottom: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(180deg, ${S.surface}, ${S.surface2})` }}>
        <span style={{ color: S.green }}>{icon}</span>
        <span style={{ fontSize: '13.5px', fontWeight: 600, color: S.t1 }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

export default function SubmitListingPage() {
  const params     = useParams()
  const router     = useRouter()
  const makelaarId = params.makelaarId as string
  const { lang }   = useLanguage()
  const nl         = lang === 'nl'

  const [step,       setStep]       = useState<'form' | 'success'>('form')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [photos,     setPhotos]     = useState<string[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  const [form, setForm] = useState({
    address: '', area_m2: '', property_type: 'house', energy_label: 'unknown',
    price_mode: 'open', asking_price: '', urgency: 'normal', bid_deadline: '', description: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('groundr_token') || localStorage.getItem('dossier_token')
    if (!token) { sessionStorage.setItem('after_login', `/submit/${makelaarId}`); router.push('/register'); return }
    setIsLoggedIn(true)
  }, [])

  if (isLoggedIn === null) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.bg }}>
      <span style={{ fontSize: '13px', color: S.t3 }}>{nl ? 'Laden...' : 'Loading...'}</span>
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
    e.preventDefault(); setLoading(true); setError('')
    const token = localStorage.getItem('groundr_token') || localStorage.getItem('dossier_token')
    try {
      const res  = await fetch(API_BASE+'/api/submissions/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          makelaar_id:   parseInt(makelaarId), address: form.address,
          area_m2:       form.area_m2 ? parseFloat(form.area_m2) : null,
          property_type: form.property_type, energy_label: form.energy_label,
          asking_price:  form.price_mode !== 'open' && form.asking_price ? parseFloat(form.asking_price) : null,
          show_price:    form.price_mode !== 'open', urgency: form.urgency,
          bid_deadline:  form.bid_deadline || null, description: form.description || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || (nl ? 'Er is iets misgegaan.' : 'Something went wrong.')); return }
      setStep('success')
    } catch { setError(nl ? 'Kan geen verbinding maken met de server.' : 'Cannot connect to server.') }
    finally { setLoading(false) }
  }

  const URGENCY_OPTIONS = [
    { value: 'normal', label: nl ? 'Normaal'  : 'Normal', desc: nl ? 'Geen tijdsdruk'              : 'No time pressure',       color: S.green,  bg: S.greenLt,  rim: S.greenRim },
    { value: 'urgent', label: 'Urgent',                   desc: nl ? 'Zo snel mogelijk verkopen'   : 'Sell as soon as possible', color: S.amber,  bg: S.amberLt,  rim: 'rgba(217,119,6,0.25)' },
    { value: 'asap',   label: nl ? 'Moet weg' : 'ASAP',  desc: nl ? 'Direct verkopen, elke prijs' : 'Sell immediately',         color: S.red,    bg: S.redLt,    rim: 'rgba(220,38,38,0.25)' },
  ]

  const PRICE_MODES = [
    { value: 'open',  label: nl ? 'Open bieding'        : 'Open bid',        desc: nl ? 'Geen vraagprijs — laat bieders beslissen' : 'No asking price — let bidders decide' },
    { value: 'fixed', label: nl ? 'Vraagprijs'          : 'Asking price',    desc: nl ? 'Vaste prijs, geen biedingen'              : 'Fixed price, no bidding' },
    { value: 'bid',   label: nl ? 'Vraagprijs + bieden' : 'Price + bidding', desc: nl ? 'Prijs zichtbaar, biedingen toegestaan'    : 'Price shown, bidding allowed' },
  ]

  const PROP_TYPES = [
    { value: 'house',         label: nl ? 'Woning'        : 'House' },
    { value: 'apartment',     label: nl ? 'Appartement'   : 'Apartment' },
    { value: 'villa',         label: 'Villa' },
    { value: 'townhouse',     label: nl ? 'Tussenwoning'  : 'Townhouse' },
    { value: 'semi_detached', label: nl ? '2-onder-1-kap' : 'Semi-detached' },
    { value: 'detached',      label: nl ? 'Vrijstaand'    : 'Detached' },
  ]

  // ── Success ────────────────────────────────────────────
  if (step === 'success') return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ width: '64px', height: '64px', background: S.greenLt, border: `1px solid ${S.greenRim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: S.shadowMd }}>
          <CheckCircle size={32} color={S.green} />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: S.t1, marginBottom: '8px' }}>
          {nl ? 'Aanmelding ingediend!' : 'Application submitted!'}
        </h1>
        <p style={{ fontSize: '13.5px', color: S.t2, marginBottom: '24px', lineHeight: 1.6 }}>
          {nl ? `${AGENCY.name} beoordeelt uw woning binnen 24 uur. U ontvangt een bevestiging zodra uw woning live staat.` : `${AGENCY.name} will review your property within 24 hours. You will receive a confirmation once it goes live.`}
        </p>
        <button onClick={() => router.push('/microsite/stadsmakelaars')} style={{
          height: '40px', padding: '0 20px', background: S.green, color: 'white',
          border: `1px solid ${S.green}`, fontFamily: 'inherit', fontSize: '14px',
          fontWeight: 500, cursor: 'pointer',
        }}>
          {nl ? 'Terug naar woningen' : 'Back to listings'}
        </button>
      </div>
    </div>
  )

  // ── Form ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif",
      backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(5,150,105,0.05) 0%, transparent 60%), linear-gradient(rgba(5,150,105,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,0.02) 1px, transparent 1px)',
      backgroundSize: '100% 100%, 48px 48px, 48px 48px',
    }}>

      {/* Top bar */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: S.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '22px', height: '22px', background: S.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: S.t1 }}>Groundr</span>
          <span style={{ color: S.border, margin: '0 4px' }}>·</span>
          <span style={{ fontSize: '13px', color: S.t2 }}>{AGENCY.name}</span>
        </div>
        <LanguageToggle />
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: S.greenLt, border: `1px solid ${S.greenRim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Home size={22} color={S.green} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: S.t1, marginBottom: '6px' }}>
            {nl ? 'Woning aanmelden' : 'Submit property'}
          </h1>
          <p style={{ fontSize: '13px', color: S.t3 }}>
            {nl ? `Meld uw woning aan bij ${AGENCY.name}. Na goedkeuring staat uw woning live.` : `Submit your property to ${AGENCY.name}. After approval it goes live.`}
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Photos */}
          <Section icon={<Camera size={14} />} title={nl ? "Foto's" : 'Photos'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
              {photos.map((photo, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1' }}>
                  <img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', background: S.red, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <label style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1.5px dashed ${S.border}`, background: S.surface2, color: S.t3, gap: '4px' }}>
                  <Camera size={18} />
                  <span style={{ fontSize: '11px' }}>{nl ? 'Toevoegen' : 'Add'}</span>
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
            <p style={{ fontSize: '12px', color: S.t3 }}>{nl ? "Voeg tot 8 foto's toe. Meer foto's = meer interesse van kopers." : 'Add up to 8 photos. More photos = more buyer interest.'}</p>
          </Section>

          {/* Property details */}
          <Section icon={<MapPin size={14} />} title={nl ? 'Woning gegevens' : 'Property details'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>{nl ? 'Volledig adres' : 'Full address'} *</label>
                <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Stratumsedijk 23 Eindhoven" required style={inp}
                  onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>{nl ? 'Woonoppervlak (m²)' : 'Living area (m²)'}</label>
                  <input type="number" value={form.area_m2} onChange={e => setForm({...form, area_m2: e.target.value})} placeholder="120" style={inp}
                    onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
                </div>
                <div>
                  <label style={lbl}>{nl ? 'Type woning' : 'Property type'}</label>
                  <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})} style={inp}>
                    {PROP_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>{nl ? 'Energielabel' : 'Energy label'}</label>
                <select value={form.energy_label} onChange={e => setForm({...form, energy_label: e.target.value})} style={{...inp, width: '50%'}}>
                  <option value="unknown">{nl ? 'Onbekend' : 'Unknown'}</option>
                  {['A','A+','A++','B','C','D','E','F','G'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{nl ? 'Omschrijving (optioneel)' : 'Description (optional)'}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder={nl ? 'Vertel iets over uw woning, renovaties, bijzonderheden...' : 'Tell us about your property, renovations, special features...'}
                  rows={3} style={{...inp, resize: 'none'}}
                  onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
              </div>
            </div>
          </Section>

          {/* Pricing */}
          <Section icon={<Euro size={14} />} title={nl ? 'Prijsstrategie' : 'Pricing strategy'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {PRICE_MODES.map(mode => (
                <label key={mode.value} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', cursor: 'pointer',
                  background: form.price_mode === mode.value ? S.greenLt : S.surface2,
                  border: `1px solid ${form.price_mode === mode.value ? S.greenRim : S.border}`,
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="price_mode" value={mode.value} checked={form.price_mode === mode.value} onChange={() => setForm({...form, price_mode: mode.value})} style={{ marginTop: '2px', accentColor: S.green }} />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1 }}>{mode.label}</div>
                    <div style={{ fontSize: '12px', color: S.t3, marginTop: '2px' }}>{mode.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {form.price_mode !== 'open' && (
              <div>
                <label style={lbl}>{nl ? 'Vraagprijs (€)' : 'Asking price (€)'} *</label>
                <input type="number" value={form.asking_price} onChange={e => setForm({...form, asking_price: e.target.value})} placeholder="450000" required={form.price_mode !== 'open'} style={inp}
                  onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
              </div>
            )}
          </Section>

          {/* Urgency */}
          <Section icon={<AlertTriangle size={14} />} title={nl ? 'Urgentie en deadline' : 'Urgency and deadline'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {URGENCY_OPTIONS.map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', cursor: 'pointer',
                  background: form.urgency === opt.value ? opt.bg : S.surface2,
                  border: `1px solid ${form.urgency === opt.value ? opt.rim : S.border}`,
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="urgency" value={opt.value} checked={form.urgency === opt.value} onChange={() => setForm({...form, urgency: opt.value})} style={{ accentColor: opt.color }} />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: opt.color }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', color: S.t3, marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <label style={lbl}>
                <Clock size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                {nl ? 'Biedingstermijn (optioneel)' : 'Bid deadline (optional)'}
              </label>
              <input type="date" value={form.bid_deadline} onChange={e => setForm({...form, bid_deadline: e.target.value})} style={{...inp, width: '50%'}}
                onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
              <p style={{ fontSize: '12px', color: S.t3, marginTop: '6px' }}>
                {nl ? 'Na deze datum kunnen er geen biedingen meer worden geplaatst.' : 'After this date no more bids can be placed.'}
              </p>
            </div>
          </Section>

          {error && (
            <div style={{ background: S.redLt, border: `1px solid rgba(220,38,38,0.2)`, color: S.red, fontSize: '13px', padding: '10px 14px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: '100%', height: '46px', background: loading ? '#6EE7B7' : S.green,
            color: 'white', border: `1px solid ${S.green}`, fontFamily: 'inherit',
            fontSize: '15px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '12px', boxShadow: loading ? 'none' : '0 2px 8px rgba(5,150,105,0.25)',
            transition: 'all 0.15s',
          }}>
            {loading ? (nl ? 'Bezig met aanmelden...' : 'Submitting...') : (nl ? 'Woning aanmelden →' : 'Submit property →')}
          </button>

          {/* Contact */}
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, padding: '20px', textAlign: 'center', boxShadow: S.shadow }}>
            <p style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1, marginBottom: '12px' }}>
              {nl ? `Hulp nodig? Neem contact op met ${AGENCY.name}` : `Need help? Contact ${AGENCY.name}`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <a href={`tel:${AGENCY.phone.replace(/\s/g,'')}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 14px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13px', textDecoration: 'none' }}>
                <Phone size={13} />{AGENCY.phone}
              </a>
              <a href={`mailto:${AGENCY.email}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 14px', background: S.surface, color: S.t1, border: `1px solid ${S.border}`, fontSize: '13px', textDecoration: 'none' }}>
                <Mail size={13} />{AGENCY.email}
              </a>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: S.t3, marginTop: '16px' }}>
            {nl ? 'Na aanmelding beoordeelt de makelaar uw woning binnen 24 uur.' : 'After submission the agent will review your property within 24 hours.'}
          </p>
        </form>
      </div>
    </div>
  )
}