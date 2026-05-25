'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, MapPin, Home, ArrowLeft } from 'lucide-react'
import InviteModal from '@/components/invite/InviteModal'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  red: '#DC2626', redLt: '#FEF2F2', amber: '#D97706',
  shadow: '0 1px 3px rgba(11,19,32,0.06)',
}

interface Listing {
  id: number; asking_price: number; status: string; listed_date: string
  property: { street: string; house_number: string; city: string; area_m2: number | null; energy_label: string }
}

const EMPTY = { address: '', asking_price: '', area_m2: '', bedrooms: '', property_type: 'house', energy_label: 'unknown', is_rental: false }

function formatPrice(p: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p) }

const inp = { width: '100%', height: '40px', padding: '0 12px', background: S.surface, border: `1px solid ${S.border}`, fontFamily: 'inherit', fontSize: '13.5px', color: S.t1, outline: 'none' }
const lbl = { display: 'block', fontSize: '11px', fontWeight: 500 as const, color: S.t3, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '5px' }

export default function ListingsPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const nl = lang === 'nl'

  const [listings,   setListings]   = useState<Listing[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [form,       setForm]       = useState(EMPTY)
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
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch('http://localhost:8000/api/listings/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: form.address, asking_price: parseFloat(form.asking_price), area_m2: form.area_m2 ? parseFloat(form.area_m2) : null, bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null, property_type: form.property_type, energy_label: form.energy_label, is_rental: form.is_rental }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || t('common.error')); return }
      setSuccess(`${nl ? 'Listing aangemaakt' : 'Listing created'}: ${data.property.street} ${data.property.house_number}`)
      setForm(EMPTY); setShowForm(false); loadListings()
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

  const PROP_TYPES = [['house', nl?'Woning':'House'],['apartment',nl?'Appartement':'Apartment'],['villa','Villa'],['townhouse',nl?'Tussenwoning':'Townhouse'],['semi_detached',nl?'2-onder-1-kap':'Semi-detached'],['detached',nl?'Vrijstaand':'Detached'],['studio','Studio']]

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: S.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, display: 'flex', alignItems: 'center' }}><ArrowLeft size={16} /></button>
          <img src="/logo.svg" alt="Groundr" style={{ height: '32px' }} />
          <span style={{ color: S.border }}>·</span>
          <span style={{ fontSize: '13.5px', color: S.t2 }}>{t('listings.title')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px', background: S.greenLt, color: S.greenTx, border: `1px solid ${S.greenRim}`, fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
            + {nl ? 'Klant uitnodigen' : 'Invite client'}
          </button>
          <LanguageToggle />
          <button onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 14px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={13} />{t('listings.add')}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>

        {showForm && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: S.t1, marginBottom: '20px' }}>{nl ? 'Nieuwe listing toevoegen' : 'Add new listing'}</div>
            {error && <div style={{ background: S.redLt, border: `1px solid rgba(220,38,38,0.2)`, color: S.red, fontSize: '13px', padding: '10px 14px', marginBottom: '16px' }}>{error}</div>}
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>{t('listings.address')} *</label>
                  <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Stratumsedijk 23 Eindhoven" required style={inp} />
                </div>
                <div><label style={lbl}>{t('listings.price')} *</label><input type="number" value={form.asking_price} onChange={e => setForm({...form, asking_price: e.target.value})} placeholder="485000" required style={inp} /></div>
                <div><label style={lbl}>{t('listings.area')}</label><input type="number" value={form.area_m2} onChange={e => setForm({...form, area_m2: e.target.value})} placeholder="142" style={inp} /></div>
                <div><label style={lbl}>{t('listings.bedrooms')}</label><input type="number" value={form.bedrooms} onChange={e => setForm({...form, bedrooms: e.target.value})} placeholder="4" style={inp} /></div>
                <div>
                  <label style={lbl}>{t('listings.type')}</label>
                  <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})} style={inp}>
                    {PROP_TYPES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>{t('listings.energy')}</label>
                  <select value={form.energy_label} onChange={e => setForm({...form, energy_label: e.target.value})} style={{...inp, width: '50%'}}>
                    <option value="unknown">{nl ? 'Onbekend' : 'Unknown'}</option>
                    {['A','A+','A++','B','C','D','E','F','G'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="is_rental" checked={form.is_rental} onChange={e => setForm({...form, is_rental: e.target.checked})} />
                  <label htmlFor="is_rental" style={{ fontSize: '13.5px', color: S.t2, cursor: 'pointer' }}>{t('listings.rental')}</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={saving} style={{ height: '36px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? t('common.loading') : t('listings.save')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); setError('') }} style={{ height: '36px', padding: '0 14px', background: S.surface, color: S.t2, border: `1px solid ${S.border}`, fontSize: '13px', cursor: 'pointer' }}>
                  {t('listings.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {success && <div style={{ background: S.greenLt, border: `1px solid ${S.greenRim}`, color: S.greenTx, fontSize: '13px', padding: '10px 14px', marginBottom: '20px' }}>{success}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: S.t1, letterSpacing: '-0.3px' }}>{t('listings.title')}</h1>
            <p style={{ fontSize: '13px', color: S.t3, marginTop: '3px' }}>{listings.length} {t('listings.subtitle')}</p>
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '48px', color: S.t3, fontSize: '13px' }}>{t('common.loading')}</div>}

        {!loading && listings.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', background: S.surface, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: S.shadow }}><Home size={22} color={S.green} /></div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: S.t1, marginBottom: '4px' }}>{t('listings.empty')}</p>
            <p style={{ fontSize: '13px', color: S.t3 }}>{t('listings.empty_sub')}</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden' }}>
            {listings.map((listing, i) => (
              <div key={listing.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < listings.length - 1 ? `1px solid ${S.border}` : 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = S.surface2)}
                onMouseLeave={e => (e.currentTarget.style.background = S.surface)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', background: S.greenLt, border: `1px solid ${S.greenRim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Home size={16} color={S.green} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: S.t1 }}>{listing.property.street} {listing.property.house_number}</div>
                    <div style={{ fontSize: '12px', color: S.t3, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                      <MapPin size={10} />{listing.property.city}{listing.property.area_m2 && ` · ${listing.property.area_m2} m²`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '14px', fontWeight: 500, color: S.t1 }}>{formatPrice(listing.asking_price)}</div>
                    <div style={{ fontSize: '11px', marginTop: '2px', color: listing.status === 'active' ? S.green : S.t3, fontWeight: 500 }}>
                      {listing.status === 'active' ? (nl ? 'Actief' : 'Active') : listing.status}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(listing.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, padding: '4px', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.color = S.red)}
                    onMouseLeave={e => (e.currentTarget.style.color = S.t3)}>
                    <Trash2 size={15} />
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