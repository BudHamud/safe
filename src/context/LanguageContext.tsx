"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import en from '../i18n/en.json';
import es from '../i18n/es.json';

export type Lang = 'es' | 'en';
export type TranslationKey = keyof typeof en;

const DICTS: Record<Lang, Record<string, string>> = { en, es };

interface LanguageContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [lang, setLangState] = useState<Lang>(() => {
        if (typeof window === 'undefined') return 'es';
        return (localStorage.getItem('app-lang') as Lang) ?? 'es';
    });

    const setLang = useCallback((newLang: Lang) => {
        setLangState(newLang);
        localStorage.setItem('app-lang', newLang);
    }, []);

    const t = useCallback((key: TranslationKey): string => {
        return DICTS[lang]?.[key] ?? DICTS['es']?.[key] ?? key;
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
    return ctx;
};
