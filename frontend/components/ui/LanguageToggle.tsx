// ─────────────────────────────────────────────────────────────
// frontend/components/ui/LanguageToggle.tsx
// Drop into any nav — renders NL | EN toggle
// ─────────────────────────────────────────────────────────────

'use client'

import { useLanguage } from '@/store/language'

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex items-center gap-0 text-xs font-bold"
      style={{ border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden' }}>
      <button
        onClick={() => setLang('nl')}
        className="px-2.5 py-1 transition-colors"
        style={{
          background: lang === 'nl' ? 'rgba(47,197,134,0.15)' : 'transparent',
          color:      lang === 'nl' ? '#2fc586' : 'rgba(255,255,255,0.35)',
        }}
      >
        NL
      </button>
      <div style={{ width: '1px', background: 'rgba(255,255,255,0.12)', height: '100%' }} />
      <button
        onClick={() => setLang('en')}
        className="px-2.5 py-1 transition-colors"
        style={{
          background: lang === 'en' ? 'rgba(47,197,134,0.15)' : 'transparent',
          color:      lang === 'en' ? '#2fc586' : 'rgba(255,255,255,0.35)',
        }}
      >
        EN
      </button>
    </div>
  )
}