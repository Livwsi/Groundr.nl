'use client'

import { useState } from 'react'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  makelaarId:   number
  propertyId?:  number
  submissionId?: number
  street:       string
  city:         string
  onClose:      () => void
}

const CATEGORIES = [
  { value: 'general',    label: 'Algemeen',      icon: '📋' },
  { value: 'structural', label: 'Constructie',   icon: '🏗️' },
  { value: 'electrical', label: 'Elektra',       icon: '⚡' },
  { value: 'plumbing',   label: 'Loodgieterswerk',icon: '🔧' },
  { value: 'heating',    label: 'Verwarming',    icon: '🌡️' },
  { value: 'other',      label: 'Anders',        icon: '❓' },
]

const PRIORITIES = [
  { value: 'low',    label: 'Laag',    color: '#888' },
  { value: 'normal', label: 'Normaal', color: '#1a6fc4' },
  { value: 'high',   label: 'Hoog',    color: '#c47c1a' },
  { value: 'urgent', label: 'Urgent',  color: '#b84033' },
]

export default function MeldingModal({
  makelaarId, propertyId, submissionId, street, city, onClose
}: Props) {
  const [title,    setTitle]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('normal')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Prefer dossier_token when on dossier pages, fallback to makelaar token
    const token = localStorage.getItem('dossier_token') || localStorage.getItem('token')
    if (!token) {
      window.location.href = '/register'
      return
    }

    try {
      const res = await fetch('http://localhost:8000/api/meldingen/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          makelaar_id:   makelaarId,
          property_id:   propertyId || null,
          submission_id: submissionId || null,
          title,
          description:   desc,
          category,
          priority,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Er is iets misgegaan.'); return }
      setSuccess(true)
    } catch {
      setError('Kan geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md"
        style={{ background: 'white', border: '1px solid #e5e5e5', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <div className="font-semibold text-base" style={{ color: '#0a0a0a' }}>
              Melding indienen
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#888' }}>
              {street} · {city}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-60 transition-opacity">
            <X size={18} color="#888" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4"
              style={{ background: '#e6f7f1' }}>
              <CheckCircle size={32} color="#00b37e" />
            </div>
            <div className="font-bold text-base mb-2" style={{ color: '#0a0a0a' }}>
              Melding ingediend!
            </div>
            <div className="text-sm mb-6" style={{ color: '#888' }}>
              De makelaar ontvangt uw melding en neemt contact op.
            </div>
            <button onClick={onClose}
              className="w-full py-3 text-sm font-bold"
              style={{ background: '#0a0a0a', color: 'white' }}>
              Sluiten
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5">

            {/* Category */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: '#888' }}>
                Categorie
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => setCategory(c.value)}
                    className="py-2 text-xs font-medium transition-all"
                    style={{
                      background: category === c.value ? '#0a0a0a' : '#f5f5f5',
                      color:      category === c.value ? 'white' : '#555',
                      border:     category === c.value ? '1px solid #0a0a0a' : '1px solid #e5e5e5',
                    }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: '#888' }}>
                Prioriteit
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button"
                    onClick={() => setPriority(p.value)}
                    className="flex-1 py-2 text-xs font-semibold transition-all"
                    style={{
                      background: priority === p.value ? p.color : '#f5f5f5',
                      color:      priority === p.value ? 'white' : '#555',
                      border:     priority === p.value ? `1px solid ${p.color}` : '1px solid #e5e5e5',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: '#888' }}>
                Onderwerp *
              </label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Bijv. Lekkage badkamer" required
                className="w-full px-4 py-3 text-sm outline-none"
                style={{ background: '#f7f7f7', border: '1px solid #e5e5e5', color: '#0a0a0a' }} />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: '#888' }}>
                Omschrijving *
              </label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Beschrijf het probleem zo duidelijk mogelijk..." required
                rows={4} className="w-full px-4 py-3 text-sm outline-none resize-none"
                style={{ background: '#f7f7f7', border: '1px solid #e5e5e5', color: '#0a0a0a' }} />
            </div>

            {error && (
              <div className="text-xs p-3 mb-4"
                style={{ background: '#fbeaea', color: '#b84033' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm font-bold disabled:opacity-40"
              style={{ background: '#0a0a0a', color: 'white' }}>
              {loading ? 'Bezig...' : 'Melding indienen'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}