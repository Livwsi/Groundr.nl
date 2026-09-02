/**
 * @file        components/ui/Badge.tsx
 * @description Status badge and pill component for the Groundr platform.
 *              Used for listing status, role labels, score labels, counts,
 *              and any short categorical label.
 *
 *              Variants map to semantic meaning — not arbitrary colors.
 *              Never use a color variant just for aesthetics; pick the
 *              variant that matches the semantic intent.
 *
 *              Variants:
 *                success     — available, active, approved, good score
 *                warning     — pending, urgent, average score
 *                danger      — sold, rejected, error, low score
 *                info        — new listing, informational
 *                neutral     — default, inactive, unknown
 *                brand       — Groundr-branded labels
 *
 *              Shape:
 *                default     — slightly rounded (radius-sm)
 *                pill        — fully rounded (radius-full)
 *                square      — no rounding (radius-none) for table cells
 *
 * @layer       Design System → Atomic Components (Layer 2)
 * @depends     lib/design/tokens.ts, lib/design/colors.ts
 * @used-by     PropertyCard, nav badges, role labels, score labels
 *
 * @props       variant — semantic color variant
 * @props       shape   — border-radius style
 * @props       size    — 'sm' | 'md'
 * @props       dot     — shows a small circle before the label
 * @props       count   — numeric count (hides when 0)
 */

import React from 'react'
import { FONT, RADIUS, SPACE } from '@/lib/design/tokens'
import { COLOR } from '@/lib/design/colors'

// ── Types ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand'
type BadgeShape   = 'default' | 'pill' | 'square'
type BadgeSize    = 'sm' | 'md'

interface BadgeProps {
  variant?:  BadgeVariant
  shape?:    BadgeShape
  size?:     BadgeSize
  dot?:      boolean
  count?:    number
  children?: React.ReactNode
  style?:    React.CSSProperties
}

// ── Style maps ────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: COLOR.successLight,  color: COLOR.successText,  border: `1px solid ${COLOR.successBorder}` },
  warning: { background: COLOR.warningLight,  color: COLOR.warningText,  border: `1px solid ${COLOR.warningBorder}` },
  danger:  { background: COLOR.dangerLight,   color: COLOR.dangerText,   border: `1px solid ${COLOR.dangerBorder}` },
  info:    { background: COLOR.infoLight,     color: COLOR.infoText,     border: `1px solid ${COLOR.infoBorder}` },
  neutral: { background: COLOR.bgSurface2,    color: COLOR.textSecondary, border: `1px solid ${COLOR.border}` },
  brand:   { background: COLOR.brandLight,    color: COLOR.brandText,    border: `1px solid ${COLOR.brandBorder}` },
}

const SHAPE_RADIUS: Record<BadgeShape, string> = {
  default: RADIUS.sm,
  pill:    RADIUS.full,
  square:  RADIUS.none,
}

const SIZE_STYLES: Record<BadgeSize, React.CSSProperties> = {
  sm: { fontSize: '10px', padding: `1px ${SPACE[2]}`, letterSpacing: '0.04em' },
  md: { fontSize: '11px', padding: `3px ${SPACE[2]}` },
}

// ── Badge component ───────────────────────────────────────────────────────────

export function Badge({
  variant  = 'neutral',
  shape    = 'default',
  size     = 'md',
  dot      = false,
  count,
  children,
  style,
}: BadgeProps) {
  // Count badge — hides when 0
  if (count !== undefined) {
    if (count === 0) return null
    return (
      <span style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        minWidth:       '18px',
        height:         '18px',
        padding:        `0 ${SPACE[1]}`,
        fontFamily:     FONT.mono,
        fontSize:       '10px',
        fontWeight:     600,
        borderRadius:   RADIUS.full,
        ...VARIANT_STYLES[variant],
        ...style,
      }}>
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  return (
    <span style={{
      display:     'inline-flex',
      alignItems:  'center',
      gap:         dot ? SPACE[1] : undefined,
      fontFamily:  FONT.body,
      fontWeight:  500,
      lineHeight:  1,
      whiteSpace:  'nowrap',
      borderRadius: SHAPE_RADIUS[shape],
      ...SIZE_STYLES[size],
      ...VARIANT_STYLES[variant],
      ...style,
    }}>
      {dot && (
        <span style={{
          width:        '5px',
          height:       '5px',
          borderRadius: '50%',
          background:   'currentColor',
          flexShrink:   0,
        }} />
      )}
      {children}
    </span>
  )
}

// ── Convenience exports for common use cases ──────────────────────────────────

/** Nav notification count — amber, pill shape */
export function NavBadge({ count }: { count: number }) {
  return <Badge variant="warning" shape="pill" size="sm" count={count} />
}

/** Role label — brand colored pill */
export function RoleBadge({ label }: { label: string }) {
  return <Badge variant="brand" shape="pill" size="sm">{label}</Badge>
}

export default Badge