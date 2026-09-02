/**
 * @file        lib/design/tokens.ts
 * @description Single source of truth for all visual design constants in the
 *              Groundr platform. Every color, spacing value, radius, shadow,
 *              and z-index used anywhere in the codebase must come from here.
 *
 *              Never hardcode a hex value, pixel value, or shadow string in a
 *              component. Import from this file instead.
 *
 *              This file has zero imports — it is the foundation layer.
 *
 * @layer       Design System → Tokens (Layer 0 — no dependencies)
 * @depends     nothing
 * @used-by     lib/design/colors.ts, lib/design/spacing.ts,
 *              lib/design/typography.ts, app/globals.css (via CSS vars)
 * @author      Groundr Engineering
 * @updated     2026-05-28
 */

// ── Color palette ─────────────────────────────────────────────────────────────
// Raw hex values. Use semantic aliases from colors.ts in components,
// not these raw values directly.

export const PALETTE = {
  // Brand — Emerald
  emerald50:  '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald200: '#6EE7B7',
  emerald300: '#34D399',
  emerald400: '#10B981',
  emerald500: '#059669',  // ★ primary brand color
  emerald600: '#047857',  // text on light emerald bg
  emerald700: '#065F46',
  emerald800: '#064E3B',

  // Ink — Neutrals
  ink50:  '#F4F6F9',  // page background
  ink100: '#F8FAFB',  // surface variant (zebra rows, section headers)
  ink200: '#E2E5EA',  // borders
  ink300: '#8A9BB0',  // muted text, placeholders
  ink400: '#44546A',  // secondary text
  ink500: '#0B1320',  // primary text, headings

  // Amber — warnings, price-reduced badges
  amber50:  '#FFFBEB',
  amber100: '#FEF3C7',
  amber400: '#FBBF24',
  amber500: '#D97706',
  amber600: '#B45309',

  // Red — errors, destructive actions, sold badges
  red50:  '#FEF2F2',
  red100: '#FEE2E2',
  red400: '#F87171',
  red500: '#DC2626',
  red600: '#B91C1C',

  // Blue — info states, "Nieuw" badge
  blue50:  '#EFF6FF',
  blue100: '#DBEAFE',
  blue400: '#60A5FA',
  blue500: '#2563EB',
  blue600: '#1D4ED8',

  // White / Black
  white: '#FFFFFF',
  black: '#000000',
} as const

// ── Spacing scale ─────────────────────────────────────────────────────────────
// Base unit: 4px. All spacing is a multiple of 4.
// Use these values for padding, margin, and gap — never arbitrary px values.

export const SPACE = {
  0:  '0px',
  1:  '4px',    // tight internal gaps (icon to label)
  2:  '8px',    // component internal padding
  3:  '12px',   // between related items
  4:  '16px',   // standard component padding
  5:  '20px',   // section internal padding
  6:  '24px',   // between components
  7:  '28px',
  8:  '32px',   // section gaps
  9:  '36px',
  10: '40px',   // large section padding
  12: '48px',   // page section padding
  14: '56px',
  16: '64px',   // hero sections
  20: '80px',   // large hero sections
} as const

// ── Border radius ─────────────────────────────────────────────────────────────

export const RADIUS = {
  none: '0px',          // badges, table cells, square buttons
  sm:   '2px',          // subtle rounding — progress bars, chips
  md:   '2px',          // buttons, inputs, small cards
  lg:   '2px',          // cards, panels, dropdowns
  xl:   '4px',         // large modals, bottom sheets
  full: '9999px',       // pills, avatars, toggles
} as const

// ── Shadow scale ──────────────────────────────────────────────────────────────

export const SHADOW = {
  none: 'none',
  sm:   '0 1px 2px rgba(11,19,32,0.05)',    // subtle lift — inputs
  md:   '0 1px 3px rgba(11,19,32,0.07)',    // default card
  lg:   '0 4px 20px rgba(11,19,32,0.09)',   // modals, dropdowns
  xl:   '0 8px 32px rgba(11,19,32,0.12)',   // elevated drawers
  focus: '0 0 0 3px rgba(5,150,105,0.15)',  // keyboard focus ring
} as const

// ── Typography ────────────────────────────────────────────────────────────────

export const FONT = {
  display: "'Times New Roman', Times, serif",   // headings, hero text
  body:    "'DM Sans', sans-serif",              // all UI text, labels
  mono:    "'DM Mono', monospace",               // prices, scores, codes
} as const

export const FONT_SIZE = {
  xs:   '11px',
  sm:   '12px',
  md:   '13px',
  base: '14px',
  lg:   '15px',
  xl:   '16px',
  '2xl':'18px',
  '3xl':'24px',
  '4xl':'32px',
  '5xl':'44px',
  '6xl':'56px',
} as const

export const FONT_WEIGHT = {
  normal:  '400',
  medium:  '500',
  semibold:'600',  // use sparingly — Times NR headings only
} as const

export const LINE_HEIGHT = {
  tight:  '1.1',   // display headings
  snug:   '1.3',   // subheadings
  normal: '1.5',   // UI labels
  relaxed:'1.7',   // body text, descriptions
} as const

// ── Z-index scale ─────────────────────────────────────────────────────────────
// Consistent stacking order — never use arbitrary z-index values.

export const Z = {
  base:    0,
  raised:  10,    // cards on hover
  sticky:  90,    // sticky table headers
  nav:     100,   // top navigation
  tabs:    90,    // sticky tab bars
  dropdown:150,   // dropdowns, popovers
  modal:   200,   // modal overlays
  toast:   300,   // notification toasts
  tooltip: 400,   // tooltips (always on top)
} as const

// ── Breakpoints ───────────────────────────────────────────────────────────────
// Mobile-first. Use min-width media queries.

export const BREAKPOINT = {
  sm:  '640px',   // large phones
  md:  '768px',   // tablets
  lg:  '1024px',  // laptops
  xl:  '1280px',  // desktops
  '2xl':'1536px', // large desktops
} as const

// ── Transition ────────────────────────────────────────────────────────────────

export const TRANSITION = {
  fast:   'all 0.1s ease',
  base:   'all 0.15s ease',
  slow:   'all 0.25s ease',
  color:  'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
} as const

// ── Layout constants ──────────────────────────────────────────────────────────

export const LAYOUT = {
  navHeight:     '60px',
  tabHeight:     '44px',
  sidebarWidth:  '240px',
  contentMax:    '1200px',
  cardPadding:   SPACE[4],
} as const