/**
 * @file        components/ui/Card.tsx
 * @description Surface card wrapper for the Groundr platform.
 *              Provides consistent elevation, border, padding, and optional
 *              header/footer slots for all card-style UI.
 *
 *              Use Card as the outer wrapper for any bounded UI object:
 *              property cards, invoice cards, stat panels, form sections.
 *
 *              Variants:
 *                default   — white surface, subtle border, sm shadow
 *                raised    — white surface, stronger shadow (modals, dropdowns)
 *                flat      — no shadow, border only (tables, dense layouts)
 *                subtle    — surface-2 background, no shadow (nested cards)
 *
 *              The header slot renders a consistently styled section title
 *              with optional icon and action slot (e.g. a "View all" link).
 *
 * @layer       Design System → Atomic Components (Layer 2)
 * @depends     lib/design/tokens.ts, lib/design/colors.ts
 * @used-by     All dashboard panels, property detail, invoice display
 *
 * @props       variant  — visual elevation variant
 * @props       title    — section header text (Times New Roman)
 * @props       icon     — icon node next to title
 * @props       action   — React node in header right slot
 * @props       padding  — override inner padding (default: SPACE[4])
 * @props       noPad    — removes all padding (for full-bleed content)
 */

import React from 'react'
import { FONT, RADIUS, SPACE, SHADOW } from '@/lib/design/tokens'
import { COLOR } from '@/lib/design/colors'

// ── Types ─────────────────────────────────────────────────────────────────────

type CardVariant = 'default' | 'raised' | 'flat' | 'subtle'

interface CardProps {
  variant?:  CardVariant
  title?:    string
  icon?:     React.ReactNode
  action?:   React.ReactNode
  padding?:  string
  noPad?:    boolean
  children:  React.ReactNode
  style?:    React.CSSProperties
  onClick?:  () => void
}

// ── Style maps ────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<CardVariant, React.CSSProperties> = {
  default: { background: COLOR.bgSurface,  border: `1px solid ${COLOR.border}`, boxShadow: SHADOW.md },
  raised:  { background: COLOR.bgSurface,  border: `1px solid ${COLOR.border}`, boxShadow: SHADOW.lg },
  flat:    { background: COLOR.bgSurface,  border: `1px solid ${COLOR.border}`, boxShadow: 'none' },
  subtle:  { background: COLOR.bgSurface2, border: `1px solid ${COLOR.border}`, boxShadow: 'none' },
}

// ── Card component ────────────────────────────────────────────────────────────

export function Card({
  variant  = 'default',
  title,
  icon,
  action,
  padding,
  noPad    = false,
  children,
  style,
  onClick,
}: CardProps) {

  const innerPadding = noPad ? '0' : (padding ?? SPACE[4])
  const hasHeader    = title || icon || action

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: RADIUS.lg,
        overflow:     'hidden',
        cursor:       onClick ? 'pointer' : undefined,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {/* Header */}
      {hasHeader && (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            SPACE[2],
          padding:        `${SPACE[3]} ${SPACE[4]}`,
          borderBottom:   `1px solid ${COLOR.border}`,
          background:     `linear-gradient(180deg, ${COLOR.bgSurface}, ${COLOR.bgSurface2})`,
        }}>
          {icon && (
            <span style={{ color: COLOR.brand, display: 'flex', flexShrink: 0 }}>
              {icon}
            </span>
          )}
          {title && (
            <span style={{
              fontFamily: FONT.display,
              fontSize:   '15px',
              fontWeight: 400,
              color:      COLOR.textPrimary,
              flex:       1,
            }}>
              {title}
            </span>
          )}
          {action && (
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              {action}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: innerPadding }}>
        {children}
      </div>
    </div>
  )
}

// ── StatCard — KPI metric display ─────────────────────────────────────────────

interface StatCardProps {
  value:    string | number
  label:    string
  trend?:   'up' | 'down' | 'neutral'
  color?:   string
}

/**
 * Compact metric card for KPI rows and summary panels.
 * Value uses DM Mono, label uses DM Sans.
 *
 * @example
 *   <StatCard value="€ 548.338" label="Gem. WOZ-waarde" />
 *   <StatCard value="+71.3%" label="Stijging 6 jaar" trend="up" />
 */
export function StatCard({ value, label, trend, color }: StatCardProps) {
  const valueColor = color
    ?? (trend === 'up'   ? COLOR.success
    :   trend === 'down' ? COLOR.danger
    :   COLOR.textPrimary)

  return (
    <div style={{
      background:   COLOR.bgSurface2,
      borderRadius: RADIUS.md,
      padding:      SPACE[4],
    }}>
      <div style={{
        fontFamily:    FONT.mono,
        fontSize:      '22px',
        fontWeight:    500,
        color:         valueColor,
        letterSpacing: '-1px',
        lineHeight:    1,
        marginBottom:  SPACE[1],
      }}>
        {value}
      </div>
      <div style={{
        fontSize:  '11.5px',
        color:     COLOR.textMuted,
        fontFamily: FONT.body,
      }}>
        {label}
      </div>
    </div>
  )
}

export default Card