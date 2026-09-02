/**
 * @file        lib/services/AuthService.ts
 * @description Authentication service class for the Groundr platform.
 *              Handles login, register, token storage, role management,
 *              and session restoration.
 *
 *              Extends ApiService — all HTTP calls go through the base class.
 *              Never call fetch() directly in components; use this service.
 *
 *              Token storage:
 *                - JWT stored in localStorage under TOKEN_KEY
 *                - Active role stored under ACTIVE_ROLE_KEY
 *                - Both cleared on logout
 *
 *              Multi-role flow:
 *                login() → returns roles[]
 *                if roles.length === 1 → auto-redirect to ROLE_DASHBOARD
 *                if roles.length > 1  → show RoleSelector component
 *                setActiveRole()      → stores choice, enables module access
 *
 * @layer       Service Layer (Layer 1)
 * @depends     lib/services/ApiService.ts, lib/types/user.ts
 * @used-by     store/auth.ts, app/(auth)/login/page.tsx,
 *              app/(auth)/register/page.tsx, components/layout/AuthGuard.tsx
 *
 * @class       AuthService
 * @method      login(email, password) → Promise<TokenResponse>
 * @method      register(email, password, fullName?) → Promise<TokenResponse>
 * @method      getMe() → Promise<UserProfile>
 * @method      logout() → void
 * @method      setActiveRole(role) → void
 * @method      getActiveRole() → Role | null
 * @method      getToken() → string | null
 * @method      isLoggedIn() → boolean
 * @author      Groundr Engineering
 * @updated     2026-05-28
 */

import {
  ApiService,
  ApiError,
  TOKEN_KEY,
  ACTIVE_ROLE_KEY,
} from './ApiService'

import type {
  TokenResponse,
  UserProfile,
  Role,
} from '../types/user'

// ── AuthService class ─────────────────────────────────────────────────────────

export class AuthService extends ApiService {

  // ── Login ─────────────────────────────────────────────────────────────────

  /**
   * Authenticates the user and stores the JWT token.
   * Returns the full TokenResponse including roles[].
   *
   * After calling login():
   *   - If response.roles.length === 1 → redirect to ROLE_DASHBOARD[roles[0]]
   *   - If response.roles.length > 1  → show RoleSelector
   *   - If response.roles.length === 0 → show error (account has no roles)
   *
   * @throws ApiError(401) if credentials are incorrect
   * @throws ApiError(403) if account is deactivated
   */
  async login(email: string, password: string): Promise<TokenResponse> {
    const response = await this.post<TokenResponse>('/auth/login', {
      email,
      password,
    })

    // Persist token immediately so subsequent calls are authenticated
    this.storeToken(response.access_token)

    return response
  }

  // ── Register ──────────────────────────────────────────────────────────────

  /**
   * Creates a new account and stores the JWT token.
   * Self-registered users automatically receive the 'buyer' role.
   *
   * @throws ApiError(400) if email already exists
   */
  async register(
    email:     string,
    password:  string,
    fullName?: string,
  ): Promise<TokenResponse> {
    const response = await this.post<TokenResponse>('/auth/register', {
      email,
      password,
      full_name: fullName ?? null,
    })

    this.storeToken(response.access_token)
    return response
  }

  // ── Get current user ──────────────────────────────────────────────────────

  /**
   * Fetches the current user's profile from the backend.
   * Called on app mount to restore session and verify token validity.
   *
   * @throws ApiError(401) if token is missing or expired
   */
  async getMe(): Promise<UserProfile> {
    return this.get<UserProfile>('/auth/me')
  }

  // ── Role management ───────────────────────────────────────────────────────

  /**
   * Sets the role the user is currently acting as.
   * Persisted to localStorage so it survives page refreshes.
   * Must be called after the role-selector screen.
   */
  setActiveRole(role: Role): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_ROLE_KEY, role)
    }
  }

  /**
   * Returns the currently active role, or null if not set.
   */
  getActiveRole(): Role | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null
  }

  // ── Session management ────────────────────────────────────────────────────

  /**
   * Clears all auth state from localStorage and resets the session.
   * Call this on logout or on 401 responses.
   */
  logout(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ACTIVE_ROLE_KEY)
  }

  /**
   * Returns true if a token exists in localStorage.
   * Does not validate the token — call getMe() for full validation.
   */
  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(TOKEN_KEY)
  }

  /**
   * Returns the current JWT token. Public wrapper over the protected
   * base-class method so external callers (e.g. auth store) can read it.
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private storeToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
    }
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
// Import this singleton in components — don't instantiate AuthService directly.

export const authService = new AuthService()