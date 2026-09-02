'use client'

import { Banknote } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE } from '@/lib/design/tokens'

export default function FinancePage() {
  return (
    <div>
      <div style={{ marginBottom: SPACE[6] }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 400, color: COLOR.textPrimary, letterSpacing: '-0.5px', marginBottom: SPACE[1] }}>
          Finance
        </h1>
        <p style={{ fontSize: '14px', color: COLOR.textMuted }}>
          Commission tracking, invoicing, and financial reporting.
        </p>
      </div>

      <Card>
        <div style={{ textAlign: 'center', padding: SPACE[12] }}>
          <div style={{ width: '52px', height: '52px', background: COLOR.brandLight, border: `1px solid ${COLOR.brandBorder}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: SPACE[4] }}>
            <Banknote size={24} color={COLOR.brand} />
          </div>
          <h2 style={{ fontFamily: FONT.display, fontSize: '22px', fontWeight: 400, color: COLOR.textPrimary, marginBottom: SPACE[2] }}>
            Finance module coming soon
          </h2>
          <p style={{ fontSize: '14px', color: COLOR.textMuted, maxWidth: '380px', margin: '0 auto', lineHeight: '1.6' }}>
            Commission tracking, automated invoicing, and financial reporting will be available in the next release.
          </p>
        </div>
      </Card>
    </div>
  )
}
