/**
 * @file        components/ui/ScoreBar.tsx
 * @description Investment score display components for the Groundr platform.
 *              Used on the dashboard, property detail, mijnwoning page,
 *              and any screen that shows a 0–100 metric.
 *
 *              Components:
 *                ScoreHero   — large 0–100 display with label (dashboard hero)
 *                ScoreBar    — single factor row with bar + value
 *                ScorePanel  — complete breakdown: hero + all factor bars
 *
 *              Score color thresholds (matches backend logic):
 *                >= 70  → success green
 *                >= 50  → warning amber
 *                <  50  → danger red
 *
 * @layer       Design System → Atomic Components (Layer 2)
 * @depends     lib/design/tokens.ts, lib/design/colors.ts
 * @used-by     dashboard/page.tsx, property/[id]/page.tsx,
 *              mijnwoning/page.tsx, components/property/ScoreWidget.tsx
 *
 * @props ScoreBar
 *   label       — factor name (e.g. 'Huurrendement')
 *   value       — 0–100 numeric score
 *   explanation — optional sub-text below bar
 *
 * @props ScoreHero
 *   score       — 0–100 overall score
 *   lang        — 'nl' | 'en' for label text
 *
 * @props ScorePanel
 *   score       — overall score
 *   factors     — Record<string, number>
 *   explanations— Record<string, string> optional
 *   lang        — 'nl' | 'en'
 */

import React from 'react'
import { FONT, RADIUS, SPACE } from '@/lib/design/tokens'
import { COLOR, scoreColor, scoreLabel } from '@/lib/design/colors'

// ── ScoreBar — single factor row ──────────────────────────────────────────────

interface ScoreBarProps {
  label:        string
  value:        number
  explanation?: string
}

export function ScoreBar({ label, value, explanation }: ScoreBarProps) {
  const color = scoreColor(value)

  return (
    <div style={{ marginBottom: SPACE[3] }}>
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'baseline',
        marginBottom:   SPACE[1],
      }}>
        <span style={{
          fontSize:      '12px',
          color:         COLOR.textSecondary,
          fontFamily:    FONT.body,
          textTransform: 'capitalize',
        }}>
          {label.replace(/_/g, ' ')}
        </span>
        <span style={{
          fontFamily: FONT.mono,
          fontSize:   '11.5px',
          fontWeight: 500,
          color,
        }}>
          {Math.round(value)}
        </span>
      </div>

      {/* Bar track */}
      <div style={{
        height:       '4px',
        background:   COLOR.border,
        borderRadius: RADIUS.sm,
        overflow:     'hidden',
      }}>
        <div style={{
          height:       '100%',
          width:        `${Math.min(100, Math.max(0, value))}%`,
          background:   color,
          borderRadius: RADIUS.sm,
          transition:   'width 0.7s ease',
        }} />
      </div>

      {/* Explanation */}
      {explanation && (
        <p style={{
          fontSize:   '11px',
          color:      COLOR.textMuted,
          fontFamily: FONT.body,
          lineHeight: 1.4,
          marginTop:  SPACE[1],
          margin:     `${SPACE[1]} 0 0`,
        }}>
          {explanation}
        </p>
      )}
    </div>
  )
}

// ── ScoreHero — large score display ───────────────────────────────────────────

interface ScoreHeroProps {
  score: number
  lang?: 'nl' | 'en'
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreHero({ score, lang = 'nl', size = 'md' }: ScoreHeroProps) {
  const color = scoreColor(score)
  const label = scoreLabel(score, lang)

  const fontSize = size === 'sm' ? '40px' : size === 'lg' ? '80px' : '64px'

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Score number */}
      <div style={{
        fontFamily:    FONT.mono,
        fontSize,
        fontWeight:    500,
        color,
        lineHeight:    1,
        letterSpacing: '-3px',
      }}>
        {Math.round(score)}
      </div>

      {/* /100 */}
      <div style={{
        fontFamily: FONT.mono,
        fontSize:   '14px',
        color:      COLOR.textMuted,
        marginTop:  SPACE[1],
      }}>
        /100
      </div>

      {/* Label badge */}
      <div style={{
        display:      'inline-block',
        marginTop:    SPACE[2],
        padding:      `${SPACE[1]} ${SPACE[3]}`,
        background:   color === COLOR.success ? COLOR.successLight
                    : color === COLOR.warning ? COLOR.warningLight
                    : COLOR.dangerLight,
        color,
        fontSize:     '12px',
        fontWeight:   500,
        fontFamily:   FONT.body,
        borderRadius: RADIUS.sm,
        border:       `1px solid ${color}30`,
      }}>
        {label}
      </div>
    </div>
  )
}

// ── ScorePanel — full breakdown ───────────────────────────────────────────────

interface ScorePanelProps {
  score:         number
  factors:       Record<string, number>
  explanations?: Record<string, string>
  lang?:         'nl' | 'en'
}

export function ScorePanel({
  score,
  factors,
  explanations = {},
  lang = 'nl',
}: ScorePanelProps) {
  return (
    <div>
      {/* Hero score at top */}
      <div style={{
        paddingBottom: SPACE[4],
        marginBottom:  SPACE[4],
        borderBottom:  `1px solid ${COLOR.border}`,
      }}>
        <ScoreHero score={score} lang={lang} />
      </div>

      {/* Factor bars */}
      {Object.entries(factors).map(([key, value]) => (
        <ScoreBar
          key={key}
          label={key}
          value={value}
          explanation={explanations[key]}
        />
      ))}
    </div>
  )
}

export default ScoreBar