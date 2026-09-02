'use client'

import { useState } from 'react'
import { Car, Bus, Bike, Footprints, Navigation } from 'lucide-react'

const S = {
  surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', shadow: '0 1px 3px rgba(11,19,32,0.06)',
}

const MODES = [
  { key: 'driving',   icon: <Car size={15}/>,        label: 'Auto',   mapbox: 'driving' },
  { key: 'transit',   icon: <Bus size={15}/>,        label: 'OV',     mapbox: 'driving' }, // proxy
  { key: 'cycling',   icon: <Bike size={15}/>,       label: 'Fiets',  mapbox: 'cycling' },
  { key: 'walking',   icon: <Footprints size={15}/>, label: 'Lopen',  mapbox: 'walking' },
]

// Well-known Eindhoven destinations for quick-select
const PRESETS = [
  { label: 'ASML Campus',         address: 'De Run 6501, Veldhoven' },
  { label: 'Eindhoven Centraal',  address: 'Stationsplein 17, Eindhoven' },
  { label: 'TU/e Campus',         address: 'De Rondom 70, Eindhoven' },
  { label: 'Brainport Industries',address: 'Esp 201, Eindhoven' },
]

export default function CommuteCalculator({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [destination, setDestination] = useState('')
  const [activeMode,  setActiveMode]  = useState('driving')
  const [results,     setResults]     = useState<Record<string, { duration: string; distance: string }>>({})
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  async function calculate() {
    if (!destination.trim()) return
    setLoading(true); setError(''); setResults({})

    // First geocode the destination via PDOK
    try {
      const geoRes  = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(destination)}&rows=1`)
      const geoData = await geoRes.json()
      const doc     = geoData.response?.docs?.[0]
      if (!doc?.centroide_ll) { setError('Bestemming niet gevonden. Probeer een specifieker adres.'); setLoading(false); return }

      // centroide_ll = "POINT(lon lat)"
      const match = doc.centroide_ll.match(/POINT\(([^ ]+) ([^ ]+)\)/)
      if (!match) { setError('Geocoding mislukt.'); setLoading(false); return }
      const destLon = parseFloat(match[1])
      const destLat = parseFloat(match[2])

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const newResults: Record<string, { duration: string; distance: string }> = {}

      // Fetch all 3 real modes in parallel (skip transit — use cycling as proxy)
      const modeKeys = ['driving', 'cycling', 'walking'] as const
      await Promise.all(modeKeys.map(async mode => {
        const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${longitude},${latitude};${destLon},${destLat}?access_token=${token}&overview=false`
        const res  = await fetch(url)
        const data = await res.json()
        const route = data.routes?.[0]
        if (route) {
          const mins = Math.round(route.duration / 60)
          const km   = (route.distance / 1000).toFixed(1)
          newResults[mode] = {
            duration: mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}u ${mins%60}m`,
            distance: `${km} km`,
          }
        }
      }))

      // Transit: estimate from driving time × 1.4
      const drivingMins = newResults['driving'] ? parseInt(newResults['driving'].duration) : 0
      newResults['transit'] = {
        duration: `~${Math.round(drivingMins * 1.4)} min`,
        distance: newResults['driving']?.distance || '—',
      }

      setResults(newResults)
    } catch { setError('Fout bij berekening. Controleer uw internetverbinding.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      {/* Preset destinations */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Snelle selectie</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setDestination(p.address)} style={{ padding: '4px 10px', fontSize: '11.5px', background: destination === p.address ? S.greenLt : S.surface2, color: destination === p.address ? S.greenTx : S.t2, border: `1px solid ${destination === p.address ? S.greenRim : S.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, background: S.surface, border: `1px solid ${S.border}`, borderRight: 'none', padding: '0 12px' }}>
          <Navigation size={13} color={S.t3} style={{ flexShrink: 0 }} />
          <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && calculate()}
            placeholder="Bijv. ASML, Eindhoven Centraal, TU/e..."
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '13.5px', color: S.t1, background: 'transparent', padding: '10px 0' }} />
        </div>
        <button onClick={calculate} disabled={loading} style={{ height: '42px', padding: '0 18px', background: loading ? '#6EE7B7' : S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '...' : 'Bereken'}
        </button>
      </div>

      {error && <div style={{ fontSize: '12.5px', color: '#DC2626', marginBottom: '10px' }}>{error}</div>}

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
          {MODES.map(mode => {
            const r = results[mode.mapbox === 'driving' && mode.key === 'transit' ? 'transit' : mode.mapbox]
            if (!r) return null
            return (
              <div key={mode.key} style={{ background: S.surface2, border: `1px solid ${S.border}`, padding: '12px 10px', textAlign: 'center' }}>
                <span style={{ color: S.green, display: 'block', marginBottom: '4px' }}>{mode.icon}</span>
                <div style={{ fontSize: '15px', fontWeight: 600, color: S.t1, fontFamily: 'monospace' }}>{r.duration}</div>
                <div style={{ fontSize: '10.5px', color: S.t3, marginTop: '2px' }}>{mode.label} · {r.distance}</div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ fontSize: '10.5px', color: S.t3, marginTop: '10px' }}>
        Reistijden via Mapbox Directions API · OV is een schatting
      </div>
    </div>
  )
}