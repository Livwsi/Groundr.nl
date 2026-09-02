/**
 * @file        lib/design/colors.ts
 * @description Semantic color aliases for the Groundr platform. Maps raw
 *              palette values from tokens.ts to meaningful names that
 *              describe intent, not appearance.
 *
 *              Rule: components import from here, never from tokens.ts directly
 *              for colors. This means we can retheme the entire app by changing
 *              this file alone.
 *
 *              Also exports the CSS custom property names used in globals.css
 *              so TypeScript and CSS stay in sync.
 *
 * @layer       Design System → Colors (Layer 0.5)
 * @depends     lib/design/tokens.ts
 * @used-by     components/ui/*, app/globals.css
 * @author      Groundr Engineering
 * @updated     2026-05-28
 */

import { PALETTE } from './tokens'

// ── Semantic surface colors ───────────────────────────────────────────────────

export const COLOR = {
  // Page and surface backgrounds
  bgPage:       PALETTE.ink50,       // page background
  bgSurface:    PALETTE.white,       // card / panel background
  bgSurface2:   PALETTE.ink100,      // zebra rows, section headers, code bg
  bgSubtle:     PALETTE.ink50,       // subtle background for stat cards

  // Brand
  brand:        PALETTE.emerald500,  // primary green — buttons, links, focus
  brandLight:   PALETTE.emerald50,   // brand backgrounds, hover states
  brandText:    PALETTE.emerald600,  // brand text on light backgrounds
  brandBorder:  'rgba(5,150,105,0.2)', // brand borders and rings

  // Text
  textPrimary:   PALETTE.ink500,     // headings, primary content
  textSecondary: PALETTE.ink400,     // labels, descriptions
  textMuted:     PALETTE.ink300,     // placeholders, captions, timestamps

  // Borders
  border:        PALETTE.ink200,     // default borders
  borderFocus:   PALETTE.emerald500, // input focus state border

  // Semantic states
  success:       PALETTE.emerald500,
  successLight:  PALETTE.emerald50,
  successText:   PALETTE.emerald600,
  successBorder: 'rgba(5,150,105,0.2)',

  warning:       PALETTE.amber500,
  warningLight:  PALETTE.amber50,
  warningText:   PALETTE.amber600,
  warningBorder: 'rgba(217,119,6,0.2)',

  danger:        PALETTE.red500,
  dangerLight:   PALETTE.red50,
  dangerText:    PALETTE.red600,
  dangerBorder:  'rgba(220,38,38,0.15)',

  info:          PALETTE.blue500,
  infoLight:     PALETTE.blue50,
  infoText:      PALETTE.blue600,
  infoBorder:    'rgba(37,99,235,0.2)',
} as const

// ── Score color helper ────────────────────────────────────────────────────────
// Used for investment scores, factor bars, and any 0–100 metric.

export function scoreColor(score: number): string {
  if (score >= 70) return COLOR.success
  if (score >= 50) return COLOR.warning
  return COLOR.danger
}

export function scoreLabel(score: number, lang: 'nl' | 'en' = 'nl'): string {
  if (lang === 'nl') {
    if (score >= 80) return 'Uitstekend'
    if (score >= 65) return 'Goed'
    if (score >= 50) return 'Gemiddeld'
    return 'Matig'
  }
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 50) return 'Average'
  return 'Below average'
}

// ── CSS custom property names ─────────────────────────────────────────────────
// These strings match the variable names in globals.css.
// Import CSS_VAR when you need to reference a CSS variable in inline styles.

export const CSS_VAR = {
  brand:        'var(--color-brand)',
  brandLight:   'var(--color-brand-lt)',
  brandText:    'var(--color-brand-tx)',
  brandBorder:  'var(--color-brand-rim)',
  bgPage:       'var(--color-bg)',
  bgSurface:    'var(--color-surface)',
  bgSurface2:   'var(--color-surface-2)',
  border:       'var(--color-border)',
  textPrimary:  'var(--color-text-1)',
  textSecondary:'var(--color-text-2)',
  textMuted:    'var(--color-text-3)',
  success:      'var(--color-success)',
  warning:      'var(--color-warning)',
  danger:       'var(--color-danger)',
  info:         'var(--color-info)',
} as const