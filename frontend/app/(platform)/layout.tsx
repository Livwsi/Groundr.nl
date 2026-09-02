/**
 * @file        app/(platform)/layout.tsx
 * @description Simple auth guard - reads token directly from localStorage.
 *              No AuthContext dependency - avoids all hydration/loop issues.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Read directly from localStorage - no context needed
    const token = localStorage.getItem('groundr_token')
    const role  = localStorage.getItem('groundr_active_role')

    if (!token) {
      const path = window.location.pathname + window.location.search
      router.replace('/login?after_login=' + encodeURIComponent(path))
      return
    }

    if (!role) {
      router.replace('/login')
      return
    }

    // Token and role exist - allow render
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#F4F6F9',
      }}>
        <div style={{
          width: '28px', height: '28px',
          border: '2px solid #E2E5EA',
          borderTopColor: '#059669',
          borderRadius: '50%',
          animation: 'groundr-spin 0.6s linear infinite',
        }} />
      </div>
    )
  }

  return <DashboardShell>{children}</DashboardShell>
}