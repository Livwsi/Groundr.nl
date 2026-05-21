'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, MapPin, Home, ArrowLeft } from 'lucide-react'

interface Listing {
  id:           number
  asking_price: number
  status:       string
  listed_date:  string
  property: {
    street:       string
    house_number: string
    city:         string
    area_m2:      number | null
    energy_label: string
  }
}

interface NewListingForm {
  address:       string
  asking_price:  string
  area_m2:       string
  bedrooms:      string
  property_type: string
  energy_label:  string
  is_rental:     boolean
}

const EMPTY_FORM: NewListingForm = {
  address:       '',
  asking_price:  '',
  area_m2:       '',
  bedrooms:      '',
  property_type: 'house',
  energy_label:  'unknown',
  is_rental:     false,
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price)
}

export default function ListingsPage() {
  const router = useRouter()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState<NewListingForm>(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  // Load listings on mount
  useEffect(() => {
    loadListings()
  }, [])

  async function loadListings() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch('http://localhost:8000/api/listings/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setListings(data.listings || [])
    } catch {
      setError('Kan listings niet laden.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      const res   = await fetch('http://localhost:8000/api/listings/', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({
          address:       form.address,
          asking_price:  parseFloat(form.asking_price),
          area_m2:       form.area_m2 ? parseFloat(form.area_m2) : null,
          bedrooms:      form.bedrooms ? parseInt(form.bedrooms) : null,
          property_type: form.property_type,
          energy_label:  form.energy_label,
          is_rental:     form.is_rental,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Er is iets misgegaan.')
        return
      }

      setSuccess(`Listing aangemaakt: ${data.property.street} ${data.property.house_number}`)
      setForm(EMPTY_FORM)
      setShowForm(false)
      loadListings()

    } catch {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Weet u zeker dat u deze listing wilt verwijderen?')) return

    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:8000/api/listings/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      loadListings()
    } catch {
      setError('Kan listing niet verwijderen.')
    }
  }

  return (
    <div className="min-h-screen bg-g900">

      {/* Nav */}
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-g300 opacity-50 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="font-display font-bold text-lg text-white tracking-tight">
            Groun<span className="text-g400">dr</span>
          </span>
          <span className="text-g300 opacity-30 text-sm">/ Mijn listings</span>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
          className="flex items-center gap-2 bg-g400 text-g900 font-bold px-4 py-2 text-sm hover:bg-g300 transition-colors"
        >
          <Plus size={14} />
          Listing toevoegen
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Add listing form */}
        {showForm && (
          <div className="bg-g800 border border-g700 p-6 mb-8">
            <h2 className="font-display font-bold text-white mb-4">
              Nieuwe listing toevoegen
            </h2>

            {error && (
              <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">

              {/* Address — full width */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                  Adres *
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})}
                  placeholder="Stratumsedijk 23 Eindhoven"
                  required
                  className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                  Vraagprijs (€) *
                </label>
                <input
                  type="number"
                  value={form.asking_price}
                  onChange={e => setForm({...form, asking_price: e.target.value})}
                  placeholder="485000"
                  required
                  className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
                />
              </div>

              {/* Area */}
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                  Woonoppervlak (m²)
                </label>
                <input
                  type="number"
                  value={form.area_m2}
                  onChange={e => setForm({...form, area_m2: e.target.value})}
                  placeholder="142"
                  className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
                />
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                  Slaapkamers
                </label>
                <input
                  type="number"
                  value={form.bedrooms}
                  onChange={e => setForm({...form, bedrooms: e.target.value})}
                  placeholder="4"
                  className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
                />
              </div>

              {/* Property type */}
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                  Type woning
                </label>
                <select
                  value={form.property_type}
                  onChange={e => setForm({...form, property_type: e.target.value})}
                  className="w-full bg-g900 border border-g700 text-white px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
                >
                  <option value="house">Woning</option>
                  <option value="apartment">Appartement</option>
                  <option value="villa">Villa</option>
                  <option value="townhouse">Tussenwoning</option>
                  <option value="semi_detached">2-onder-1-kap</option>
                  <option value="detached">Vrijstaand</option>
                  <option value="studio">Studio</option>
                </select>
              </div>

              {/* Energy label */}
              <div>
                <label className="block text-xs font-semibold text-g300 opacity-70 mb-2 uppercase tracking-wider">
                  Energielabel
                </label>
                <select
                  value={form.energy_label}
                  onChange={e => setForm({...form, energy_label: e.target.value})}
                  className="w-full bg-g900 border border-g700 text-white px-4 py-3 text-sm outline-none focus:border-g400 transition-colors"
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

              {/* Rental toggle */}
              <div className="col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_rental"
                  checked={form.is_rental}
                  onChange={e => setForm({...form, is_rental: e.target.checked})}
                  className="w-4 h-4 accent-g400"
                />
                <label htmlFor="is_rental" className="text-sm text-g300 opacity-70 cursor-pointer">
                  Dit is een huurwoning
                </label>
              </div>

              {/* Buttons */}
              <div className="col-span-2 flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-g400 text-g900 font-bold px-6 py-2.5 text-sm hover:bg-g300 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Listing opslaan'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError('') }}
                  className="bg-g700 text-g300 font-semibold px-6 py-2.5 text-sm hover:bg-g600 transition-colors"
                >
                  Annuleren
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-g400/10 border border-g400/30 text-g400 text-sm px-4 py-3 mb-6">
            {success}
          </div>
        )}

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Mijn listings
            </h1>
            <p className="text-sm text-g300 opacity-50 mt-1">
              {listings.length} {listings.length === 1 ? 'listing' : 'listings'} in uw portfolio
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-g300 opacity-40 text-sm">
            Laden...
          </div>
        )}

        {/* Empty state */}
        {!loading && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-g800 border border-g700 flex items-center justify-center mb-4">
              <Home size={24} className="text-g400" />
            </div>
            <p className="text-white font-display font-bold mb-1">Nog geen listings</p>
            <p className="text-g300 opacity-40 text-sm mb-4">
              Voeg uw eerste woning toe via de knop hierboven
            </p>
          </div>
        )}

        {/* Listings table */}
        {!loading && listings.length > 0 && (
          <div className="flex flex-col gap-3">
            {listings.map(listing => (
              <div
                key={listing.id}
                className="bg-g800 border border-g700 p-5 flex items-center justify-between hover:border-g500 transition-colors"
              >
                {/* Property info */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-g700 flex items-center justify-center flex-shrink-0">
                    <Home size={18} className="text-g400" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-white">
                      {listing.property.street} {listing.property.house_number}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-g300 opacity-50 mt-0.5">
                      <MapPin size={10} />
                      {listing.property.city}
                      {listing.property.area_m2 && (
                        <span className="ml-2">{listing.property.area_m2} m²</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side — price + status + delete */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-mono font-semibold text-white">
                      {formatPrice(listing.asking_price)}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: listing.status === 'active' ? '#2fc586' : 'rgba(255,255,255,0.4)' }}
                    >
                      {listing.status === 'active' ? 'Actief' : listing.status}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="text-g300 opacity-30 hover:opacity-100 hover:text-red-400 transition-all"
                    title="Verwijderen"
                  >
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