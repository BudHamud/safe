"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, Lang, TranslationKey } from '../i18n/translations';

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
        return translations[key]?.[lang] ?? translations[key]?.['es'] ?? key;
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
