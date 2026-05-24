// ─────────────────────────────────────────────────────────────
// frontend/store/language.tsx
// Global language context — wrap app in <LanguageProvider>
// Usage: const { lang, setLang, t } = useLanguage()
// ─────────────────────────────────────────────────────────────

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Lang, TranslationKey, t as translate } from '@/lib/i18n'

interface LanguageContextType {
  lang:    Lang
  setLang: (lang: Lang) => void
  t:       (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang:    'nl',
  setLang: () => {},
  t:       (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('nl')

  useEffect(() => {
    const saved = localStorage.getItem('groundr_lang') as Lang
    if (saved === 'nl' || saved === 'en') setLangState(saved)
  }, [])

  function setLang(newLang: Lang) {
    setLangState(newLang)
    localStorage.setItem('groundr_lang', newLang)
  }

  const t = (key: TranslationKey) => translate(key, lang)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}