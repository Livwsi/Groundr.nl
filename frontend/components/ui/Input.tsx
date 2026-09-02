/**
 * @file        components/ui/Input.tsx
 * @description Controlled input component for the Groundr platform.
 *              Wraps a native <input> with consistent styling, label,
 *              helper text, error state, and optional icon slots.
 *
 *              Always use this component for form inputs — never use
 *              raw <input> elements in pages or compound components.
 *
 *              Features:
 *                - Label with optional required indicator
 *                - Left/right icon slots
 *                - Error state with message
 *                - Helper text below field
 *                - Focus ring using brand color
 *                - Disabled state
 *
 * @layer       Design System → Atomic Components (Layer 2)
 * @depends     lib/design/tokens.ts, lib/design/colors.ts
 * @used-by     Login page, search bar, all form pages
 *
 * @props       label       — field label text
 * @props       error       — error message (triggers red border)
 * @props       helper      — helper text below input
 * @props       iconLeft    — React node in left slot
 * @props       iconRight   — React node in right slot
 * @props       required    — shows asterisk on label
 */

'use client'

import React, { useState } from 'react'
import { FONT, RADIUS, SPACE } from '@/lib/design/tokens'
import { COLOR } from '@/lib/design/colors'

// ── Types ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  error?:     string
  helper?:    string
  iconLeft?:  React.ReactNode
  iconRight?: React.ReactNode
}

// ── Input component ───────────────────────────────────────────────────────────

export function Input({
  label,
  error,
  helper,
  iconLeft,
  iconRight,
  required,
  disabled,
  style,
  id,
  ...rest
}: InputProps) {

  const [focused, setFocused] = useState(false)

  // Generate a stable ID for label association if not provided
  const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, '-')}`

  const borderColor = error
    ? COLOR.danger
    : focused
      ? COLOR.brand
      : COLOR.border

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[1] }}>

      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display:       'block',
            fontSize:      '11px',
            fontWeight:    500,
            fontFamily:    FONT.body,
            color:         COLOR.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}
        >
          {label}
          {required && (
            <span style={{ color: COLOR.danger, marginLeft: SPACE[1] }}>*</span>
          )}
        </label>
      )}

      {/* Input wrapper — handles icon slots */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:         SPACE[2],
        height:      '40px',
        padding:     `0 ${SPACE[3]}`,
        background:  disabled ? COLOR.bgSurface2 : COLOR.bgSurface,
        border:      `1px solid ${borderColor}`,
        borderRadius: RADIUS.md,
        transition:  'border-color 0.15s ease',
        boxShadow:   focused ? `0 0 0 3px ${COLOR.brandBorder}` : 'none',
      }}>
        {iconLeft && (
          <span style={{ color: COLOR.textMuted, flexShrink: 0, display: 'flex' }}>
            {iconLeft}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex:       1,
            border:     'none',
            outline:    'none',
            background: 'transparent',
            fontFamily: FONT.body,
            fontSize:   '14px',
            color:      COLOR.textPrimary,
            cursor:     disabled ? 'not-allowed' : 'text',
            ...style,
          }}
          {...rest}
        />

        {iconRight && (
          <span style={{ color: COLOR.textMuted, flexShrink: 0, display: 'flex' }}>
            {iconRight}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p style={{
          fontSize:   '12px',
          color:      COLOR.dangerText,
          fontFamily: FONT.body,
          lineHeight: 1.4,
          margin:     0,
        }}>
          {error}
        </p>
      )}

      {/* Helper text */}
      {helper && !error && (
        <p style={{
          fontSize:   '12px',
          color:      COLOR.textMuted,
          fontFamily: FONT.body,
          lineHeight: 1.4,
          margin:     0,
        }}>
          {helper}
        </p>
      )}
    </div>
  )
}

export default Input