'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, FileText, CheckCircle, Clock,
  Phone, Mail, LogOut, AlertTriangle, Calendar
} from 'lucide-react'
import MeldingModal from '@/components/meldingen/MeldingModal'

// ── Timeline step builder based on real data ──────────────
function buildTimeline(submission: any, viewings: any[], bids: any[]) {
  const hasViewing   = viewings.length > 0
  const confirmedV   = viewings.some(v => v.status === 'confirmed')
  const hasBid       = bids.length > 0
  const isApproved   = submission?.status === 'approved'

  const fmt = (d: string) => new Date(d).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return [
    {
      id: 1, label: 'Dossier aangemaakt',
      done: !!submission,
      date: submission ? fmt(submission.created_at) : '—',
    },
    {
      id: 2, label: 'Bezichtiging aangevraagd',
      done: hasViewing,
      date: hasViewing ? fmt(viewings[0].date) : '—',
    },
    {
      id: 3, label: 'Bezichtiging bevestigd',
      done: confirmedV,
      date: confirmedV ? fmt(viewings.find(v => v.status === 'confirmed')?.date) : '—',
    },
    {
      id: 4, label: 'Bod uitgebracht',
      done: hasBid,
      date: hasBid ? fmt(bids[0].placed_at) : '—',
    },
    {
      id: 5, label: 'Bod geaccepteerd',
      done: false,
      date: 'In afwachting',
    },
    {
      id: 6, label: 'Koopovereenkomst opgesteld',
      done: false, date: '—',
    },
    {
      id: 7, label: 'Koopakte ondertekend',
      done: false, date: '—',
    },
    {
      id: 8, label: 'Overdracht afgerond',
      done: false, date: '—',
    },
  ]
}

export default function DossierDashboard() {
  const router = useRouter()

  const [email,       setEmail]       = useState('gebruiker')
  const [showMelding, setShowMelding] = useState(false)
  const [viewings,    setViewings]    = useState<any[]>([])
  const [submission,  setSubmission]  = useState<any>(null)
  const [bids,        setBids]        = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('dossier_token')
    if (!token) { router.push('/dossier/login'); return }
    setEmail(localStorage.getItem('dossier_email') || 'gebruiker')
    loadRealData(token)
  }, [])

  async function loadRealData(token: string) {
    setLoading(true)
    try {
      // Load viewings, my bids, my submissions in parallel
      const [vRes, bRes, sRes] = await Promise.all([
        fetch('http://localhost:8000/api/viewings/my',
          { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/submissions/my-bids',
          { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/submissions/my',
          { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const [vData, bData, sData] = await Promise.all([
        vRes.json(), bRes.ok ? bRes.json() : { bids: [] },
        sRes.ok ? sRes.json() : { submissions: [] },
      ])

      setViewings(vData.viewings || [])
      setBids(bData.bids || [])

      // Use most recent submission
      const subs = sData.submissions || []
      if (subs.length > 0) setSubmission(subs[0])

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('dossier_token')
    localStorage.removeItem('dossier_user_id')
    localStorage.removeItem('dossier_email')
    router.push('/dossier/login')
  }

  const timeline       = buildTimeline(submission, viewings, bids)
  const completedSteps = timeline.filter(s => s.done).length
  const progress       = Math.round((completedSteps / timeline.length) * 100)
  const currentStep    = timeline.find(s => !s.done)?.label || 'Afgerond'

  // Property info from submission or viewings
  const property = submission?.property || viewings[0]?.property || null

  return (
    <div className="min-h-screen" style={{ background: '#f0faf5' }}>

      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: 'radial-gradient(rgba(14,59,40,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Nav */}
      <nav className="relative z-10 px-6 h-14 flex items-center justify-between"
        style={{ background: 'white', borderBottom: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 1px 8px rgba(14,59,40,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7" style={{ background: '#0e3b28' }}>
            <Home size={14} color="#2fc586" />
          </div>
          <span className="font-display font-bold text-base tracking-tight" style={{ color: '#0e3b28' }}>
            Mijn Dossier
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: 'rgba(14,59,40,0.45)' }}>{email}</span>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: 'rgba(14,59,40,0.4)' }}>
            <LogOut size={13} /> Uitloggen
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight mb-1" style={{ color: '#0e3b28' }}>
            Welkom terug
          </h1>
          <p className="text-sm" style={{ color: 'rgba(14,59,40,0.5)' }}>
            Hier vindt u alle informatie over uw woningtransactie.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'rgba(14,59,40,0.4)' }}>Laden...</div>
        ) : (
          <>
            {/* Property card */}
            <div className="p-6 mb-6 flex items-center gap-5"
              style={{ background: '#0e3b28', boxShadow: '0 4px 20px rgba(14,59,40,0.2)' }}>
              <div className="w-16 h-16 flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(47,197,134,0.15)', border: '1px solid rgba(47,197,134,0.3)' }}>
                <Home size={28} color="#2fc586" />
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-white text-lg mb-0.5">
                  {property
                    ? `${property.street} ${property.house_number || ''}`
                    : 'Woning'}
                </div>
                <div className="text-sm" style={{ color: 'rgba(113,221,175,0.6)' }}>
                  {property ? `${property.city}` : 'Geen woning gevonden'}
                  {submission?.reference && (
                    <span className="ml-3 font-mono text-xs opacity-60">{submission.reference}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {submission?.asking_price ? (
                  <div className="font-mono font-bold text-white text-xl">
                    {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(submission.asking_price)}
                  </div>
                ) : (
                  <div className="font-mono font-bold text-white text-xl">Open bieding</div>
                )}
                <div className="text-xs mt-0.5 px-2 py-0.5 inline-block"
                  style={{ background: 'rgba(47,197,134,0.15)', color: '#2fc586', border: '1px solid rgba(47,197,134,0.3)' }}>
                  {submission?.status === 'approved' ? 'Te koop' : 'In behandeling'}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="p-5 mb-6"
              style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: '#0e3b28' }}>Voortgang transactie</span>
                <span className="font-mono text-sm font-bold" style={{ color: '#2fc586' }}>
                  {completedSteps}/{timeline.length} stappen
                </span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'rgba(14,59,40,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: '#2fc586' }} />
              </div>
              <div className="text-xs mt-2" style={{ color: 'rgba(14,59,40,0.4)' }}>
                Huidige stap: <strong style={{ color: '#0e3b28' }}>{currentStep}</strong>
              </div>
            </div>

            {/* Real viewings */}
            {viewings.length > 0 && (
              <div className="p-5 mb-6"
                style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4"
                  style={{ color: 'rgba(14,59,40,0.4)' }}>
                  Mijn bezichtigingen
                </h2>
                <div className="flex flex-col gap-2">
                  {viewings.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3"
                      style={{ background: 'rgba(14,59,40,0.03)', border: '1px solid rgba(14,59,40,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <Calendar size={14} color="#2fc586" />
                        <div>
                          <div className="text-sm font-semibold" style={{ color: '#0e3b28' }}>
                            {v.property
                              ? `${v.property.street} ${v.property.house_number}, ${v.property.city}`
                              : 'Bezichtiging'}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'rgba(14,59,40,0.4)' }}>
                            {new Date(v.date).toLocaleDateString('nl-NL', {
                              weekday: 'long', day: 'numeric', month: 'long'
                            })} om {v.time}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-1"
                        style={{
                          background: v.status === 'confirmed' ? 'rgba(47,197,134,0.1)'
                                    : v.status === 'rejected'  ? 'rgba(184,64,51,0.1)'
                                    : 'rgba(196,124,26,0.1)',
                          color:      v.status === 'confirmed' ? '#2fc586'
                                    : v.status === 'rejected'  ? '#b84033'
                                    : '#c47c1a',
                        }}>
                        {v.status === 'confirmed' ? 'Bevestigd'
                       : v.status === 'rejected'  ? 'Afgewezen'
                       : 'In afwachting'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My bids */}
            {bids.length > 0 && (
              <div className="p-5 mb-6"
                style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4"
                  style={{ color: 'rgba(14,59,40,0.4)' }}>
                  Mijn biedingen
                </h2>
                <div className="flex flex-col gap-2">
                  {bids.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3"
                      style={{ background: 'rgba(14,59,40,0.03)', border: '1px solid rgba(14,59,40,0.06)' }}>
                      <div className="text-sm font-semibold" style={{ color: '#0e3b28' }}>
                        Bod geplaatst
                      </div>
                      <div className="font-mono font-bold" style={{ color: '#2fc586' }}>
                        {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(b.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">

              {/* Timeline */}
              <div className="p-5"
                style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4"
                  style={{ color: 'rgba(14,59,40,0.4)' }}>
                  Tijdlijn
                </h2>
                <div className="flex flex-col gap-0">
                  {timeline.map((step, i) => (
                    <div key={step.id} className="flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: step.done ? '#2fc586' : 'rgba(14,59,40,0.08)',
                            border:     step.done ? 'none' : '1px solid rgba(14,59,40,0.15)',
                          }}>
                          {step.done
                            ? <CheckCircle size={14} color="white" />
                            : <Clock size={12} color="rgba(14,59,40,0.3)" />}
                        </div>
                        {i < timeline.length - 1 && (
                          <div className="w-px flex-1 mt-1"
                            style={{ background: step.done ? 'rgba(47,197,134,0.3)' : 'rgba(14,59,40,0.08)', minHeight: '16px' }} />
                        )}
                      </div>
                      <div className="pt-0.5">
                        <div className="text-sm font-semibold"
                          style={{ color: step.done ? '#0e3b28' : 'rgba(14,59,40,0.35)' }}>
                          {step.label}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(14,59,40,0.35)' }}>{step.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-6">

                {/* Documents — still mock until file upload is built */}
                <div className="p-5"
                  style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                  <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4"
                    style={{ color: 'rgba(14,59,40,0.4)' }}>
                    Documenten
                  </h2>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'Koopovereenkomst concept', status: 'Te ondertekenen', size: '245 KB' },
                      { name: 'Taxatierapport',            status: 'Beschikbaar',    size: '1.2 MB' },
                      { name: 'Energielabel certificaat',  status: 'Beschikbaar',    size: '180 KB' },
                    ].map((doc, i) => (
                      <div key={i}
                        className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:opacity-80"
                        style={{
                          background: doc.status === 'Te ondertekenen' ? 'rgba(47,197,134,0.06)' : 'rgba(14,59,40,0.03)',
                          border:     doc.status === 'Te ondertekenen' ? '1px solid rgba(47,197,134,0.2)' : '1px solid rgba(14,59,40,0.06)',
                        }}>
                        <FileText size={16} color={doc.status === 'Te ondertekenen' ? '#2fc586' : 'rgba(14,59,40,0.3)'} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: '#0e3b28' }}>{doc.name}</div>
                          <div className="text-xs" style={{ color: 'rgba(14,59,40,0.4)' }}>{doc.size}</div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 flex-shrink-0"
                          style={{
                            background: doc.status === 'Te ondertekenen' ? '#2fc586' : 'rgba(14,59,40,0.06)',
                            color:      doc.status === 'Te ondertekenen' ? '#061a11' : 'rgba(14,59,40,0.5)',
                          }}>
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Makelaar contact */}
                <div className="p-5"
                  style={{ background: 'white', border: '1px solid rgba(14,59,40,0.08)', boxShadow: '0 2px 8px rgba(14,59,40,0.04)' }}>
                  <h2 className="font-display font-bold text-sm uppercase tracking-wider mb-4"
                    style={{ color: 'rgba(14,59,40,0.4)' }}>
                    Uw makelaar
                  </h2>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center font-bold text-white flex-shrink-0"
                      style={{ background: '#0e3b28', fontSize: '14px' }}>
                      SM
                    </div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#0e3b28' }}>Stadsmakelaars</div>
                      <div className="text-xs" style={{ color: 'rgba(14,59,40,0.4)' }}>Hooghuisstraat 31A, Eindhoven</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="flex items-center gap-3 p-3 text-sm w-full text-left"
                      style={{ background: 'rgba(14,59,40,0.04)', border: '1px solid rgba(14,59,40,0.06)', color: '#0e3b28' }}>
                      <Phone size={14} color="#2fc586" />
                      085 080 55 98
                    </button>
                    <button className="flex items-center gap-3 p-3 text-sm w-full text-left"
                      style={{ background: 'rgba(14,59,40,0.04)', border: '1px solid rgba(14,59,40,0.06)', color: '#0e3b28' }}>
                      <Mail size={14} color="#2fc586" />
                      info@stadsmakelaars.nl
                    </button>
                    <button
                      onClick={() => setShowMelding(true)}
                      className="flex items-center gap-3 p-3 text-sm w-full text-left mt-1 transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(184,64,51,0.06)', border: '1px solid rgba(184,64,51,0.2)', color: '#b84033' }}>
                      <AlertTriangle size={14} color="#b84033" />
                      Probleem melden
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative z-10 text-center py-6 text-xs" style={{ color: 'rgba(14,59,40,0.25)' }}>
        Mogelijk gemaakt door{' '}
        <span className="font-bold" style={{ color: '#0e3b28' }}>
          Groun<span style={{ color: '#2fc586' }}>dr</span>
        </span>
      </div>

      {showMelding && (
        <MeldingModal
          makelaarId={1}
          street={property?.street || 'Woning'}
          city={property?.city || 'Eindhoven'}
          onClose={() => setShowMelding(false)}
        />
      )}
    </div>
  )
}