'use client'

/**
 * @file        store/auth.tsx
 * @description Global authentication context for the Groundr platform.
 *
 *              Fix 1: refresh() now correctly handles multi-role users.
 *              If no active role is stored and user has multiple roles,
 *              activeRole stays null — login page handles role selection.
 *
 *              Fix 2: isLoggedIn() checks localStorage key 'groundr_token'
 *              (not 'token') via authService.isLoggedIn().
 *
 * @layer       Store → Auth (global state)
 * @depends     lib/services/AuthService.ts, lib/types/user.ts
 * @used-by     app/layout.tsx, components/layout/DashboardShell.tsx
 */

'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/services/AuthService'
import {
  type UserProfile,
  type Role,
  type AuthState,
  ROLE_DASHBOARD,
} from '@/lib/types/user'

// ── Context type ──────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  setActiveRole: (role: Role) => void
  switchRole:    (role: Role) => void
  logout:        () => void
  refresh:       () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [user,           setUser]           = useState<UserProfile | null>(null)
  const [token,          setToken]          = useState<string | null>(null)
  const [activeRole,     setActiveRoleState] = useState<Role | null>(null)
  const [isLoading,      setIsLoading]      = useState(true)

  // ── Hydrate session on mount ──────────────────────────────────────────────

  const refresh = useCallback(async () => {
    // No token in localStorage → not logged in, stop loading immediately
    if (!authService.isLoggedIn()) {
      setIsLoading(false)
      return
    }

    try {
      const profile = await authService.getMe()
      setUser(profile)
      setToken(authService.getToken())

      // Restore stored active role if it's still valid for this user
      const storedRole = authService.getActiveRole()
      if (storedRole && profile.roles.includes(storedRole)) {
        // Previously selected role is still valid — restore it
        setActiveRoleState(storedRole)
      } else if (profile.roles.length === 1) {
        // Single-role user — auto-set, no selection needed
        setActiveRoleState(profile.roles[0])
        authService.setActiveRole(profile.roles[0])
      } else {
        // Multi-role user with no stored choice — leave null
        // Platform layout will redirect to login which shows role selector
        setActiveRoleState(null)
      }
    } catch {
      // Token expired or invalid — clear everything
      authService.logout()
      setUser(null)
      setToken(null)
      setActiveRoleState(null)
    } finally {
      // Always stop loading — this unblocks the platform layout
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // ── Actions ───────────────────────────────────────────────────────────────

  const setActiveRole = useCallback((role: Role) => {
    authService.setActiveRole(role)
    setActiveRoleState(role)
    router.push(ROLE_DASHBOARD[role])
  }, [router])

  const switchRole = useCallback((role: Role) => {
    authService.setActiveRole(role)
    setActiveRoleState(role)
    router.push(ROLE_DASHBOARD[role])
  }, [router])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setToken(null)
    setActiveRoleState(null)
    router.push('/login')
  }, [router])

  // ── Context value ─────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    user,
    token,
    activeRole,
    isLoading,
    isAuthenticated: !!user && !!token,
    setActiveRole,
    switchRole,
    logout,
    refresh,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}