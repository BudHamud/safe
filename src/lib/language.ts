export type SupportedLang = 'es' | 'en';

export const APP_LANGUAGE_STORAGE_KEY = 'app-lang';

export const normalizeLang = (value?: string | null): SupportedLang | null => {
    if (!value) return null;
    const baseLang = value.toLowerCase().split('-')[0];
    if (baseLang === 'es') return 'es';
    if (baseLang === 'en') return 'en';
    return null;
};

export const resolveLangFromBrowserList = (languages: Array<string | null | undefined>): SupportedLang => {
    for (const browserLang of languages) {
        const supportedLang = normalizeLang(browserLang);
        if (supportedLang) return supportedLang;
    }

    return 'en';
};