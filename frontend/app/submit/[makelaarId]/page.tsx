'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Home, MapPin, Euro, Clock, AlertTriangle, CheckCircle, Camera, Phone, Mail } from 'lucide-react'

const AGENCY = {
  name:  'Stadsmakelaars',
  phone: '085 080 55 98',
  email: 'info@stadsmakelaars.nl',
}

export default function SubmitListingPage() {
  const params     = useParams()
  const router     = useRouter()
  const makelaarId = params.makelaarId as string

  const [step,    setStep]    = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [photos,  setPhotos]  = useState<string[]>([])   // base64 previews

  const [form, setForm] = useState({
    address:       '',
    area_m2:       '',
    property_type: 'house',
    energy_label:  'unknown',
    price_mode:    'open',       // 'open' | 'fixed' | 'bid'
    asking_price:  '',
    urgency:       'normal',
    bid_deadline:  '',
    description:   '',
  })

  // ── Auth check — redirect if not logged in ────────────
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dossier_token')
    if (!token) {
      // Save intended destination and redirect to register
      sessionStorage.setItem('after_login', `/submit/${makelaarId}`)
      router.push('/register')
      return
    }
    setIsLoggedIn(true)
  }, [])

  // Don't render form until auth check complete
  if (isLoggedIn === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0faf5' }}>
      <div className="text-sm" style={{ color: 'rgba(14,59,40,0.4)' }}>Laden...</div>
    </div>
  )

  // ── Photo upload handler ──────────────────────────────
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    files.slice(0, 8 - photos.length).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setPhotos(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // ── Form submit ───────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const token = localStorage.getItem('token') || localStorage.getItem('dossier_token')

    try {
      const res = await fetch('http://localhost:8000/api/submissions/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          makelaar_id:  parseInt(makelaarId),
          address:      form.address,
          area_m2:      form.area_m2 ? parseFloat(form.area_m2) : null,
          property_type:form.property_type,
          energy_label: form.energy_label,
          asking_price: form.price_mode !== 'open' && form.asking_price ? parseFloat(form.asking_price) : null,
          show_price:   form.price_mode !== 'open',
          urgency:      form.urgency,
          bid_deadline: form.bid_deadline || null,
          description:  form.description || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Er is iets misgegaan.'); return }
      setStep('success')

    } catch {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

  const URGENCY_OPTIONS = [
    { value: 'normal', label: 'Normaal',   desc: 'Geen tijdsdruk',              color: '#2fc586' },
    { value: 'urgent', label: 'Urgent',    desc: 'Zo snel mogelijk verkopen',   color: '#c47c1a' },
    { value: 'asap',   label: 'Moet weg',  desc: 'Direct verkopen, elke prijs', color: '#b84033' },
  ]

  const PRICE_MODES = [
    { value: 'open',  label: 'Open bieding',         desc: 'Geen vraagprijs — laat bieders beslissen' },
    { value: 'fixed', label: 'Vraagprijs',            desc: 'Vaste prijs, geen biedingen' },
    { value: 'bid',   label: 'Vraagprijs + bieden',   desc: 'Prijs zichtbaar, biedingen toegestaan' },
  ]

  // ── Success screen ────────────────────────────────────
  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f0faf5' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6" style={{ background: '#0e3b28' }}>
          <CheckCircle size={40} color="#2fc586" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-3" style={{ color: '#0e3b28' }}>
          Aanmelding ingediend!
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(14,59,40,0.6)' }}>
          {AGENCY.name} beoordeelt uw woning binnen 24 uur.
          U ontvangt een bevestiging zodra uw woning live staat.
        </p>
        <button
          onClick={() => router.push('/microsite/stadsmakelaars')}
          className="text-sm font-semibold px-6 py-3"
          style={{ background: '#0e3b28', color: '#2fc586' }}
        >
          Terug naar woningen
        </button>
      </div>
    </div>
  )

  // ── Form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-12" style={{ background: '#f0faf5' }}>
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: 'radial-gradient(rgba(14,59,40,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4" style={{ background: '#0e3b28' }}>
            <Home size={22} color="#2fc586" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2" style={{ color: '#0e3b28' }}>
            Woning aanmelden
          </h1>
          <p className="text-sm" style={{ color: 'rgba(14,59,40,0.5)' }}>
            Meld uw woning aan bij {AGENCY.name}. Na goedkeuring staat uw woning live.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Section 1: Photos */}
          <div className="p-6 mb-4" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
            <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0e3b28' }}>
              <Camera size={16} color="#2fc586" />
              Foto's
            </h2>

            {/* Photo grid */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(184,64,51,0.9)', color: 'white' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <label
                  className="aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors"
                  style={{
                    border:     '2px dashed rgba(14,59,40,0.15)',
                    background: 'rgba(14,59,40,0.02)',
                    color:      'rgba(14,59,40,0.3)',
                  }}
                >
                  <Camera size={20} />
                  <span className="text-xs mt-1">Toevoegen</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>
            <p className="text-xs" style={{ color: 'rgba(14,59,40,0.35)' }}>
              Voeg tot 8 foto's toe. Meer foto's = meer interesse van kopers.
            </p>
          </div>

          {/* Section 2: Property details */}
          <div className="p-6 mb-4" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
            <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0e3b28' }}>
              <MapPin size={16} color="#2fc586" />
              Woning gegevens
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.5)' }}>
                  Volledig adres *
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})}
                  placeholder="Stratumsedijk 23 Eindhoven"
                  required
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: '#f7faf8', border: '1px solid rgba(14,59,40,0.12)', color: '#0e3b28' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.5)' }}>
                    Woonoppervlak (m²)
                  </label>
                  <input
                    type="number"
                    value={form.area_m2}
                    onChange={e => setForm({...form, area_m2: e.target.value})}
                    placeholder="120"
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={{ background: '#f7faf8', border: '1px solid rgba(14,59,40,0.12)', color: '#0e3b28' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.5)' }}>
                    Type woning
                  </label>
                  <select
                    value={form.property_type}
                    onChange={e => setForm({...form, property_type: e.target.value})}
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={{ background: '#f7faf8', border: '1px solid rgba(14,59,40,0.12)', color: '#0e3b28' }}
                  >
                    <option value="house">Woning</option>
                    <option value="apartment">Appartement</option>
                    <option value="villa">Villa</option>
                    <option value="townhouse">Tussenwoning</option>
                    <option value="semi_detached">2-onder-1-kap</option>
                    <option value="detached">Vrijstaand</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.5)' }}>
                  Energielabel
                </label>
                <select
                  value={form.energy_label}
                  onChange={e => setForm({...form, energy_label: e.target.value})}
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: '#f7faf8', border: '1px solid rgba(14,59,40,0.12)', color: '#0e3b28' }}
                >
                  <option value="unknown">Onbekend</option>
                  <option value="A">A</option>
                  <option value="A+">A+</option>
                  <option value="A++">A++</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="G">G</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.5)' }}>
                  Omschrijving (optioneel)
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Vertel iets over uw woning, renovaties, bijzonderheden..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm outline-none resize-none"
                  style={{ background: '#f7faf8', border: '1px solid rgba(14,59,40,0.12)', color: '#0e3b28' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing mode */}
          <div className="p-6 mb-4" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
            <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0e3b28' }}>
              <Euro size={16} color="#2fc586" />
              Prijsstrategie
            </h2>
            <div className="flex flex-col gap-2 mb-4">
              {PRICE_MODES.map(mode => (
                <label
                  key={mode.value}
                  className="flex items-start gap-3 p-3 cursor-pointer transition-all"
                  style={{
                    background: form.price_mode === mode.value ? 'rgba(47,197,134,0.06)' : 'rgba(14,59,40,0.02)',
                    border:     form.price_mode === mode.value ? '1px solid rgba(47,197,134,0.3)' : '1px solid rgba(14,59,40,0.08)',
                  }}
                >
                  <input
                    type="radio"
                    name="price_mode"
                    value={mode.value}
                    checked={form.price_mode === mode.value}
                    onChange={() => setForm({...form, price_mode: mode.value})}
                    className="mt-0.5"
                    style={{ accentColor: '#2fc586' }}
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#0e3b28' }}>{mode.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(14,59,40,0.45)' }}>{mode.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Price input — shown for fixed and bid modes */}
            {form.price_mode !== 'open' && (
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.5)' }}>
                  Vraagprijs (€) *
                </label>
                <input
                  type="number"
                  value={form.asking_price}
                  onChange={e => setForm({...form, asking_price: e.target.value})}
                  placeholder="450000"
                  required={form.price_mode !== 'open'}
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: '#f7faf8', border: '1px solid rgba(14,59,40,0.12)', color: '#0e3b28' }}
                />
                <p className="text-xs mt-1.5" style={{ color: 'rgba(14,59,40,0.4)' }}>
                  Groundr toont automatisch een schatting als referentie voor kopers.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Urgency */}
          <div className="p-6 mb-4" style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
            <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0e3b28' }}>
              <AlertTriangle size={16} color="#2fc586" />
              Urgentie en deadline
            </h2>
            <div className="flex flex-col gap-2 mb-4">
              {URGENCY_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 p-3 cursor-pointer transition-all"
                  style={{
                    background: form.urgency === opt.value ? `${opt.color}10` : 'rgba(14,59,40,0.02)',
                    border:     form.urgency === opt.value ? `1px solid ${opt.color}40` : '1px solid rgba(14,59,40,0.08)',
                  }}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={opt.value}
                    checked={form.urgency === opt.value}
                    onChange={() => setForm({...form, urgency: opt.value})}
                    style={{ accentColor: opt.color }}
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: opt.color }}>{opt.label}</div>
                    <div className="text-xs" style={{ color: 'rgba(14,59,40,0.45)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(14,59,40,0.5)' }}>
                <Clock size={11} className="inline mr-1" />
                Biedingstermijn (optioneel)
              </label>
              <input
                type="date"
                value={form.bid_deadline}
                onChange={e => setForm({...form, bid_deadline: e.target.value})}
                className="w-full px-4 py-3 text-sm outline-none"
                style={{ background: '#f7faf8', border: '1px solid rgba(14,59,40,0.12)', color: '#0e3b28' }}
              />
              <p className="text-xs mt-1.5" style={{ color: 'rgba(14,59,40,0.4)' }}>
                Na deze datum kunnen er geen biedingen meer worden geplaatst.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 mb-4 text-sm"
              style={{ background: 'rgba(184,64,51,0.08)', border: '1px solid rgba(184,64,51,0.3)', color: '#b84033' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-base font-bold transition-opacity disabled:opacity-50 mb-4"
            style={{ background: '#0e3b28', color: '#2fc586' }}
          >
            {loading ? 'Bezig met aanmelden...' : 'Woning aanmelden →'}
          </button>

          {/* Contact makelaar */}
          <div
            className="p-5 text-center"
            style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)' }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: '#0e3b28' }}>
              Hulp nodig? Neem contact op met {AGENCY.name}
            </p>
            <div className="flex justify-center gap-4">
              <a
                href={"tel:" + AGENCY.phone.replace(/\s/g, '')}
                className="flex items-center gap-2 px-4 py-2 text-sm"
                style={{ background: '#0e3b28', color: '#2fc586' }}
              >
                <Phone size={13} />
                {AGENCY.phone}
              </a>
              <a
                href={"mailto:" + AGENCY.email}
                className="flex items-center gap-2 px-4 py-2 text-sm"
                style={{ background: 'rgba(14,59,40,0.05)', border: '1px solid rgba(14,59,40,0.15)', color: '#0e3b28' }}
              >
                <Mail size={13} />
                {AGENCY.email}
              </a>
            </div>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(14,59,40,0.35)' }}>
            Na aanmelding beoordeelt de makelaar uw woning binnen 24 uur.
          </p>
        </form>
      </div>
    </div>
  )
}