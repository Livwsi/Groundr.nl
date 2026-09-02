'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Phone, MessageSquare, CheckCircle } from 'lucide-react'

interface Props {
  makelaarId:   number
  submissionId?: number
  street:       string
  city:         string
  onClose:      () => void
}

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
]

const DAYS = ['Ma','Di','Wo','Do','Vr','Za','Zo']

export default function ViewingModal({ makelaarId, submissionId, street, city, onClose }: Props) {
  const [step,        setStep]        = useState<'pick' | 'details' | 'success'>('pick')
  const [slots,       setSlots]       = useState<any[]>([])
  const [selectedDate,setSelectedDate]= useState('')
  const [selectedTime,setSelectedTime]= useState('')
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [message,     setMessage]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // Load makelaar availability
  useEffect(() => {
    fetch(`${API_BASE}/api/viewings/availability/${makelaarId}`)
      .then(r => r.json())
      .then(data => setSlots(data.slots || []))
      .catch(() => {})
  }, [])

  // Generate next 14 days with availability
  function getAvailableDates() {
    const dates = []
    const today = new Date()
    for (let i = 1; i <= 21; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const dow = (d.getDay() + 6) % 7 // convert Sun=0 to Mon=0
      const hasSlot = slots.length === 0 || slots.some(s => s.day_of_week === dow)
      if (hasSlot) {
        dates.push({
          date:    d.toISOString().split('T')[0],
          display: d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }),
          dow,
        })
      }
    }
    return dates.slice(0, 14)
  }

  // Get available times for selected date
  function getAvailableTimes() {
    if (!selectedDate) return TIME_SLOTS
    const d   = new Date(selectedDate)
    const dow = (d.getDay() + 6) % 7
    const daySlots = slots.filter(s => s.day_of_week === dow)
    if (daySlots.length === 0) return TIME_SLOTS

    return TIME_SLOTS.filter(t => {
      return daySlots.some(s => t >= s.start_time && t < s.end_time)
    })
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)

    const token = localStorage.getItem('groundr_token') || localStorage.getItem('dossier_token')
    if (!token) {
      sessionStorage.setItem('after_login', window.location.pathname)
      window.location.href = '/register'
      return
    }

    try {
      const res = await fetch(API_BASE+'/api/viewings/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          makelaar_id:    makelaarId,
          submission_id:  submissionId || null,
          requested_date: selectedDate,
          requested_time: selectedTime,
          buyer_name:     name,
          buyer_phone:    phone,
          message:        message || null,
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

  const availableDates = getAvailableDates()
  const availableTimes = getAvailableTimes()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg" style={{ background: 'white', border: '1px solid #e5e5e5', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <div className="font-semibold text-base" style={{ color: '#0a0a0a' }}>
              Bezichtiging aanvragen
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#888' }}>
              {street} · {city}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-60 transition-opacity">
            <X size={18} color="#888" />
          </button>
        </div>

        {/* Steps indicator */}
        {step !== 'success' && (
          <div className="flex border-b border-gray-100">
            {['Datum & tijd', 'Uw gegevens'].map((label, i) => (
              <div key={i}
                className="flex-1 py-2.5 text-xs font-semibold text-center transition-colors"
                style={{
                  background:  (step === 'pick' && i === 0) || (step === 'details' && i === 1) ? '#0a0a0a' : 'white',
                  color:       (step === 'pick' && i === 0) || (step === 'details' && i === 1) ? 'white' : '#aaa',
                  borderRight: i === 0 ? '1px solid #e5e5e5' : 'none',
                }}>
                {i + 1}. {label}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 1: Date + Time ── */}
        {step === 'pick' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} color="#00b37e" />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#888' }}>
                Kies een datum
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {availableDates.map(d => (
                <button key={d.date} onClick={() => { setSelectedDate(d.date); setSelectedTime('') }}
                  className="py-2.5 text-xs font-medium transition-all"
                  style={{
                    background:  selectedDate === d.date ? '#0a0a0a' : '#f5f5f5',
                    color:       selectedDate === d.date ? 'white' : '#555',
                    border:      selectedDate === d.date ? '1px solid #0a0a0a' : '1px solid #e5e5e5',
                  }}>
                  {d.display}
                </button>
              ))}
            </div>

            {selectedDate && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} color="#00b37e" />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#888' }}>
                    Kies een tijd
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {availableTimes.map(t => (
                    <button key={t} onClick={() => setSelectedTime(t)}
                      className="py-2 text-xs font-medium transition-all"
                      style={{
                        background: selectedTime === t ? '#0a0a0a' : '#f5f5f5',
                        color:      selectedTime === t ? 'white' : '#555',
                        border:     selectedTime === t ? '1px solid #0a0a0a' : '1px solid #e5e5e5',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => setStep('details')}
              disabled={!selectedDate || !selectedTime}
              className="w-full mt-5 py-3 text-sm font-bold disabled:opacity-30 transition-opacity"
              style={{ background: '#0a0a0a', color: 'white' }}>
              Volgende →
            </button>
          </div>
        )}

        {/* ── STEP 2: Contact details ── */}
        {step === 'details' && (
          <div className="p-5">
            {/* Selected summary */}
            <div className="flex gap-3 mb-5 p-3"
              style={{ background: '#f5f5f5', border: '1px solid #e5e5e5' }}>
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#0a0a0a' }}>
                <Calendar size={12} color="#00b37e" />
                {new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#0a0a0a' }}>
                <Clock size={12} color="#00b37e" />
                {selectedTime}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#888' }}>
                  <User size={11} /> Uw naam *
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Jan van Dijk" required
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: '#f7f7f7', border: '1px solid #e5e5e5', color: '#0a0a0a' }} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#888' }}>
                  <Phone size={11} /> Telefoonnummer *
                </label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="06 12345678" required
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: '#f7f7f7', border: '1px solid #e5e5e5', color: '#0a0a0a' }} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#888' }}>
                  <MessageSquare size={11} /> Bericht (optioneel)
                </label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Heeft u specifieke vragen of wensen?"
                  rows={3} className="w-full px-4 py-3 text-sm outline-none resize-none"
                  style={{ background: '#f7f7f7', border: '1px solid #e5e5e5', color: '#0a0a0a' }} />
              </div>
            </div>

            {error && (
              <div className="text-xs mt-3 p-3" style={{ background: '#fbeaea', color: '#b84033' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('pick')}
                className="px-5 py-3 text-sm font-semibold"
                style={{ background: '#f5f5f5', color: '#555', border: '1px solid #e5e5e5' }}>
                ← Terug
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !name || !phone}
                className="flex-1 py-3 text-sm font-bold disabled:opacity-40"
                style={{ background: '#0a0a0a', color: 'white' }}>
                {loading ? 'Bezig...' : 'Bezichtiging aanvragen'}
              </button>
            </div>

            <p className="text-center text-xs mt-3" style={{ color: '#aaa' }}>
              De makelaar bevestigt uw aanvraag binnen 24 uur
            </p>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4"
              style={{ background: '#e6f7f1' }}>
              <CheckCircle size={32} color="#00b37e" />
            </div>
            <div className="font-bold text-base mb-2" style={{ color: '#0a0a0a' }}>
              Aanvraag ingediend!
            </div>
            <div className="text-sm mb-1" style={{ color: '#888' }}>
              {new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} om {selectedTime}
            </div>
            <div className="text-xs mt-1 mb-6" style={{ color: '#aaa' }}>
              De makelaar neemt binnen 24 uur contact met u op ter bevestiging.
            </div>
            <button onClick={onClose}
              className="w-full py-3 text-sm font-bold"
              style={{ background: '#0a0a0a', color: 'white' }}>
              Sluiten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}