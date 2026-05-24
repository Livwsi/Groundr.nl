'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, MapPin, Home, ArrowLeft } from 'lucide-react'
import InviteModal from '@/components/invite/InviteModal'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

interface Listing {
  id: number; asking_price: number; status: string; listed_date: string
  property: { street: string; house_number: string; city: string; area_m2: number | null; energy_label: string }
}
interface NewListingForm {
  address: string; asking_price: string; area_m2: string; bedrooms: string
  property_type: string; energy_label: string; is_rental: boolean
}
const EMPTY_FORM: NewListingForm = { address: '', asking_price: '', area_m2: '', bedrooms: '', property_type: 'house', energy_label: 'unknown', is_rental: false }

function formatPrice(price: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)
}

export default function ListingsPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const nl = lang === 'nl'

  const [listings,   setListings]   = useState<Listing[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [form,       setForm]       = useState<NewListingForm>(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  useEffect(() => { loadListings() }, [])

  async function loadListings() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch('http://localhost:8000/api/listings/', { headers: { Authorization: `Bearer ${token}` } })
      const data  = await res.json()
      setListings(data.listings || [])
    } catch { setError(t('common.error')) }
    finally { setLoading(false) }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch('http://localhost:8000/api/listings/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          address: form.address, asking_price: parseFloat(form.asking_price),
          area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
          property_type: form.property_type, energy_label: form.energy_label, is_rental: form.is_rental,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || t('common.error')); return }
      setSuccess(`${nl ? 'Listing aangemaakt' : 'Listing created'}: ${data.property.street} ${data.property.house_number}`)
      setForm(EMPTY_FORM); setShowForm(false); loadListings()
    } catch { setError(t('common.error')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm(nl ? 'Weet u zeker dat u deze listing wilt verwijderen?' : 'Are you sure you want to delete this listing?')) return
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:8000/api/listings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      loadListings()
    } catch { setError(t('common.error')) }
  }

  const PROP_TYPES = [
    { value: 'house',        label: t('type.house') },
    { value: 'apartment',    label: t('type.apartment') },
    { value: 'villa',        label: t('type.villa') },
    { value: 'townhouse',    label: t('type.townhouse') },
    { value: 'semi_detached',label: t('type.semi_detached') },
    { value: 'detached',     label: t('type.detached') },
    { value: 'studio',       label: t('type.studio') },
  ]

  return (
    <div className="min-h-screen bg-g900">
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-g300 opacity-50 hover:opacity-100 transition-opacity"><ArrowLeft size={16} /></button>
          <span className="font-display font-bold text-lg text-white tracking-tight">Groun<span className="text-g400">dr</span></span>
          <span className="text-g300 opacity-30 text-sm">/ {t('listings.title')}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 transition-opacity"
            style={{ background: 'rgba(47,197,134,0.1)', color: '#2fc586', border: '1px solid rgba(47,197,134,0.25)' }}>
            {t('nav.invite')}
          </button>
          <LanguageToggle />
          <button onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
            className="flex items-center gap-2 bg-g400 text-g900 font-bold px-4 py-2 text-sm hover:bg-g300 transition-colors">
            <Plus size={14} />{t('listings.add')}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {showForm && (
          <div className="bg-g800 border border-g700 p-6 mb-8">
            <h2 className="font-display font-bold text-white mb-4">{nl ? 'Nieuwe listing toevoegen' : 'Add new listing'}</h2>
            {error && <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-4">{error}</div>}
            <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">{t('listings.address')} *</label>
                <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                  placeholder="Stratumsedijk 23 Eindhoven" required
                  className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">{t('listings.price')} *</label>
                <input type="number" value={form.asking_price} onChange={e => setForm({...form, asking_price: e.target.value})}
                  placeholder="485000" required
                  className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">{t('listings.area')}</label>
                <input type="number" value={form.area_m2} onChange={e => setForm({...form, area_m2: e.target.value})} placeholder="142"
                  className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">{t('listings.bedrooms')}</label>
                <input type="number" value={form.bedrooms} onChange={e => setForm({...form, bedrooms: e.target.value})} placeholder="4"
                  className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">{t('listings.type')}</label>
                <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})}
                  className="w-full bg-g900 border border-g700 text-white px-4 py-3 text-sm outline-none focus:border-g400 transition-colors">
                  {PROP_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">{t('listings.energy')}</label>
                <select value={form.energy_label} onChange={e => setForm({...form, energy_label: e.target.value})}
                  className="w-full bg-g900 border border-g700 text-white px-4 py-3 text-sm outline-none focus:border-g400 transition-colors">
                  <option value="unknown">{t('type.unknown')}</option>
                  {['A','A+','A++','B','C','D','E','F','G'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="is_rental" checked={form.is_rental} onChange={e => setForm({...form, is_rental: e.target.checked})} className="w-4 h-4 accent-g400" />
                <label htmlFor="is_rental" className="text-sm text-g300 opacity-70 cursor-pointer">{t('listings.rental')}</label>
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="bg-g400 text-g900 font-bold px-6 py-2.5 text-sm hover:bg-g300 transition-colors disabled:opacity-50">
                  {saving ? t('common.loading') : t('listings.save')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError('') }}
                  className="bg-g700 text-g300 font-semibold px-6 py-2.5 text-sm">{t('listings.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {success && <div className="bg-g400/10 border border-g400/30 text-g400 text-sm px-4 py-3 mb-6">{success}</div>}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">{t('listings.title')}</h1>
            <p className="text-sm text-g300 opacity-50 mt-1">{listings.length} {t('listings.subtitle')}</p>
          </div>
        </div>

        {loading && <div className="text-center py-16 text-g300 opacity-40 text-sm">{t('common.loading')}</div>}

        {!loading && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-g800 border border-g700 flex items-center justify-center mb-4"><Home size={24} className="text-g400" /></div>
            <p className="text-white font-display font-bold mb-1">{t('listings.empty')}</p>
            <p className="text-g300 opacity-40 text-sm mb-4">{t('listings.empty_sub')}</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="flex flex-col gap-3">
            {listings.map(listing => (
              <div key={listing.id} className="bg-g800 border border-g700 p-5 flex items-center justify-between hover:border-g500 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-g700 flex items-center justify-center flex-shrink-0"><Home size={18} className="text-g400" /></div>
                  <div>
                    <div className="font-display font-bold text-white">{listing.property.street} {listing.property.house_number}</div>
                    <div className="flex items-center gap-1 text-xs text-g300 opacity-50 mt-0.5">
                      <MapPin size={10} />{listing.property.city}
                      {listing.property.area_m2 && <span className="ml-2">{listing.property.area_m2} m²</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-mono font-semibold text-white">{formatPrice(listing.asking_price)}</div>
                    <div className="text-xs mt-0.5" style={{ color: listing.status === 'active' ? '#2fc586' : 'rgba(255,255,255,0.4)' }}>
                      {listing.status === 'active' ? t('listings.active') : listing.status}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(listing.id)} className="text-g300 opacity-30 hover:opacity-100 hover:text-red-400 transition-all" title={t('common.delete')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}