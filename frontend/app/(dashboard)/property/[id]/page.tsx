'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Home, Zap, TrendingUp, Calendar, Ruler,
  ChevronLeft, ChevronRight, Maximize2, X, BarChart2, Cpu,
  Droplets, Wind, Sun, Trees, Building2, Info, Navigation, Footprints
} from 'lucide-react'
import WalkabilityScore from '@/components/property/WalkabilityScore'
import SimilarHomes from '@/components/property/SimilarHomes'
import CommuteCalculator from '@/components/property/CommuteCalculator'
import dynamic from 'next/dynamic'
import PropertyReport from '@/components/report/PropertyReport'

const PropertyMap = dynamic(() => import('@/components/map/PropertyMap'), { ssr: false })

// ── Style constants ────────────────────────────────────────────────
const S = {
  bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#F8FAFB', border: '#E2E5EA',
  t1: '#0B1320', t2: '#44546A', t3: '#8A9BB0',
  green: '#059669', greenLt: '#ECFDF5', greenTx: '#047857', greenRim: 'rgba(5,150,105,0.2)',
  amber: '#D97706', amberLt: '#FFFBEB',
  red: '#DC2626', redLt: '#FEF2F2',
  shadow: '0 1px 3px rgba(11,19,32,0.06)', shadowMd: '0 2px 12px rgba(11,19,32,0.08)',
}

// ── Placeholder gradients until real photos ────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 60%, #a7f3d0 100%)',
  'linear-gradient(135deg, #dbeafe 0%, #93c5fd 60%, #bfdbfe 100%)',
  'linear-gradient(135deg, #fef9c3 0%, #fde047 60%, #fef08a 100%)',
  'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 60%, #ddd6fe 100%)',
]

interface Property {
  id: number; street: string; house_number: string; postal_code: string
  city: string; municipality: string; neighborhood: string | null
  latitude: number; longitude: number; year_built: number | null
  area_m2: number | null; property_type: string; energy_label: string
  woz_value: number | null; woz_year: number | null
  source: string; created_at: string
}

interface ScoreResult {
  score: number; factors: Record<string, number>; explanation: Record<string, string>
  neighborhood: { total_properties: number; avg_price_per_m2: number | null; estimated_rental_yield: number | null; pct_apartments: number; pct_houses: number }
  amenities: { name: string; type: string; distance_m: number }[]
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p)
}

function scoreColor(s: number) { return s >= 70 ? S.green : s >= 50 ? S.amber : S.red }

// ── Label ──────────────────────────────────────────────────────────
const lbl = { fontSize: '10px', fontWeight: 500 as const, color: S.t3, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '4px', display: 'block' }

// ── Section card ──────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, boxShadow: S.shadow, overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(180deg, ${S.surface}, ${S.surface2})` }}>
        {icon && <span style={{ color: S.green }}>{icon}</span>}
        <span style={{ fontSize: '13px', fontWeight: 600, color: S.t1 }}>{title}</span>
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  )
}

// ── WOZ history chart + table ─────────────────────────────────────
function WozHistory({ propertyId }: { propertyId: number }) {
  const [history, setHistory] = useState<{ year: number; price: number }[]>([])
  const [view, setView] = useState<'chart' | 'table'>('chart')

  useEffect(() => {
    fetch(`${API_BASE}/api/properties/${propertyId}/price-history`)
      .then(r => r.json()).then(d => setHistory(d.history || [])).catch(() => {})
  }, [propertyId])

  if (history.length === 0) return <p style={{ fontSize: '13px', color: S.t3 }}>Geen prijshistorie beschikbaar.</p>

  const max = Math.max(...history.map(h => h.price))
  const min = Math.min(...history.map(h => h.price))
  const range = max - min || 1
  const W = 400, H = 90, pad = { t: 8, r: 8, b: 22, l: 8 }
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
  const pts = history.map((h, i) => ({
    x: pad.l + (i / (history.length - 1)) * cw,
    y: pad.t + (1 - (h.price - min) / range) * ch,
    price: h.price, year: h.year,
  }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length-1].x} ${H-pad.b} L ${pts[0].x} ${H-pad.b} Z`
  const pct = ((history[history.length-1].price - history[0].price) / history[0].price * 100).toFixed(0)

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: S.t3 }}>WOZ 2019–2025</span>
        <div style={{ display: 'flex', gap: 0, border: `1px solid ${S.border}` }}>
          {(['chart','table'] as const).map((v,i) => (
            <button key={v} onClick={() => setView(v)} style={{ height: '26px', padding: '0 10px', fontSize: '11px', fontWeight: 500, background: view === v ? S.greenLt : S.surface, color: view === v ? S.greenTx : S.t3, border: 'none', borderRight: i === 0 ? `1px solid ${S.border}` : 'none', cursor: 'pointer' }}>
              {v === 'chart' ? 'Grafiek' : 'Tabel'}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: S.t3 }}>{formatPrice(min)}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: S.green }}>+{pct}% (6 jaar)</span>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: S.t3 }}>{formatPrice(max)}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '80px' }}>
            <defs>
              <linearGradient id="wozFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={S.green} stopOpacity="0.18" />
                <stop offset="100%" stopColor={S.green} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#wozFill)" />
            <path d={pathD} fill="none" stroke={S.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3" fill={S.green} />
                <text x={p.x} y={H-4} textAnchor="middle" fontSize="9" fill={S.t3}>{p.year}</text>
              </g>
            ))}
          </svg>
        </>
      )}

      {view === 'table' && (
        <div style={{ border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: S.surface2, borderBottom: `1px solid ${S.border}`, padding: '6px 12px' }}>
            {['Jaar','WOZ-waarde','Mutatie'].map(h => <span key={h} style={{ fontSize: '10px', fontWeight: 500, color: S.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>)}
          </div>
          {history.map((h, i) => {
            const prev = i > 0 ? history[i-1].price : null
            const delta = prev ? ((h.price - prev) / prev * 100).toFixed(1) : null
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 12px', borderBottom: i < history.length - 1 ? `1px solid ${S.border}` : 'none', background: i % 2 === 0 ? S.surface : S.surface2 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12.5px', color: S.t1 }}>{h.year}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12.5px', color: S.t1 }}>{formatPrice(h.price)}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: delta && parseFloat(delta) > 0 ? S.green : S.red, fontWeight: 500 }}>
                  {delta ? `${parseFloat(delta) > 0 ? '+' : ''}${delta}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 3D Volume calculator ──────────────────────────────────────────
function VolumeCalculator({ area_m2, year_built }: { area_m2: number | null; year_built: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode,    setMode]    = useState<'house' | 'apartment'>('house')
  const [w,       setW]       = useState(area_m2 ? Math.sqrt(area_m2 * 0.75) : 9)
  const [d,       setD]       = useState(area_m2 ? Math.sqrt(area_m2 * 1.33) : 12)
  const [floors,  setFloors]  = useState(2)
  const [ch,      setCh]      = useState(year_built && year_built < 1970 ? 2.8 : 2.6)
  const [pitch,   setPitch]   = useState(35)
  const [floor,   setFloor]   = useState(3)
  const [totalF,  setTotalF]  = useState(8)
  const [angle,   setAngle]   = useState(0.52)
  const [tilt,    setTilt]    = useState(0.35)
  const drag = useRef({ active: false, lx: 0, ly: 0 })

  const wallH = floors * ch
  const roofH = mode === 'house' ? (d / 2) * Math.tan(pitch * Math.PI / 180) : 0
  const floorArea = w * d
  const totalArea = floorArea * floors
  const totalVol = w * d * wallH + (mode === 'house' ? 0.5 * d * roofH * w : 0)

  function project(x: number, y: number, z: number, cx: number, cy: number, scale: number): [number, number] {
    const rx = x * Math.cos(angle) - y * Math.sin(angle)
    const ry = x * Math.sin(angle) + y * Math.cos(angle)
    return [cx + rx * scale, cy - z * scale + ry * scale * tilt]
  }

  function drawFace(ctx: CanvasRenderingContext2D, pts: [number,number][], fill: string, stroke: string) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
    pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]))
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
    ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke()
  }

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = S.surface2; ctx.fillRect(0, 0, W, H)

    const maxDim = Math.max(w, d, wallH + roofH + 2)
    const scale = Math.min(W, H) / (maxDim * 2.8)
    const cx = W * 0.5, cy = H * 0.58
    const hw = w / 2, hd = d / 2
    const str = 'rgba(11,19,32,0.1)'

    // Grid
    const gs = Math.max(w, d) * 1.5, gn = 6
    ctx.strokeStyle = 'rgba(11,19,32,0.05)'; ctx.lineWidth = 0.5
    for (let i = -gn; i <= gn; i++) {
      const x = (i / gn) * gs
      const [ax,ay] = project(x, -gs, 0, cx, cy, scale); const [bx,by] = project(x, gs, 0, cx, cy, scale)
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke()
      const [cx2,cy2] = project(-gs, x, 0, cx, cy, scale); const [dx2,dy2] = project(gs, x, 0, cx, cy, scale)
      ctx.beginPath(); ctx.moveTo(cx2,cy2); ctx.lineTo(dx2,dy2); ctx.stroke()
    }

    if (mode === 'apartment') {
      for (let f = 0; f < totalF; f++) {
        const z0 = f * ch, z1 = (f+1) * ch, mine = f === floor - 1
        const alpha = mine ? 0.85 : 0.15
        const c = (a: number) => `rgba(5,150,105,${a})`
        const corners = [[-hw,-hd,z0],[hw,-hd,z0],[hw,hd,z0],[-hw,hd,z0],[-hw,-hd,z1],[hw,-hd,z1],[hw,hd,z1],[-hw,hd,z1]]
          .map(([x,y,z]) => project(x,y,z,cx,cy,scale)) as [number,number][]
        drawFace(ctx, [corners[4],corners[5],corners[6],corners[7]], c(alpha*0.5), str)
        drawFace(ctx, [corners[1],corners[5],corners[6],corners[2]], c(alpha*0.65), str)
        drawFace(ctx, [corners[0],corners[1],corners[5],corners[4]], c(alpha*0.8), str)
        if (mine) {
          const wc = 'rgba(100,180,255,0.75)'
          const midX = (corners[0][0]+corners[1][0])/2, midY = (corners[0][1]+corners[4][1])/2
          const ww = Math.abs(corners[1][0]-corners[0][0])*0.15, wh = Math.abs(corners[4][1]-corners[0][1])*0.5
          ctx.fillStyle = wc
          ctx.fillRect(midX - ww*1.8, midY-wh/2, ww, wh)
          ctx.fillRect(midX + ww*0.8, midY-wh/2, ww, wh)
        }
      }
    } else {
      const corners = [[-hw,-hd,0],[hw,-hd,0],[hw,hd,0],[-hw,hd,0],[-hw,-hd,wallH],[hw,-hd,wallH],[hw,hd,wallH],[-hw,hd,wallH]]
        .map(([x,y,z]) => project(x,y,z,cx,cy,scale)) as [number,number][]
      drawFace(ctx, [corners[4],corners[5],corners[6],corners[7]], 'rgba(5,150,105,0.45)', str)
      drawFace(ctx, [corners[1],corners[5],corners[6],corners[2]], 'rgba(5,150,105,0.55)', str)
      drawFace(ctx, [corners[0],corners[1],corners[5],corners[4]], 'rgba(5,150,105,0.65)', str)
      if (pitch > 0) {
        const rL = project(-hw, 0, wallH + roofH, cx, cy, scale)
        const rR = project(hw,  0, wallH + roofH, cx, cy, scale)
        const rc = 'rgba(83,74,183,0.65)'
        drawFace(ctx, [corners[4],corners[5],rR,rL], rc, str)
        drawFace(ctx, [corners[6],corners[7],rL,rR], rc, str)
        drawFace(ctx, [corners[5],corners[6],rR], rc, str)
        drawFace(ctx, [corners[4],corners[7],rL], rc, str)
      }
      // Windows
      for (let f = 0; f < floors; f++) {
        const z0 = f*ch+ch*0.15, z1 = (f+1)*ch-ch*0.15
        const p0 = project(-hw*0.3, -hd, z0, cx, cy, scale)
        const p1 = project( hw*0.3, -hd, z1, cx, cy, scale)
        const ww = Math.abs(p1[0]-p0[0])*0.4, wh = Math.abs(p1[1]-p0[1])
        const mx = (p0[0]+p1[0])/2
        ctx.fillStyle = 'rgba(100,180,255,0.6)'
        ctx.fillRect(mx-ww, p0[1], ww*0.85, wh)
        ctx.fillRect(mx+ww*0.15, p0[1], ww*0.85, wh)
      }
    }

    ctx.fillStyle = S.t3; ctx.font = '10px sans-serif'
    ctx.fillText('↔ Sleep om te draaien', 8, H - 8)
  }, [w, d, floors, ch, pitch, floor, totalF, angle, tilt, mode, wallH, roofH])

  function onMouseDown(e: React.MouseEvent) { drag.current = { active: true, lx: e.clientX, ly: e.clientY } }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active) return
    setAngle(a => a + (e.clientX - drag.current.lx) * 0.012)
    setTilt(t => Math.max(0.1, Math.min(0.8, t + (e.clientY - drag.current.ly) * 0.006)))
    drag.current = { active: true, lx: e.clientX, ly: e.clientY }
  }
  function onMouseUp() { drag.current.active = false }

  const sliderStyle = { width: '100%', accentColor: S.green }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, border: `1px solid ${S.border}`, width: 'fit-content', marginBottom: '14px' }}>
        {(['house','apartment'] as const).map((m,i) => (
          <button key={m} onClick={() => setMode(m)} style={{ height: '28px', padding: '0 12px', fontSize: '12px', fontWeight: 500, background: mode === m ? S.greenLt : S.surface, color: mode === m ? S.greenTx : S.t3, border: 'none', borderRight: i === 0 ? `1px solid ${S.border}` : 'none', cursor: 'pointer' }}>
            {m === 'house' ? 'Woning' : 'Appartement'}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={480} height={260}
        style={{ width: '100%', height: '220px', cursor: 'grab', display: 'block', border: `1px solid ${S.border}` }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} />

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginTop: '14px' }}>
        <div><label style={lbl}>Breedte: <strong>{w.toFixed(1)} m</strong></label><input type="range" min={4} max={20} step={0.5} value={w} onChange={e => setW(+e.target.value)} style={sliderStyle}/></div>
        <div><label style={lbl}>Diepte: <strong>{d.toFixed(1)} m</strong></label><input type="range" min={4} max={20} step={0.5} value={d} onChange={e => setD(+e.target.value)} style={sliderStyle}/></div>
        <div><label style={lbl}>Verdiepingen: <strong>{floors}</strong></label><input type="range" min={1} max={4} step={1} value={floors} onChange={e => setFloors(+e.target.value)} style={sliderStyle}/></div>
        <div><label style={lbl}>Hoogte/verd.: <strong>{ch.toFixed(1)} m</strong></label><input type="range" min={2.2} max={3.5} step={0.1} value={ch} onChange={e => setCh(+e.target.value)} style={sliderStyle}/></div>
        {mode === 'house' && <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Dakhelling: <strong>{pitch}°</strong></label><input type="range" min={0} max={50} step={5} value={pitch} onChange={e => setPitch(+e.target.value)} style={sliderStyle}/></div>}
        {mode === 'apartment' && <>
          <div><label style={lbl}>Mijn etage: <strong>{floor}</strong></label><input type="range" min={1} max={totalF} step={1} value={floor} onChange={e => setFloor(+e.target.value)} style={sliderStyle}/></div>
          <div><label style={lbl}>Totaal etages: <strong>{totalF}</strong></label><input type="range" min={3} max={30} step={1} value={totalF} onChange={e => setTotalF(+e.target.value)} style={sliderStyle}/></div>
        </>}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '14px' }}>
        {[
          { val: `${totalArea.toFixed(0)} m²`, lbl: 'Woonoppervlak' },
          { val: `${totalVol.toFixed(0)} m³`, lbl: 'Inhoud' },
          { val: `${(wallH + roofH * 0.5).toFixed(1)} m`, lbl: 'Totale hoogte' },
          mode === 'apartment'
            ? { val: `${((floor-1)*ch).toFixed(1)} m`, lbl: 'Hoogte v. grond' }
            : { val: `${(totalVol/totalArea).toFixed(1)} m`, lbl: 'Gem. hoogte' },
        ].map((s,i) => (
          <div key={i} style={{ background: S.surface2, border: `1px solid ${S.border}`, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 500, color: S.t1 }}>{s.val}</div>
            <div style={{ fontSize: '10px', color: S.t3, marginTop: '2px' }}>{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Spec sheet ────────────────────────────────────────────────────
function SpecSheet({ property }: { property: Property }) {
  const labelColor = (label: string) => {
    const colors: Record<string,string> = { A:'#059669','A+':'#047857','A++':'#065f46', B:'#16a34a', C:'#ca8a04', D:'#d97706', E:'#ea580c', F:'#dc2626', G:'#991b1b' }
    return colors[label] || S.t3
  }
  const sections = [
    {
      title: 'Overdracht',
      rows: [
        ['Status', 'Beschikbaar'],
        ['Aanvaarding', 'In overleg'],
        ['Eigendomssituatie', 'Vol eigendom'],
      ]
    },
    {
      title: 'Bouw',
      rows: [
        ['Type', property.property_type || '—'],
        ['Bouwjaar', property.year_built ? String(property.year_built) : '—'],
        ['Bouwperiode', property.year_built ? getBouwperiode(property.year_built) : '—'],
      ]
    },
    {
      title: 'Afmetingen',
      rows: [
        ['Woonoppervlak', property.area_m2 ? `${property.area_m2} m²` : '—'],
        ['Perceeloppervlak', '—'],
        ['Inhoud', property.area_m2 ? `${Math.round(property.area_m2 * 2.6)} m³ (geschat)` : '—'],
      ]
    },
    {
      title: 'Energie',
      rows: [
        ['Energielabel', property.energy_label && property.energy_label !== 'unknown' ? property.energy_label : '—'],
        ['Verwarming', '—'],
        ['Warm water', '—'],
      ],
      special: { key: 'Energielabel', color: labelColor(property.energy_label) }
    },
    {
      title: 'Kadastrale gegevens',
      rows: [
        ['Gemeente', property.municipality || property.city],
        ['Postcode', property.postal_code || '—'],
        ['Databron', 'BAG / PDOK'],
      ]
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sections.map(sec => (
        <div key={sec.title} style={{ border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '7px 14px', background: S.surface2, borderBottom: `1px solid ${S.border}`, fontSize: '10.5px', fontWeight: 500, color: S.t2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {sec.title}
          </div>
          {sec.rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: i < sec.rows.length-1 ? `1px solid ${S.border}` : 'none', background: i % 2 === 0 ? S.surface : S.surface2 }}>
              <span style={{ fontSize: '12.5px', color: S.t2 }}>{row[0]}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: sec.special?.key === row[0] ? sec.special.color : S.t1 }}>
                {row[1]}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function getBouwperiode(year: number): string {
  if (year < 1906) return 'Voor 1906'
  if (year < 1931) return '1906–1930'
  if (year < 1945) return '1931–1944'
  if (year < 1960) return '1945–1959'
  if (year < 1971) return '1960–1970'
  if (year < 1981) return '1971–1980'
  if (year < 1991) return '1981–1990'
  if (year < 2001) return '1991–2000'
  if (year < 2011) return '2001–2010'
  if (year < 2021) return '2011–2020'
  return 'Na 2020'
}

// ── Main page ─────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [property,    setProperty]    = useState<Property | null>(null)
  const [score,       setScore]       = useState<ScoreResult | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [photoIdx,    setPhotoIdx]    = useState(0)
  const [fullscreen,  setFullscreen]  = useState(false)
  const [activeTab,   setActiveTab]   = useState<'overview'|'specs'|'3d'|'mobility'|'similar'|'map'>('overview')

  useEffect(() => { if (id) loadProperty() }, [id])

  async function loadProperty() {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/api/properties/${id}`)
      if (!res.ok) { setError('Woning niet gevonden.'); return }
      const prop = await res.json()
      setProperty(prop)
      const res2 = await fetch(`${API_BASE}/api/analytics/score?address=${encodeURIComponent(`${prop.street} ${prop.house_number} ${prop.city}`)}&radius=2.0`)
      if (res2.ok) setScore(await res2.json())
    } catch { setError('Kan geen verbinding maken met de server.') }
    finally   { setLoading(false) }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: S.t3, fontSize: '13px' }}>Laden...</span></div>
  if (error || !property) return <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ color: S.red, fontSize: '13px', marginBottom: '12px' }}>{error || 'Woning niet gevonden'}</div><Link href="/dashboard" style={{ color: S.green, fontSize: '13px' }}>Terug naar dashboard</Link></div></div>

  const mapProps = [{ id: property.id, street: property.street, house_number: property.house_number, city: property.city, latitude: property.latitude, longitude: property.longitude, woz_value: property.woz_value, area_m2: property.area_m2, property_type: property.property_type }]

  const photos = GRADIENTS // placeholder until R2

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Fullscreen gallery overlay */}
      {fullscreen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,19,32,0.96)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setFullscreen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.7 }}><X size={24} /></button>
          <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} style={{ position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '12px', borderRadius: '50%' }}><ChevronLeft size={20} /></button>
          <div style={{ width: '80vw', height: '70vh', background: photos[photoIdx], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.3 }}>
              <Home size={48} color="white" />
              <span style={{ color: 'white', fontSize: '13px' }}>Foto {photoIdx + 1} / {photos.length}</span>
            </div>
          </div>
          <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '12px', borderRadius: '50%' }}><ChevronRight size={20} /></button>
          <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '8px' }}>
            {photos.map((_,i) => <div key={i} style={{ width: i === photoIdx ? '24px' : '8px', height: '8px', background: i === photoIdx ? S.green : 'rgba(255,255,255,0.3)', borderRadius: '4px', transition: 'all 0.2s' }} />)}
          </div>
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: S.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.t3, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
            <ArrowLeft size={15} /> Terug
          </button>
          <span style={{ color: S.border }}>·</span>
          <span style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1 }}>{property.street} {property.house_number}</span>
          <span style={{ fontSize: '12px', color: S.t3 }}>{property.postal_code} {property.city}</span>
        </div>
        {score && (
          <PropertyReport property={{ id: property.id, street: property.street, house_number: property.house_number, postal_code: property.postal_code, city: property.city, area_m2: property.area_m2, year_built: property.year_built, property_type: property.property_type, energy_label: property.energy_label, woz_value: property.woz_value }} score={score} />
        )}
      </nav>

      {/* ── PHOTO GALLERY HERO ── */}
      <div style={{ position: 'relative', height: '440px', background: photos[photoIdx], overflow: 'hidden' }}>
        {/* Placeholder icon */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.25 }}>
            <Home size={56} color={S.t1} />
            <span style={{ fontSize: '13px', color: S.t1 }}>Foto's worden binnenkort toegevoegd</span>
          </div>
        </div>

        {/* Fullscreen button */}
        <button onClick={() => setFullscreen(true)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.85)', border: `1px solid ${S.border}`, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: S.t1, boxShadow: S.shadow }}>
          <Maximize2 size={13} /> Volledig scherm
        </button>

        {/* Prev / Next */}
        {photos.length > 1 && <>
          <button onClick={() => setPhotoIdx(i => (i-1+photos.length)%photos.length)} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: `1px solid ${S.border}`, padding: '8px', cursor: 'pointer', boxShadow: S.shadow }}>
            <ChevronLeft size={18} color={S.t1} />
          </button>
          <button onClick={() => setPhotoIdx(i => (i+1)%photos.length)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: `1px solid ${S.border}`, padding: '8px', cursor: 'pointer', boxShadow: S.shadow }}>
            <ChevronRight size={18} color={S.t1} />
          </button>
        </>}

        {/* Bottom overlay — address + thumbnails */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, transparent 100%)', padding: '40px 32px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 600, color: S.t1, marginBottom: '4px', letterSpacing: '-0.5px' }}>
                {property.street} {property.house_number}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: S.t2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} />{property.postal_code} {property.city}</span>
                {property.neighborhood && <span>· {property.neighborhood}</span>}
                {property.area_m2 && <span>· {property.area_m2} m²</span>}
                {property.year_built && <span>· Bouwjaar {property.year_built}</span>}
              </div>
            </div>

            {/* Thumbnails */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {photos.map((g,i) => (
                <button key={i} onClick={() => setPhotoIdx(i)} style={{ width: '52px', height: '38px', background: g, border: i === photoIdx ? `2px solid ${S.green}` : `2px solid rgba(255,255,255,0.6)`, cursor: 'pointer', transition: 'border-color 0.15s', boxShadow: S.shadow }} />
              ))}
              <div style={{ width: '52px', height: '38px', background: 'rgba(255,255,255,0.9)', border: `2px dashed ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', color: S.t3, textAlign: 'center', lineHeight: 1.2 }}>+<br/>foto</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score badge */}
        {score && (
          <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.92)', border: `1px solid ${S.border}`, padding: '10px 14px', boxShadow: S.shadowMd, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '32px', fontWeight: 500, color: scoreColor(score.score), lineHeight: 1 }}>{score.score}</span>
            <span style={{ fontSize: '12px', color: S.t3, fontFamily: 'monospace' }}>/100</span>
          </div>
        )}
      </div>

      {/* ── QUICK SPECS BAR ── */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, boxShadow: S.shadow }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' }}>
          {[
            { icon: <Home size={14}/>,     label: 'Type',         value: property.property_type || '—' },
            { icon: <Ruler size={14}/>,    label: 'Oppervlak',    value: property.area_m2 ? `${property.area_m2} m²` : '—' },
            { icon: <Calendar size={14}/>, label: 'Bouwjaar',     value: property.year_built ? String(property.year_built) : '—' },
            { icon: <Zap size={14}/>,      label: 'Energielabel', value: property.energy_label !== 'unknown' ? property.energy_label : '—' },
            { icon: <TrendingUp size={14}/>, label: 'WOZ-waarde', value: property.woz_value ? formatPrice(property.woz_value) : '—' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '14px 0', textAlign: 'center', borderRight: i < 4 ? `1px solid ${S.border}` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <span style={{ color: S.green }}>{item.icon}</span>
              <span style={{ fontSize: '10px', color: S.t3 }}>{item.label}</span>
              <span style={{ fontSize: '13.5px', fontWeight: 500, color: S.t1 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, position: 'sticky', top: '56px', zIndex: 90, boxShadow: S.shadow }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px', display: 'flex' }}>
          {([
            { key: 'overview',  label: 'Overzicht' },
            { key: 'specs',     label: 'Specificaties' },
            { key: '3d',        label: '3D Volume' },
            { key: 'mobility',  label: 'Bereikbaarheid' },
            { key: 'similar',   label: 'Vergelijkbaar' },
            { key: 'map',       label: 'Kaart' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ height: '44px', padding: '0 16px', fontSize: '13.5px', fontWeight: activeTab === tab.key ? 500 : 400, color: activeTab === tab.key ? S.t1 : S.t3, background: 'none', border: 'none', borderBottom: activeTab === tab.key ? `2px solid ${S.green}` : '2px solid transparent', cursor: 'pointer', marginBottom: '-1px', transition: 'color 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 32px 48px' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
            <div>
              <Section title="WOZ-waarde & prijsontwikkeling" icon={<TrendingUp size={14}/>}>
                {property.woz_value && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '28px', fontWeight: 500, color: S.t1 }}>{formatPrice(property.woz_value)}</span>
                    <span style={{ fontSize: '12px', color: S.t3 }}>peildatum {property.woz_year || '—'}</span>
                  </div>
                )}
                <WozHistory propertyId={property.id} />
              </Section>

              {score && score.amenities.length > 0 && (
                <Section title="Voorzieningen in de buurt" icon={<MapPin size={14}/>}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    {score.amenities.map((a,i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${S.border}`, fontSize: '13px' }}>
                        <span style={{ color: S.t2 }}>{a.name}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: S.green, fontWeight: 500 }}>
                          {a.distance_m < 1000 ? `${Math.round(a.distance_m)}m` : `${(a.distance_m/1000).toFixed(1)}km`}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>

            <div>
              {score && (
                <Section title="Score breakdown" icon={<BarChart2 size={14}/>}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(score.factors).map(([key, value]) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: S.t2, textTransform: 'capitalize' }}>{key.replace('_',' ')}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: scoreColor(value) }}>{value}</span>
                        </div>
                        <div style={{ height: '4px', background: S.border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${value}%`, background: scoreColor(value), transition: 'width 0.7s' }} />
                        </div>
                        {score.explanation[key] && <div style={{ fontSize: '11px', color: S.t3, marginTop: '3px', lineHeight: 1.4 }}>{score.explanation[key]}</div>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {score && (
                <Section title="Buurtanalyse (2km)" icon={<Info size={14}/>}>
                  {[
                    { label: 'Woningen',      value: String(score.neighborhood.total_properties) },
                    { label: 'Gem. prijs/m²', value: score.neighborhood.avg_price_per_m2 ? `€${Math.round(score.neighborhood.avg_price_per_m2)}` : '—' },
                    { label: 'Rendement',     value: score.neighborhood.estimated_rental_yield ? `${score.neighborhood.estimated_rental_yield.toFixed(1)}%` : '—' },
                    { label: 'Appartementen', value: `${score.neighborhood.pct_apartments.toFixed(0)}%` },
                    { label: 'Woningen %',    value: `${score.neighborhood.pct_houses.toFixed(0)}%` },
                  ].map((item,i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? `1px solid ${S.border}` : 'none' }}>
                      <span style={{ fontSize: '12.5px', color: S.t2 }}>{item.label}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: S.t1, fontWeight: 500 }}>{item.value}</span>
                    </div>
                  ))}
                </Section>
              )}

              <Section title="Databron">
                <p style={{ fontSize: '12px', color: S.t3, lineHeight: 1.6 }}>
                  Data afkomstig uit de Basisregistratie Adressen en Gebouwen (BAG) via PDOK.
                  Bijgewerkt op {new Date(property.created_at).toLocaleDateString('nl-NL')}.
                </p>
              </Section>
            </div>
          </div>
        )}

        {/* SPECS TAB */}
        {activeTab === 'specs' && (
          <div style={{ maxWidth: '680px' }}>
            <SpecSheet property={property} />
          </div>
        )}

        {/* 3D TAB */}
        {activeTab === '3d' && (
          <div style={{ maxWidth: '680px' }}>
            <Section title="3D Volume calculator" icon={<Cpu size={14}/>}>
              <p style={{ fontSize: '12.5px', color: S.t2, marginBottom: '16px', lineHeight: 1.6 }}>
                Pas de afmetingen aan om een idee te krijgen van het volume van de woning.
                Pre-ingevuld op basis van het woonoppervlak en bouwjaar uit het BAG-register.
                Sleep de 3D-weergave om te draaien.
              </p>
              <VolumeCalculator area_m2={property.area_m2} year_built={property.year_built} />
            </Section>
          </div>
        )}

        {/* MOBILITY TAB */}
        {activeTab === 'mobility' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '900px' }}>
            <Section title="Loopbaarheid / OV / Fiets" icon={<Footprints size={14}/>}>
              <WalkabilityScore propertyId={property.id} />
            </Section>
            <Section title="Reistijd berekenen" icon={<Navigation size={14}/>}>
              <CommuteCalculator latitude={property.latitude} longitude={property.longitude} />
            </Section>
          </div>
        )}

        {/* SIMILAR TAB */}
        {activeTab === 'similar' && (
          <div>
            <p style={{ fontSize: '13px', color: '#8A9BB0', marginBottom: '20px' }}>
              Vergelijkbare woningen in de buurt — zelfde type, vergelijkbare prijs, binnen 3km.
            </p>
            <SimilarHomes propertyId={property.id} />
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <div>
            <div style={{ height: '500px', border: `1px solid ${S.border}`, boxShadow: S.shadow }}>
              <PropertyMap properties={mapProps} center={[property.longitude, property.latitude]} zoom={15} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}