/**
 * @file        components/layout/DashboardShell.tsx
 * @description Role-gated dashboard layout shell for the Groundr platform.
 *              Renders the top navigation and page content area for all
 *              authenticated users. Nav items are filtered by active role
 *              so each role sees only their permitted modules.
 *
 *              Layout structure:
 *                <DashboardShell>        ← sticky nav + content area
 *                  <nav>                 ← role-filtered nav links
 *                  <main>               ← page content slot
 *                </DashboardShell>
 *
 *              Nav items per role:
 *                admin     — all modules
 *                agent     — listings, viewings, bids, approvals, issues,
 *                            analytics, market data
 *                appraiser — appraisals, market data, analytics
 *                notary    — documents, signing
 *                buyer     — client portal, viewings, bids, documents
 *                seller    — client portal, documents
 *
 *              Role switcher: multi-role users see a role pill in the nav
 *              that opens a dropdown to switch active role.
 *
 * @layer       Layout Components (Layer 3)
 * @depends     store/auth.tsx, lib/types/user.ts,
 *              lib/design/tokens.ts, lib/design/colors.ts,
 *              components/ui/Badge.tsx
 * @used-by     app/(platform)/layout.tsx
 *
 * @props       children — page content
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, ChevronDown, Menu, X } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { NavBadge, RoleBadge } from '@/components/ui/Badge'
import {
  type Role,
  ROLE_LABEL,
  ROLE_DASHBOARD,
  canAccess,
} from '@/lib/types/user'
import { COLOR } from '@/lib/design/colors'
import { FONT, SPACE, SHADOW, Z, LAYOUT } from '@/lib/design/tokens'

// ── Nav item definitions ──────────────────────────────────────────────────────

interface NavItem {
  href:       string
  label:      string
  module:     string        // must match a key in ROLE_ACCESS
  badgeKey?:  string        // key in badges object
}

const NAV_ITEMS: NavItem[] = [
  { href: '/platform/dashboard',    label: 'Dashboard',       module: 'analytics' },
  { href: '/platform/listings',     label: 'Listings',        module: 'listings' },
  { href: '/platform/approvals',    label: 'Approvals',       module: 'listings' },
  { href: '/platform/bids',         label: 'Bids',            module: 'bids' },
  { href: '/platform/viewings',     label: 'Viewings',        module: 'viewings' },
  { href: '/platform/appraisals',   label: 'Appraisals',      module: 'appraisals' },
  { href: '/platform/documents',    label: 'Documents',       module: 'documents' },
  { href: '/platform/issues',       label: 'Issues',          module: 'issues' },
  { href: '/platform/analytics',    label: 'Analytics',       module: 'analytics' },
  { href: '/platform/market',       label: 'Market data',     module: 'marketData' },
  { href: '/platform/finance',      label: 'Finance',         module: 'finance' },
  { href: '/platform/admin',        label: 'Admin',           module: 'adminPanel' },
  { href: '/client-portal/dashboard', label: 'My portal',     module: 'clientPortal' },
]

// ── Role switcher dropdown ────────────────────────────────────────────────────

interface RoleSwitcherProps {
  roles:      Role[]
  activeRole: Role
  onSwitch:   (role: Role) => void
}

function RoleSwitcher({ roles, activeRole, onSwitch }: RoleSwitcherProps) {
  const [open, setOpen] = useState(false)

  if (roles.length <= 1) {
    return <RoleBadge label={ROLE_LABEL[activeRole]} />
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display:     'flex',
          alignItems:  'center',
          gap:         SPACE[1],
          padding:     `${SPACE[1]} ${SPACE[2]}`,
          background:  COLOR.brandLight,
          border:      `1px solid ${COLOR.brandBorder}`,
          borderRadius: '99px',
          fontSize:    '11px',
          fontWeight:  500,
          color:       COLOR.brandText,
          cursor:      'pointer',
          fontFamily:  FONT.body,
        }}
      >
        {ROLE_LABEL[activeRole]}
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: Z.dropdown - 1 }}
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div style={{
            position:    'absolute',
            top:         'calc(100% + 6px)',
            right:       0,
            zIndex:      Z.dropdown,
            background:  COLOR.bgSurface,
            border:      `1px solid ${COLOR.border}`,
            borderRadius: '8px',
            boxShadow:   SHADOW.lg,
            minWidth:    '160px',
            overflow:    'hidden',
          }}>
            <div style={{
              padding:     `${SPACE[2]} ${SPACE[3]}`,
              fontSize:    '10px',
              fontWeight:  500,
              color:       COLOR.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              borderBottom: `1px solid ${COLOR.border}`,
            }}>
              Switch role
            </div>
            {roles.map(role => (
              <button
                key={role}
                onClick={() => { onSwitch(role); setOpen(false) }}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        SPACE[2],
                  width:      '100%',
                  padding:    `${SPACE[2]} ${SPACE[3]}`,
                  background: role === activeRole ? COLOR.brandLight : 'transparent',
                  border:     'none',
                  cursor:     'pointer',
                  fontSize:   '13px',
                  color:      role === activeRole ? COLOR.brandText : COLOR.textSecondary,
                  fontFamily: FONT.body,
                  fontWeight: role === activeRole ? 500 : 400,
                  textAlign:  'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (role !== activeRole) e.currentTarget.style.background = COLOR.bgSurface2
                }}
                onMouseLeave={e => {
                  if (role !== activeRole) e.currentTarget.style.background = 'transparent'
                }}
              >
                {role === activeRole && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLOR.brand, flexShrink: 0 }} />
                )}
                {role !== activeRole && (
                  <span style={{ width: '6px', height: '6px', flexShrink: 0 }} />
                )}
                {ROLE_LABEL[role]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

interface DashboardShellProps {
  children:  React.ReactNode
  badges?:   Record<string, number>
}

export function DashboardShell({ children, badges = {} }: DashboardShellProps) {
  const pathname              = usePathname()
  const { user, activeRole, switchRole, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!user || !activeRole) { return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6F9' }}><div style={{ width: '28px', height: '28px', border: '2px solid #E2E5EA', borderTopColor: '#059669', borderRadius: '50%', animation: 'groundr-spin 0.6s linear infinite' }} /></div> }

  // Filter nav items to only those the active role can access
  const visibleItems = NAV_ITEMS.filter(item =>
    canAccess([activeRole], item.module)
  )

  return (
    <div style={{ minHeight: '100vh', background: COLOR.bgPage, fontFamily: FONT.body }}>

      {/* ── Top navigation ── */}
      <nav style={{
        background:   COLOR.bgSurface,
        borderBottom: `1px solid ${COLOR.border}`,
        height:       LAYOUT.navHeight,
        position:     'sticky',
        top:          0,
        zIndex:       Z.nav,
        boxShadow:    SHADOW.md,
      }}>
        <div style={{
          maxWidth: LAYOUT.contentMax,
          margin:   '0 auto',
          padding:  `0 ${SPACE[8]}`,
          height:   '100%',
          display:  'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap:      SPACE[4],
        }}>

          {/* Left: logo + nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[6] }}>

            {/* Logo */}
            <Link href={ROLE_DASHBOARD[activeRole]} style={{
              display:    'flex',
              alignItems: 'center',
              gap:        SPACE[2],
              textDecoration: 'none',
              flexShrink: 0,
            }}>
              <div style={{
                width:        '26px',
                height:       '26px',
                background:   COLOR.brand,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <span style={{
                fontFamily:  FONT.display,
                fontSize:    '18px',
                fontWeight:  400,
                color:       COLOR.textPrimary,
                letterSpacing: '-0.3px',
              }}>
                Groundr
              </span>
            </Link>

            {/* Nav links — desktop */}
            <div style={{
              display:    'flex',
              alignItems: 'center',
            }}>
              {visibleItems.map(item => {
                const isActive  = pathname.startsWith(item.href)
                const badgeCount = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display:     'flex',
                      alignItems:  'center',
                      gap:         SPACE[1],
                      height:      LAYOUT.navHeight,
                      padding:     `0 ${SPACE[3]}`,
                      fontSize:    '13.5px',
                      fontWeight:  isActive ? 500 : 400,
                      color:       isActive ? COLOR.textPrimary : COLOR.textSecondary,
                      textDecoration: 'none',
                      borderBottom:   isActive
                        ? `2px solid ${COLOR.brand}`
                        : '2px solid transparent',
                      transition:  'color 0.15s',
                      whiteSpace:  'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.color = COLOR.textPrimary
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.color = COLOR.textSecondary
                    }}
                  >
                    {item.label}
                    {badgeCount > 0 && <NavBadge count={badgeCount} />}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right: role switcher + user + logout */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        SPACE[3],
            flexShrink: 0,
          }}>
            {/* Role switcher */}
            <RoleSwitcher
              roles={user.roles}
              activeRole={activeRole}
              onSwitch={switchRole}
            />

            {/* User email */}
            <span style={{
              fontSize:  '12.5px',
              color:     COLOR.textMuted,
              fontFamily: FONT.body,
              maxWidth:  '160px',
              overflow:  'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.full_name ?? user.email}
            </span>

            {/* Logout */}
            <button
              onClick={logout}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        SPACE[1],
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                fontSize:   '12.5px',
                color:      COLOR.textMuted,
                fontFamily: FONT.body,
                padding:    `${SPACE[1]} ${SPACE[2]}`,
                borderRadius: '4px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = COLOR.danger}
              onMouseLeave={e => e.currentTarget.style.color = COLOR.textMuted}
            >
              <LogOut size={13} />
              Sign out
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display:    'none', // shown via media query in globals.css
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                color:      COLOR.textSecondary,
                padding:    SPACE[1],
              }}
              className="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div style={{
          position:   'fixed',
          inset:      0,
          zIndex:     Z.modal,
          background: 'rgba(11,19,32,0.5)',
        }} onClick={() => setMobileMenuOpen(false)}>
          <div
            style={{
              position:   'absolute',
              top:        0,
              left:       0,
              width:      '280px',
              height:     '100vh',
              background: COLOR.bgSurface,
              padding:    SPACE[6],
              display:    'flex',
              flexDirection: 'column',
              gap:        SPACE[1],
              boxShadow:  SHADOW.xl,
              overflowY:  'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile nav header */}
            <div style={{
              display:       'flex',
              justifyContent: 'space-between',
              alignItems:    'center',
              marginBottom:  SPACE[4],
              paddingBottom: SPACE[4],
              borderBottom:  `1px solid ${COLOR.border}`,
            }}>
              <span style={{ fontFamily: FONT.display, fontSize: '18px', color: COLOR.textPrimary }}>
                Groundr
              </span>
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLOR.textMuted }}>
                <X size={18} />
              </button>
            </div>

            {/* Mobile nav items */}
            {visibleItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display:        'block',
                  padding:        `${SPACE[3]} ${SPACE[3]}`,
                  fontSize:       '14px',
                  color:          pathname.startsWith(item.href) ? COLOR.brandText : COLOR.textSecondary,
                  background:     pathname.startsWith(item.href) ? COLOR.brandLight : 'transparent',
                  textDecoration: 'none',
                  borderRadius:   '6px',
                  fontWeight:     pathname.startsWith(item.href) ? 500 : 400,
                }}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile sign out */}
            <button
              onClick={logout}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        SPACE[2],
                marginTop:  'auto',
                padding:    `${SPACE[3]} ${SPACE[3]}`,
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                fontSize:   '14px',
                color:      COLOR.danger,
                fontFamily: FONT.body,
                borderRadius: '6px',
              }}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main style={{
        maxWidth: LAYOUT.contentMax,
        margin:   '0 auto',
        padding:  `${SPACE[8]} ${SPACE[8]} ${SPACE[12]}`,
      }}>
        {children}
      </main>
    </div>
  )
}

export default DashboardShell