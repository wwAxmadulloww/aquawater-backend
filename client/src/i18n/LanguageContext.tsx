import React, { createContext, useContext, useState, ReactNode } from 'react'
import { uz } from './uz'
import { ru } from './ru'
import { en } from './en'
import type { TranslationKey } from './uz'

type Language = 'uz' | 'ru' | 'en'

const dictionaries = { uz, ru, en }

interface LanguageContextType {
    lang: Language
    setLang: (l: Language) => void
    t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>(() => {
        const saved = localStorage.getItem('aq_lang')
        return (saved as Language) || 'uz'
    })

    const setLang = (l: Language) => {
        setLangState(l)
        localStorage.setItem('aq_lang', l)
    }

    const t = (key: TranslationKey): string => {
        const dict = dictionaries[lang] as Record<string, string>
        return dict[key] || (dictionaries.uz as Record<string, string>)[key] || key
    }

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const ctx = useContext(LanguageContext)
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
    return ctx
}
