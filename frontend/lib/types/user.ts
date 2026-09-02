/**
 * @file        lib/types/user.ts
 * @description TypeScript type definitions for users, roles, and authentication
 *              in the Groundr platform.
 *
 *              These types mirror the backend Pydantic models exactly so that
 *              API responses can be safely typed end-to-end without casting.
 *
 *              Role definitions:
 *                admin     — full platform, all modules
 *                agent     — makelaar dashboard
 *                appraiser — taxatie module
 *                notary    — documents + signing
 *                buyer     — client portal
 *                seller    — submission tracking
 *
 * @layer       Types (Layer 0.5 — no component dependencies)
 * @depends     nothing
 * @used-by     lib/services/AuthService.ts, store/auth.ts,
 *              components/layout/RoleGuard.tsx, all protected pages
 * @author      Groundr Engineering
 * @updated     2026-05-28
 */

// ── Role system ───────────────────────────────────────────────────────────────

/**
 * All possible roles in the platform.
 * A user can hold multiple roles simultaneously.
 */
export type Role =
  | 'admin'
  | 'agent'
  | 'appraiser'
  | 'notary'
  | 'buyer'
  | 'seller'

/**
 * Maps each role to the dashboard route it should land on after login.
 * Used by the auth flow to redirect single-role users automatically.
 */
export const ROLE_DASHBOARD: Record<Role, string> = {
  admin:     '/platform/admin',
  agent:     '/platform/dashboard',
  appraiser: '/platform/appraisals',
  notary:    '/platform/documents',
  buyer:     '/client-portal/dashboard',
  seller:    '/client-portal/submission',
}

/**
 * Human-readable display name for each role.
 * Used on the role-selector screen and in the nav header.
 */
export const ROLE_LABEL: Record<Role, string> = {
  admin:     'Platform Admin',
  agent:     'Makelaar',
  appraiser: 'Taxateur',
  notary:    'Notaris',
  buyer:     'Koper',
  seller:    'Verkoper',
}

/**
 * Module access matrix.
 * Defines which roles can access each platform module.
 * Used by RoleGuard and the nav renderer.
 */
export const ROLE_ACCESS: Record<string, Role[]> = {
  listings:     ['admin', 'agent'],
  viewings:     ['admin', 'agent', 'buyer'],
  bids:         ['admin', 'agent', 'buyer'],
  appraisals:   ['admin', 'appraiser'],
  documents:    ['admin', 'agent', 'appraiser', 'notary', 'buyer', 'seller'],
  clientPortal: ['buyer', 'seller'],
  analytics:    ['admin', 'agent', 'appraiser'],
  finance:      ['admin', 'agent', 'appraiser', 'notary'],
  issues:       ['admin', 'agent', 'buyer', 'seller'],
  signing:      ['admin', 'agent', 'notary', 'buyer', 'seller'],
  marketData:   ['admin', 'agent', 'appraiser'],
  adminPanel:   ['admin'],
}

// ── Auth response types ───────────────────────────────────────────────────────

/**
 * Returned by POST /api/auth/login and POST /api/auth/register.
 * The `roles` array drives frontend routing and module visibility.
 */
export interface TokenResponse {
  access_token: string
  token_type:   'bearer'
  user_id:      number
  email:        string
  full_name:    string | null
  roles:        Role[]
}

/**
 * Returned by GET /api/auth/me.
 * Used to hydrate the auth store on app mount.
 */
export interface UserProfile {
  id:           number
  email:        string
  full_name:    string | null
  subscription: 'free' | 'starter' | 'pro' | 'enterprise'
  roles:        Role[]
  created_at:   string
}

// ── Auth store state ──────────────────────────────────────────────────────────

/**
 * Shape of the global auth state (stored in React context / localStorage).
 * `activeRole` is the role the user is currently acting as — set after the
 * role-selector screen. A user with roles ['agent','appraiser'] might switch
 * between them without logging out.
 */
export interface AuthState {
  user:        UserProfile | null
  token:       string | null
  activeRole:  Role | null
  isLoading:   boolean
  isAuthenticated: boolean
}

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Returns true if the user has access to a given module.
 * Use this in RoleGuard and nav rendering — never hardcode role checks.
 *
 * @example
 *   canAccess(user.roles, 'appraisals') // true if user is admin or appraiser
 */
export function canAccess(userRoles: Role[], module: string): boolean {
  const allowed = ROLE_ACCESS[module]
  if (!allowed) return false
  return userRoles.some(role => allowed.includes(role))
}

/**
 * Returns true if the user has a specific role.
 *
 * @example
 *   hasRole(user.roles, 'admin') // true only for admins
 */
export function hasRole(userRoles: Role[], role: Role): boolean {
  return userRoles.includes(role)
}

/**
 * Returns the redirect path for a single-role user after login.
 * For multi-role users, returns null — the role-selector handles routing.
 */
export function getLoginRedirect(roles: Role[]): string | null {
  if (roles.length === 1) return ROLE_DASHBOARD[roles[0]]
  return null
}