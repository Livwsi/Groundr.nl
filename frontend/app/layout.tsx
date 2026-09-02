/**
 * @file        app/layout.tsx
 * @description Root layout for the Groundr platform.
 *              Wraps the entire app in AuthProvider and LanguageProvider
 *              so auth state and language are available everywhere.
 *
 *              Provider order (outer → inner):
 *                LanguageProvider  — i18n (nl/en)
 *                AuthProvider      — user, token, active role
 *
 * @layer       App → Root Layout
 * @depends     store/auth.tsx, store/language.tsx
 * @used-by     All pages
 */

import type { Metadata } from 'next'
import { LanguageProvider } from '@/store/language'
import { AuthProvider } from '@/store/auth'
import './globals.css'

export const metadata: Metadata = {
  title:       'Groundr — Real estate platform for professionals',
  description: 'The all-in-one platform for Dutch real estate agents, appraisers and notaries.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}