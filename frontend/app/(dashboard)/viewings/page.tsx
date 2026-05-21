'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, User, Phone, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'

interface ViewingRequest {
  id:             number
  date:           string
  time:           string
  status:         string
  buyer_name:     string
  buyer_phone:    string
  message:        string | null
  rejection_note: string | null
  created_at:     string
  listing_ref:    string | null
  property:       { street: string; house_number: string; city: string } | null
}

interface Slot {
  id:          number
  day_of_week: number
  day_name:    string
  start_time:  string
  end_time:    string
}

const DAYS = ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag']

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'In afwachting', color: '#c47c1a', bg: 'rgba(196,124,26,0.1)' },
  confirmed: { label: 'Bevestigd',     color: '#00b37e', bg: 'rgba(0,179,126,0.1)' },
  rejected:  { label: 'Afgewezen',     color: '#b84033', bg: 'rgba(184,64,51,0.1)' },
}

export default function ViewingsPage() {
  const [requests,     setRequests]     = useState<ViewingRequest[]>([])
  const [slots,        setSlots]        = useState<Slot[]>([])
  const [loading,      setLoading]      = useState(true)
  const [actionId,     setActionId]     = useState<number | null>(null)
  const [rejectingId,  setRejectingId]  = useState<number | null>(null)
  const [rejectNote,   setRejectNote]   = useState('')
  const [tab,          setTab]          = useState<'requests' | 'availability'>('requests')
  const [newSlot,      setNewSlot]      = useState({ day_of_week: 0, start_time: '09:00', end_time: '17:00' })
  const [savingSlot,   setSavingSlot]   = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const token = localStorage.getItem('token')
    try {
      const [reqRes, slotRes] = await Promise.all([
        fetch('http://localhost:8000/api/viewings/requests', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:8000/api/viewings/availability/1'),
      ])
      const reqData  = await reqRes.json()
      const slotData = await slotRes.json()
      setRequests(reqData.requests || [])
      setSlots(slotData.slots || [])
    } catch {}
    finally { setLoading(false) }
  }

  async function confirm(id: number) {
    setActionId(id)
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:8000/api/viewings/${id}/confirm`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed' } : r))
    setActionId(null)
  }

  async function reject(id: number) {
    setActionId(id)
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:8000/api/viewings/${id}/reject`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ note: rejectNote }),
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejection_note: rejectNote } : r))
    setRejectingId(null)
    setRejectNote('')
    setActionId(null)
  }

  async function addSlot() {
    setSavingSlot(true)
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:8000/api/viewings/availability', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(newSlot),
    })
    if (res.ok) loadAll()
    setSavingSlot(false)
  }

  async function deleteSlot(slotId: number) {
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:8000/api/viewings/availability/${slotId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    setSlots(prev => prev.filter(s => s.id !== slotId))
  }

  const pending   = requests.filter(r => r.status === 'pending').length
  const confirmed = requests.filter(r => r.status === 'confirmed').length

  return (
    <div className="min-h-screen bg-g900">

      {/* Nav */}
      <nav className="bg-g800 border-b border-g700 px-6 h-14 flex items-center gap-4">
        <Link href="/dashboard" className="text-g300 opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} />
        </Link>
        <img src="/logo.svg" alt="Groundr" className="h-10 w-auto" />
        <span className="text-g300 opacity-30 text-sm">/ Bezichtigingen</span>
        {pending > 0 && (
          <span className="font-mono text-xs font-bold px-2 py-0.5 ml-1"
            style={{ background: 'rgba(196,124,26,0.15)', color: '#c47c1a', border: '1px solid rgba(196,124,26,0.3)' }}>
            {pending} wachtend
          </span>
        )}
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Bezichtigingen</h1>
          <p className="text-sm text-g300 opacity-50 mt-1">Beheer aanvragen en stel uw beschikbaarheid in</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'In afwachting', value: pending,   color: '#c47c1a' },
            { label: 'Bevestigd',     value: confirmed, color: '#00b37e' },
            { label: 'Totaal',        value: requests.length, color: 'white' },
          ].map((s, i) => (
            <div key={i} className="bg-g800 border border-g700 p-4">
              <div className="text-xs text-g300 opacity-40 mb-1">{s.label}</div>
              <div className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 mb-6 border-b border-g700">
          {[
            { key: 'requests',     label: 'Aanvragen' },
            { key: 'availability', label: 'Mijn beschikbaarheid' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className="px-5 py-3 text-sm font-semibold transition-all"
              style={{
                borderBottom: tab === t.key ? '2px solid #00b37e' : '2px solid transparent',
                color:        tab === t.key ? '#00b37e' : 'rgba(255,255,255,0.3)',
                marginBottom: '-1px',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-16 text-g300 opacity-40 text-sm">Laden...</div>
        )}

        {/* ── REQUESTS TAB ── */}
        {!loading && tab === 'requests' && (
          <div className="flex flex-col gap-3">
            {requests.length === 0 && (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="w-14 h-14 bg-g800 border border-g700 flex items-center justify-center mb-4">
                  <Calendar size={22} className="text-g400" />
                </div>
                <p className="text-white font-semibold mb-1">Geen aanvragen</p>
                <p className="text-g300 opacity-40 text-sm">Bezichtigingsverzoeken verschijnen hier</p>
              </div>
            )}

            {requests.map(req => {
              const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
              return (
                <div key={req.id} className="bg-g800 border border-g700 overflow-hidden">
                  {/* Header */}
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-g700 flex items-center justify-center flex-shrink-0">
                        <Calendar size={16} className="text-g400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="font-semibold text-white">
                            {new Date(req.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </div>
                          <span className="font-mono text-sm font-bold text-g400">{req.time}</span>
                        </div>
                        {req.property && (
                          <div className="text-xs text-g300 opacity-50">
                            {req.property.street} {req.property.house_number}, {req.property.city}
                            {req.listing_ref && <span className="ml-2 font-mono text-g400">{req.listing_ref}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 flex-shrink-0"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Buyer info */}
                  <div className="px-5 pb-4 grid grid-cols-2 gap-3 border-t border-g700/50 pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User size={13} className="text-g400" />
                      <span className="text-white">{req.buyer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={13} className="text-g400" />
                      <span className="text-white">{req.buyer_phone}</span>
                    </div>
                    {req.message && (
                      <div className="col-span-2 text-xs text-g300 opacity-60 italic">
                        "{req.message}"
                      </div>
                    )}
                    {req.rejection_note && (
                      <div className="col-span-2 text-xs" style={{ color: '#b84033' }}>
                        Reden: {req.rejection_note}
                      </div>
                    )}
                  </div>

                  {/* Reject note input */}
                  {rejectingId === req.id && (
                    <div className="px-5 pb-4 border-t border-g700/50 pt-4">
                      <textarea
                        value={rejectNote}
                        onChange={e => setRejectNote(e.target.value)}
                        placeholder="Reden voor afwijzing (optioneel)..."
                        rows={2}
                        className="w-full bg-g900 border border-g700 text-white placeholder-white/20 px-3 py-2 text-sm outline-none resize-none focus:border-g400"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="px-5 pb-4 flex gap-3 border-t border-g700/50 pt-4">
                      {rejectingId === req.id ? (
                        <>
                          <button onClick={() => reject(req.id)} disabled={actionId === req.id}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold disabled:opacity-50"
                            style={{ background: '#b84033', color: 'white' }}>
                            <XCircle size={14} />
                            {actionId === req.id ? 'Bezig...' : 'Afwijzen'}
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectNote('') }}
                            className="text-sm text-g300 opacity-50 hover:opacity-100 px-3">
                            Annuleren
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => confirm(req.id)} disabled={actionId === req.id}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-bold disabled:opacity-50"
                            style={{ background: '#00b37e', color: '#061a11' }}>
                            <CheckCircle size={14} />
                            {actionId === req.id ? 'Bezig...' : 'Bevestigen'}
                          </button>
                          <button onClick={() => setRejectingId(req.id)}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold"
                            style={{ background: 'rgba(184,64,51,0.1)', color: '#b84033', border: '1px solid rgba(184,64,51,0.3)' }}>
                            <XCircle size={14} />
                            Afwijzen
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── AVAILABILITY TAB ── */}
        {!loading && tab === 'availability' && (
          <div>
            {/* Add slot */}
            <div className="bg-g800 border border-g700 p-5 mb-4">
              <h3 className="font-semibold text-white mb-4">Beschikbaarheid toevoegen</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-g300 opacity-50 mb-2 uppercase tracking-wider">Dag</label>
                  <select value={newSlot.day_of_week}
                    onChange={e => setNewSlot({...newSlot, day_of_week: parseInt(e.target.value)})}
                    className="w-full bg-g900 border border-g700 text-white px-3 py-2.5 text-sm outline-none focus:border-g400">
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-g300 opacity-50 mb-2 uppercase tracking-wider">Vanaf</label>
                  <select value={newSlot.start_time}
                    onChange={e => setNewSlot({...newSlot, start_time: e.target.value})}
                    className="w-full bg-g900 border border-g700 text-white px-3 py-2.5 text-sm outline-none focus:border-g400">
                    {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map(t =>
                      <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-g300 opacity-50 mb-2 uppercase tracking-wider">Tot</label>
                  <select value={newSlot.end_time}
                    onChange={e => setNewSlot({...newSlot, end_time: e.target.value})}
                    className="w-full bg-g900 border border-g700 text-white px-3 py-2.5 text-sm outline-none focus:border-g400">
                    {['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'].map(t =>
                      <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={addSlot} disabled={savingSlot}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
                style={{ background: '#00b37e', color: '#061a11' }}>
                <Plus size={14} />
                {savingSlot ? 'Opslaan...' : 'Slot toevoegen'}
              </button>
            </div>

            {/* Existing slots */}
            {slots.length === 0 ? (
              <div className="text-center py-12 text-g300 opacity-40 text-sm">
                Nog geen beschikbaarheid ingesteld. Voeg hierboven slots toe.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {slots.map(slot => (
                  <div key={slot.id} className="bg-g800 border border-g700 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-white w-24">{slot.day_name}</span>
                      <div className="flex items-center gap-2 text-sm text-g300 opacity-70">
                        <Clock size={13} className="text-g400" />
                        {slot.start_time} – {slot.end_time}
                      </div>
                    </div>
                    <button onClick={() => deleteSlot(slot.id)}
                      className="text-g300 opacity-30 hover:opacity-100 hover:text-red-400 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}