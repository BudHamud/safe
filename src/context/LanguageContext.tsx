"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import { APP_LANGUAGE_STORAGE_KEY, normalizeLang, resolveLangFromBrowserList } from '../lib/language';

export type Lang = 'es' | 'en';
export type TranslationKey = keyof typeof en;

const DICTS: Record<Lang, Record<string, string>> = { en, es };

interface LanguageContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const persistLang = (newLang: Lang) => {
    localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, newLang);
    document.cookie = `${APP_LANGUAGE_STORAGE_KEY}=${newLang}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = newLang;
};

export const LanguageProvider = ({ children, initialLang = 'es' }: { children: React.ReactNode; initialLang?: Lang }) => {
    const [lang, setLangState] = useState<Lang>(initialLang);

    useEffect(() => {
        const storedLang = normalizeLang(localStorage.getItem(APP_LANGUAGE_STORAGE_KEY));
        const browserLang = resolveLangFromBrowserList(
            Array.isArray(navigator.languages) && navigator.languages.length > 0
                ? navigator.languages
                : [navigator.language]
        );
        const resolvedLang = storedLang ?? browserLang;

        if (resolvedLang !== lang) {
            setLangState(resolvedLang);
        }

        persistLang(resolvedLang);
    }, []);

    const setLang = useCallback((newLang: Lang) => {
        setLangState(newLang);
        persistLang(newLang);
    }, []);

    const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
        const template = DICTS[lang]?.[key] ?? DICTS['es']?.[key] ?? key;
        if (!params) return template;
        return Object.entries(params).reduce((result, [paramKey, value]) => {
            return result.replaceAll(`{${paramKey}}`, String(value));
        }, template);
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
