'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import { Footprints, Bus, Bike } from 'lucide-react'

const S = {
  surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', red: '#DC2626',
}

function scoreColor(s: number) {
  if (s >= 70) return S.green
  if (s >= 45) return S.amber
  return S.red
}

function ScoreCircle({ score, icon, label }: { score: number; icon: React.ReactNode; label: string }) {
  const color = scoreColor(score)
  const r = 28, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke={S.border} strokeWidth="5" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
            strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' }}>
          <span style={{ color }}>{icon}</span>
          <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color, lineHeight: 1 }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: '11px', fontWeight: 500, color: S.t2 }}>{label}</span>
    </div>
  )
}

export default function WalkabilityScore({ propertyId }: { propertyId: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/properties/${propertyId}/walkability`)
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [propertyId])

  if (loading) return <div style={{ fontSize: '12px', color: S.t3 }}>Laden...</div>
  if (!data) return <div style={{ fontSize: '12px', color: S.t3 }}>Geen data beschikbaar.</div>

  return (
    <div>
      {/* Score circles */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0 16px' }}>
        <ScoreCircle score={data.walk_score}    icon={<Footprints size={13}/>} label="Loopbaarheid" />
        <ScoreCircle score={data.transit_score} icon={<Bus size={13}/>}        label="OV" />
        <ScoreCircle score={data.bike_score}    icon={<Bike size={13}/>}       label="Fiets" />
      </div>

      {/* Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '14px' }}>
        {[
          { label: data.labels.walk,    color: scoreColor(data.walk_score) },
          { label: data.labels.transit, color: scoreColor(data.transit_score) },
          { label: data.labels.bike,    color: scoreColor(data.bike_score) },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '5px', background: S.surface2, border: `1px solid ${S.border}` }}>
            <span style={{ fontSize: '10px', fontWeight: 500, color: item.color }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Nearest amenities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {[
          { key: 'transit',     label: 'OV-halte' },
          { key: 'supermarket', label: 'Supermarkt' },
          { key: 'school',      label: 'School' },
          { key: 'park',        label: 'Park' },
        ].map((item, i) => {
          const n = data.nearest[item.key]
          if (!n) return null
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${S.border}`, fontSize: '12.5px' }}>
              <span style={{ color: S.t2 }}>{n.name} <span style={{ color: S.t3, fontSize: '11px' }}>· {item.label}</span></span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: S.green, fontWeight: 500 }}>{n.distance}</span>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: '10.5px', color: S.t3, marginTop: '10px' }}>
        Berekend op basis van OpenStreetMap ameniteiten via PostGIS
      </div>
    </div>
  )
}