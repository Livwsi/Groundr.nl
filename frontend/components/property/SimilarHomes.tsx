'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Home } from 'lucide-react'

const S = {
  surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  shadow: '0 1px 3px rgba(11,19,32,0.06)',
}

const GRADIENTS = [
  'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)',
  'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
  'linear-gradient(135deg, #fef9c3 0%, #fde047 100%)',
  'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%)',
  'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)',
  'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
]

function formatPrice(p: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p)
}

export default function SimilarHomes({ propertyId }: { propertyId: number }) {
  const router = useRouter()
  const [homes,   setHomes]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/properties/${propertyId}/similar`)
      .then(r => r.json()).then(d => setHomes(d.similar || [])).catch(() => {}).finally(() => setLoading(false))
  }, [propertyId])

  if (loading) return <div style={{ fontSize: '12px', color: S.t3 }}>Laden...</div>
  if (homes.length === 0) return <div style={{ fontSize: '12px', color: S.t3 }}>Geen vergelijkbare woningen gevonden in de buurt.</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      {homes.map((h, i) => (
        <div key={h.id} onClick={() => router.push(`/property/${h.id}`)}
          style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 16px rgba(5,150,105,0.1)'; el.style.borderColor = S.greenRim }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = S.shadow; el.style.borderColor = S.border }}>

          {/* Image placeholder */}
          <div style={{ height: '90px', background: GRADIENTS[i % GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Home size={28} color="rgba(0,0,0,0.12)" />
          </div>

          {/* Body */}
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: S.t1, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {h.street} {h.house_number}
            </div>
            <div style={{ fontSize: '11px', color: S.t3, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MapPin size={9} />{h.city}
            </div>
            {h.woz_value && (
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500, color: S.t1 }}>
                {formatPrice(h.woz_value)}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px', color: S.t3 }}>
              {h.area_m2 && <span>{h.area_m2} m²</span>}
              {h.year_built && <span>· {h.year_built}</span>}
              <span style={{ color: S.greenTx, marginLeft: 'auto' }}>
                {h.distance_m < 1000 ? `${h.distance_m}m` : `${(h.distance_m/1000).toFixed(1)}km`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}