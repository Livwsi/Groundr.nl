'use client'

import { useState } from 'react'
import { FileText, Loader } from 'lucide-react'

interface Property {
  id:            number
  street:        string
  house_number:  string
  postal_code:   string
  city:          string
  area_m2:       number | null
  year_built:    number | null
  property_type: string
  energy_label:  string
  woz_value:     number | null
}

interface ScoreResult {
  score:       number
  factors:     Record<string, number>
  explanation: Record<string, string>
  neighborhood: {
    total_properties:       number
    avg_price_per_m2:       number | null
    estimated_rental_yield: number | null
    pct_apartments:         number
    pct_houses:             number
  }
  amenities: { name: string; type: string; distance_m: number }[]
}

interface Props {
  property: Property
  score:    ScoreResult
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price)
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Uitstekend'
  if (score >= 60) return 'Goed'
  if (score >= 50) return 'Neutraal'
  if (score >= 35) return 'Matig'
  return 'Zwak'
}

export default function PropertyReport({ property, score }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function generatePDF() {
    const { jsPDF } = await import('jspdf')
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW  = 210
    const margin = 20
    const colW   = pageW - margin * 2
    let   y      = margin

    // Header
    doc.setFillColor(14, 59, 40)
    doc.rect(0, 0, pageW, 32, 'F')
    doc.setTextColor(47, 197, 134)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Groundr', margin, 14)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Vastgoed Intelligentie Rapport', margin, 22)
    doc.setTextColor(113, 221, 175)
    doc.setFontSize(8)
    doc.text(
      new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
      pageW - margin, 22, { align: 'right' }
    )

    y = 44

    // Title
    doc.setTextColor(14, 59, 40)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(`${property.street} ${property.house_number}`, margin, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 130, 110)
    doc.text(`${property.postal_code} ${property.city}`, margin, y)
    y += 12

    // Score badge
    const sc = score.score >= 70 ? [47, 197, 134] :
               score.score >= 50 ? [196, 124, 26] : [184, 64, 51]
    doc.setFillColor(...sc as [number, number, number])
    doc.roundedRect(margin, y, 50, 18, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`${score.score}/100`, margin + 10, y + 8)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(scoreLabel(score.score), margin + 10, y + 14)
    y += 26

    // Divider
    doc.setDrawColor(220, 240, 230)
    doc.line(margin, y, pageW - margin, y)
    y += 8

    // Specs
    doc.setTextColor(14, 59, 40)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Kenmerken', margin, y)
    y += 6

    const specs = [
      ['Type',         property.property_type || '—'],
      ['Oppervlak',    property.area_m2 ? `${property.area_m2} m2` : '—'],
      ['Bouwjaar',     String(property.year_built || '—')],
      ['Energielabel', property.energy_label !== 'unknown' ? property.energy_label : '—'],
      ['WOZ-waarde',   property.woz_value ? formatPrice(property.woz_value) : '—'],
    ]

    doc.setFontSize(9)
    specs.forEach((spec, i) => {
      const col = i % 2 === 0 ? margin : margin + colW / 2
      const row = Math.floor(i / 2)
      const ry  = y + row * 10
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(130, 160, 140)
      doc.text(spec[0], col, ry)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(14, 59, 40)
      doc.text(spec[1], col, ry + 5)
    })
    y += Math.ceil(specs.length / 2) * 10 + 8

    // Score breakdown
    doc.setDrawColor(220, 240, 230)
    doc.line(margin, y, pageW - margin, y)
    y += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(14, 59, 40)
    doc.text('Score breakdown', margin, y)
    y += 6

    Object.entries(score.factors).forEach(([key, value]) => {
      const label = key.replace('_', ' ')
      const barW  = (colW - 40) * (value / 100)
      const fc    = value >= 70 ? [47, 197, 134] :
                    value >= 50 ? [196, 124, 26] : [184, 64, 51]

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 130, 110)
      doc.text(label.charAt(0).toUpperCase() + label.slice(1), margin, y + 3)

      doc.setFillColor(230, 245, 235)
      doc.roundedRect(margin + 40, y - 2, colW - 40, 6, 1, 1, 'F')

      doc.setFillColor(...fc as [number, number, number])
      if (barW > 0) doc.roundedRect(margin + 40, y - 2, barW, 6, 1, 1, 'F')

      doc.setTextColor(...fc as [number, number, number])
      doc.setFont('helvetica', 'bold')
      doc.text(String(value), pageW - margin, y + 3, { align: 'right' })

      y += 9
    })
    y += 4

    // Neighborhood stats
    doc.setDrawColor(220, 240, 230)
    doc.line(margin, y, pageW - margin, y)
    y += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(14, 59, 40)
    doc.text('Buurtstatistieken (2km radius)', margin, y)
    y += 6

    const stats = [
      ['Woningen in buurt',     String(score.neighborhood.total_properties)],
      ['Gem. prijs per m2',     score.neighborhood.avg_price_per_m2 ? formatPrice(score.neighborhood.avg_price_per_m2) : '—'],
      ['Geschat huurrendement', score.neighborhood.estimated_rental_yield ? `${score.neighborhood.estimated_rental_yield.toFixed(1)}%` : '—'],
      ['Aandeel appartementen', `${score.neighborhood.pct_apartments.toFixed(0)}%`],
    ]

    doc.setFontSize(9)
    stats.forEach((stat, i) => {
      const col = i % 2 === 0 ? margin : margin + colW / 2
      const row = Math.floor(i / 2)
      const ry  = y + row * 10
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(130, 160, 140)
      doc.text(stat[0], col, ry)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(14, 59, 40)
      doc.text(stat[1], col, ry + 5)
    })
    y += Math.ceil(stats.length / 2) * 10 + 8

    // Disclaimer
    doc.setDrawColor(220, 240, 230)
    doc.line(margin, y, pageW - margin, y)
    y += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(14, 59, 40)
    doc.text('Disclaimer', margin, y)
    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 130, 110)
    const disclaimer = 'Dit rapport is gegenereerd door Groundr op basis van beschikbare data uit de BAG, CBS en OpenStreetMap. De investeringsscore is indicatief en dient niet als financieel advies. Raadpleeg altijd een erkend makelaar of financieel adviseur voor bindende beslissingen.'
    const dLines = doc.splitTextToSize(disclaimer, colW)
    doc.text(dLines, margin, y)

    // Footer
    doc.setFillColor(14, 59, 40)
    doc.rect(0, 287, pageW, 10, 'F')
    doc.setTextColor(113, 221, 175)
    doc.setFontSize(7)
    doc.text('Groundr · Dutch Real Estate Intelligence · groundr.nl', pageW / 2, 293, { align: 'center' })

    // Save
    doc.save(`Groundr_Rapport_${property.street}_${property.house_number}.pdf`)
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      await generatePDF()
    } catch (e) {
      setError('Rapport genereren mislukt. Probeer opnieuw.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50"
        style={{
          background: loading ? 'rgba(14,59,40,0.5)' : '#0e3b28',
          color:      '#2fc586',
          border:     '1px solid rgba(47,197,134,0.3)',
        }}
      >
        {loading
          ? <><Loader size={14} className="animate-spin" /> Rapport genereren...</>
          : <><FileText size={14} /> PDF Rapport genereren</>
        }
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
    </div>
  )
}