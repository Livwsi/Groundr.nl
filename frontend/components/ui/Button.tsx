/**
 * @file        components/ui/Button.tsx
 * @description Polymorphic button component for the Groundr platform.
 *              Supports 4 variants, 3 sizes, loading state, icon slots,
 *              and renders as either a <button> or <a> element.
 *
 *              All styling derives from design tokens — no hardcoded values.
 *
 *              Variants:
 *                primary     — filled green, main CTAs
 *                secondary   — outlined, secondary actions
 *                ghost       — green tint, tertiary actions on light bg
 *                destructive — red tint, delete/cancel/reject actions
 *
 *              Sizes:
 *                sm  — 28px height, 12px font, compact tables/badges
 *                md  — 36px height, 13px font, default
 *                lg  — 44px height, 14px font, forms/hero CTAs
 *
 * @layer       Design System → Atomic Components (Layer 2)
 * @depends     lib/design/tokens.ts, lib/design/colors.ts
 * @used-by     All pages and compound components
 *
 * @props       variant    — 'primary' | 'secondary' | 'ghost' | 'destructive'
 * @props       size       — 'sm' | 'md' | 'lg'
 * @props       loading    — shows spinner, disables click
 * @props       disabled   — disabled state with reduced opacity
 * @props       iconLeft   — React node rendered before label
 * @props       iconRight  — React node rendered after label
 * @props       fullWidth  — stretches to container width
 * @props       href       — renders as <a> if provided
 */

'use client'

import React from 'react'
import { FONT, RADIUS, SPACE, SHADOW } from '@/lib/design/tokens'
import { COLOR } from '@/lib/design/colors'

// ── Types ─────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant
  size?:      ButtonSize
  loading?:   boolean
  iconLeft?:  React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  href?:      string
}

// ── Style maps ────────────────────────────────────────────────────────────────

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: '28px', padding: `0 ${SPACE[3]}`, fontSize: '12px' },
  md: { height: '36px', padding: `0 ${SPACE[4]}`, fontSize: '13px' },
  lg: { height: '44px', padding: `0 ${SPACE[5]}`, fontSize: '14px' },
}

const VARIANT_STYLES: Record<ButtonVariant, {
  base:     React.CSSProperties
  hover:    React.CSSProperties
  disabled: React.CSSProperties
}> = {
  primary: {
    base:     { background: COLOR.brand,       border: `1px solid ${COLOR.brand}`,       color: 'white' },
    hover:    { background: COLOR.brandText,   border: `1px solid ${COLOR.brandText}` },
    disabled: { background: COLOR.brandLight,  border: `1px solid ${COLOR.brandBorder}`, color: COLOR.brandText },
  },
  secondary: {
    base:     { background: COLOR.bgSurface,   border: `1px solid ${COLOR.border}`,      color: COLOR.textPrimary },
    hover:    { borderColor: COLOR.brand,      color: COLOR.brand },
    disabled: { opacity: 0.5 },
  },
  ghost: {
    base:     { background: COLOR.brandLight,  border: `1px solid ${COLOR.brandBorder}`, color: COLOR.brandText },
    hover:    { background: COLOR.brandLight,  borderColor: COLOR.brand },
    disabled: { opacity: 0.5 },
  },
  destructive: {
    base:     { background: COLOR.dangerLight, border: `1px solid ${COLOR.dangerBorder}`, color: COLOR.dangerText },
    hover:    { background: COLOR.danger,      border: `1px solid ${COLOR.danger}`,       color: 'white' },
    disabled: { opacity: 0.5 },
  },
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === 'sm' ? '10px' : size === 'lg' ? '16px' : '13px'
  return (
    <span style={{
      width: dim, height: dim,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: 'currentColor',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'groundr-spin 0.6s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── Button component ──────────────────────────────────────────────────────────

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  href,
  children,
  onClick,
  style,
  type = 'button',
  ...rest
}: ButtonProps) {

  const isDisabled = disabled || loading
  const variantStyle = VARIANT_STYLES[variant]

  const baseStyle: React.CSSProperties = {
    // Layout
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            SPACE[2],
    width:          fullWidth ? '100%' : undefined,

    // Typography
    fontFamily: FONT.body,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',

    // Shape
    borderRadius: RADIUS.md,
    cursor:       isDisabled ? 'not-allowed' : 'pointer',
    userSelect:   'none',

    // Transitions
    transition: 'all 0.15s ease',
    outline:    'none',

    // Size
    ...SIZE_STYLES[size],

    // Variant
    ...variantStyle.base,

    // Disabled override
    ...(isDisabled ? variantStyle.disabled : {}),

    // Consumer override (last — allows minimal customisation)
    ...style,
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return
    Object.assign(e.currentTarget.style, variantStyle.hover)
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return
    Object.assign(e.currentTarget.style, variantStyle.base)
  }

  const content = (
    <>
      {loading  && <Spinner size={size} />}
      {!loading && iconLeft}
      {children && <span>{children}</span>}
      {!loading && iconRight}
    </>
  )

  // Render as anchor if href provided
  if (href && !isDisabled) {
    return (
      <a
        href={href}
        style={{ ...baseStyle, textDecoration: 'none' } as React.CSSProperties}
      >
        {content}
      </a>
    )
  }

  return (
    <>
      <style>{`@keyframes groundr-spin { to { transform: rotate(360deg); } }`}</style>
      <button
        type={type}
        disabled={isDisabled}
        onClick={isDisabled ? undefined : onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={baseStyle}
        {...rest}
      >
        {content}
      </button>
    </>
  )
}

export default Button