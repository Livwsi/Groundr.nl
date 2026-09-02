'use client'

import { useState } from 'react'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'

const S = {
  surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  shadow: '0 1px 3px rgba(11,19,32,0.06)', shadowMd: '0 4px 16px rgba(11,19,32,0.1)',
}

export interface Filters {
  min_price:     number | null
  max_price:     number | null
  min_area:      number | null
  max_area:      number | null
  property_type: string | null
  energy_label:  string | null
  min_year:      number | null
  max_year:      number | null
}

const EMPTY: Filters = {
  min_price: null, max_price: null,
  min_area: null,  max_area: null,
  property_type: null, energy_label: null,
  min_year: null,  max_year: null,
}

const PROP_TYPES = [
  { value: 'house',         label: 'Woning' },
  { value: 'apartment',     label: 'Appartement' },
  { value: 'villa',         label: 'Villa' },
  { value: 'townhouse',     label: 'Tussenwoning' },
  { value: 'semi_detached', label: '2-onder-1-kap' },
  { value: 'detached',      label: 'Vrijstaand' },
]

const ENERGY_LABELS = ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']

const inp = {
  width: '100%', height: '36px', padding: '0 10px',
  background: S.surface, border: `1px solid ${S.border}`,
  fontFamily: 'inherit', fontSize: '13px', color: S.t1, outline: 'none',
}

const lbl = {
  fontSize: '10.5px', fontWeight: 500 as const, color: S.t3,
  textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '5px',
}

function countActive(f: Filters): number {
  return Object.values(f).filter(v => v !== null && v !== '').length
}

export default function SearchFilters({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const [open, setOpen] = useState(false)
  const active = countActive(filters)

  function set(key: keyof Filters, val: string) {
    const parsed = ['min_price','max_price','min_area','max_area','min_year','max_year'].includes(key)
      ? (val === '' ? null : parseInt(val)) : (val === '' ? null : val)
    onChange({ ...filters, [key]: parsed })
  }

  function reset() { onChange(EMPTY) }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        height: '38px', padding: '0 14px',
        background: active > 0 ? S.greenLt : S.surface,
        color: active > 0 ? S.greenTx : S.t2,
        border: `1px solid ${active > 0 ? S.greenRim : S.border}`,
        fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        boxShadow: S.shadow,
      }}>
        <SlidersHorizontal size={14} />
        {active > 0 ? `Filters (${active})` : 'Filters'}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '44px', left: 0, zIndex: 200,
          background: S.surface, border: `1px solid ${S.border}`,
          boxShadow: S.shadowMd, padding: '20px', width: '420px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: S.t1 }}>Zoekfilters</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {active > 0 && (
                <button onClick={reset} style={{ fontSize: '12px', color: S.t3, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <X size={12} /> Reset
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3 }}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            {/* Price range */}
            <div>
              <label style={lbl}>Min. prijs (€)</label>
              <input type="number" value={filters.min_price ?? ''} onChange={e => set('min_price', e.target.value)} placeholder="200.000" style={inp}
                onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
            </div>
            <div>
              <label style={lbl}>Max. prijs (€)</label>
              <input type="number" value={filters.max_price ?? ''} onChange={e => set('max_price', e.target.value)} placeholder="600.000" style={inp}
                onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
            </div>

            {/* Area range */}
            <div>
              <label style={lbl}>Min. oppervlak (m²)</label>
              <input type="number" value={filters.min_area ?? ''} onChange={e => set('min_area', e.target.value)} placeholder="60" style={inp}
                onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
            </div>
            <div>
              <label style={lbl}>Max. oppervlak (m²)</label>
              <input type="number" value={filters.max_area ?? ''} onChange={e => set('max_area', e.target.value)} placeholder="200" style={inp}
                onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
            </div>

            {/* Year range */}
            <div>
              <label style={lbl}>Bouwjaar vanaf</label>
              <input type="number" value={filters.min_year ?? ''} onChange={e => set('min_year', e.target.value)} placeholder="1990" style={inp}
                onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
            </div>
            <div>
              <label style={lbl}>Bouwjaar tot</label>
              <input type="number" value={filters.max_year ?? ''} onChange={e => set('max_year', e.target.value)} placeholder="2024" style={inp}
                onFocus={e => (e.target.style.borderColor = S.green)} onBlur={e => (e.target.style.borderColor = S.border)} />
            </div>

            {/* Property type */}
            <div>
              <label style={lbl}>Type woning</label>
              <select value={filters.property_type ?? ''} onChange={e => set('property_type', e.target.value)} style={inp}>
                <option value="">Alle types</option>
                {PROP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Energy label */}
            <div>
              <label style={lbl}>Energielabel</label>
              <select value={filters.energy_label ?? ''} onChange={e => set('energy_label', e.target.value)} style={inp}>
                <option value="">Alle labels</option>
                {ENERGY_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

          </div>

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${S.border}`, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setOpen(false)} style={{ height: '34px', padding: '0 18px', background: S.green, color: 'white', border: `1px solid ${S.green}`, fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              Toepassen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}