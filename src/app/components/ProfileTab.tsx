import React, { useState, useMemo, useCallback, useEffect } from 'react';
import './ProfileTab.css';
import { Transaction, Category } from "../../types";
import { formatCurrency } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import { useAppContext } from '../../context/AppContext';
import { TranslationKey } from '../../context/LanguageContext';
import { BankSyncExplainer } from './BankSyncExplainer';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { useSubViewHistory } from '../../hooks/useSubViewHistory';
import { useDialog } from '../../context/DialogContext';
import { parseDate } from './movements.utils';

type ProfileTabProps = {
    userName: string;
    theme: string;
    toggleTheme: () => void;
    onLogout: () => void;
    transactions: Transaction[];
    userId: string;
    monthlyGoal: number;
    onUpdate: () => void;
    globalCurrency: 'ILS' | 'USD' | 'ARS' | 'EUR';
    onCurrencyChange: (curr: 'ILS' | 'USD' | 'ARS' | 'EUR') => void;
    availableCategories: Category[];
    onCategoryChangeInfo: () => void;
};

export const ProfileTab = ({
    userName, theme, toggleTheme, onLogout, transactions, userId,
    monthlyGoal, onUpdate, globalCurrency, onCurrencyChange,
    availableCategories, onCategoryChangeInfo
}: ProfileTabProps) => {
    const { lang, setLang, t } = useLanguage();
    const dialog = useDialog();
    const appContext = useAppContext();
    const { accessToken } = appContext;
    const currencyOptions = [
        { value: 'ILS', label: t('profile.currency_ils') },
        { value: 'USD', label: t('profile.currency_usd') },
        { value: 'EUR', label: t('profile.currency_eur') },
        { value: 'ARS', label: t('profile.currency_ars') },
    ] as const;

    const [viewMode, setViewMode] = useState<'menu' | 'categories' | 'notifications' | 'goal' | 'identity' | 'sync' | 'colors'>('menu');
    const [isExplainerOpen, setIsExplainerOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ oldTag: string; newTag: string; newIcon: string } | null>(null);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Sync
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

    // Colores — lista de variables personalizables
    const COLOR_VARS: { variable: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
        { variable: '--primary', labelKey: 'profile.color_primary', descKey: 'profile.color_primary_desc' },
        { variable: '--accent', labelKey: 'profile.color_accent', descKey: 'profile.color_accent_desc' },
        { variable: '--bg', labelKey: 'profile.color_bg', descKey: 'profile.color_bg_desc' },
        { variable: '--surface', labelKey: 'profile.color_surface', descKey: 'profile.color_surface_desc' },
        { variable: '--surface-alt', labelKey: 'profile.color_surface_alt', descKey: 'profile.color_surface_alt_desc' },
        { variable: '--text-main', labelKey: 'profile.color_text', descKey: 'profile.color_text_desc' },
        { variable: '--text-muted', labelKey: 'profile.color_text_muted', descKey: 'profile.color_text_muted_desc' },
        { variable: '--border', labelKey: 'profile.color_border', descKey: 'profile.color_border_desc' },
    ];

    // Leer colores actuales del DOM (puede ser CSS var o inline override)
    const getCurrentColor = (variable: string): string => {
        if (appContext.customColors[variable]) return appContext.customColors[variable];
        if (typeof window !== 'undefined') {
            return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#888888';
        }
        return '#888888';
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        const result = await appContext.syncNow();
        setIsSyncing(false);
        setSyncResult(result);
    };

    // Android back button: sub-view → profile menu
    useSubViewHistory(
        viewMode !== 'menu',
        useCallback(() => {
            setViewMode('menu');
            setEditingCategory(null);
        }, [])
    );
    // ──────────────────────────────────────────────────────────────────────
    const [newGoal, setNewGoal] = useState(monthlyGoal.toString());
    const [bankSyncEnabled, setBankSyncEnabled] = useState<boolean>(() =>
        typeof window !== 'undefined' && localStorage.getItem('bankSyncEnabled') === 'true'
    );
    const [autoAddEnabled, setAutoAddEnabled] = useState<boolean>(() =>
        typeof window !== 'undefined' && localStorage.getItem('bankAutoAddEnabled') === 'true'
    );

    useEffect(() => {
        setNewGoal(monthlyGoal.toString());
    }, [monthlyGoal]);

    const toggleBankSync = (val: boolean) => {
        if (val) {
            setIsExplainerOpen(true);
        } else {
            setBankSyncEnabled(false);
            (window as any).__setBankSync?.(false);
        }
    };

    const confirmBankSyncAction = () => {
        setBankSyncEnabled(true);
        (window as any).__setBankSync?.(true);
        setIsExplainerOpen(false);
    };
    const toggleAutoAdd = (val: boolean) => {
        if (val) {
            void dialog.confirm({ message: t('profile.auto_add_confirm') }).then((confirmed) => {
                if (!confirmed) return;
                localStorage.setItem('bankAutoAddConsentAt', new Date().toISOString());
                setAutoAddEnabled(val);
                (window as any).__setBankAutoAdd?.(val);
            });
            return;
        }
        setAutoAddEnabled(val);
        (window as any).__setBankAutoAdd?.(val);
    };

    const sym = globalCurrency === 'ILS' ? '₪' : (globalCurrency === 'EUR' ? '€' : '$');

    // ── Derived data ──────────────────────────────────────────
    const uniqueCategories = useMemo(() => {
        const catMap: Record<string, { tag: string; icon: string; count: number }> = {};
        availableCategories.forEach(c => {
            catMap[c.label] = { tag: c.label, icon: c.icon, count: 0 };
        });
        transactions.forEach(tx => {
            if (!catMap[tx.tag]) catMap[tx.tag] = { tag: tx.tag, icon: tx.icon, count: 0 };
            if (tx.icon && tx.icon.length < 5) catMap[tx.tag].icon = tx.icon;
            catMap[tx.tag].count += 1;
        });
        return Object.values(catMap).sort((a, b) => b.count - a.count);
    }, [transactions, availableCategories]);

    // Spending stats for goal card
    const currentDate = new Date();
    const curMonth = currentDate.getMonth();
    const curYear = currentDate.getFullYear();

    const currentMonthExpense = transactions
        .filter(t => {
            const parsed = parseDate(t.date);
            if (parsed.getTime() === 0) return false;

            return parsed.getMonth() === curMonth
                && parsed.getFullYear() === curYear
                && t.type === 'expense'
                && !t.excludeFromBudget;
        })
        .reduce((acc, t) => acc + t.amount, 0);
    const goalPct = monthlyGoal > 0 ? Math.min(Math.round((currentMonthExpense / monthlyGoal) * 100), 100) : 0;
    const daysLeft = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() - currentDate.getDate();

    const name = userName;
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // ── Actions ───────────────────────────────────────────────
    const saveCategoryEdit = async () => {
        if (!editingCategory) return;
        const oldTagNFD = editingCategory.oldTag.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let customStr = localStorage.getItem('financeCustomCategories');
        let customCats = customStr ? JSON.parse(customStr) : [];
        customCats = customCats.filter((c: any) => c.label.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") !== oldTagNFD);
        customCats.push({ id: editingCategory.newTag.toLowerCase().replace(/[^a-z0-9]/g, '-'), label: editingCategory.newTag.trim(), icon: editingCategory.newIcon });
        localStorage.setItem('financeCustomCategories', JSON.stringify(customCats));
        let hiddenStr = localStorage.getItem('financeHiddenCategories');
        let hiddenCats = hiddenStr ? JSON.parse(hiddenStr) : [];
        if (!hiddenCats.includes(editingCategory.oldTag)) {
            hiddenCats.push(editingCategory.oldTag);
            localStorage.setItem('financeHiddenCategories', JSON.stringify(hiddenCats));
        }
        try {
            const res = await fetch('/api/categories', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({ oldTag: editingCategory.oldTag, newTag: editingCategory.newTag, newIcon: editingCategory.newIcon })
            });
            if (res.ok) { onCategoryChangeInfo(); onUpdate(); setEditingCategory(null); }
            else await dialog.alert(t('profile.category_save_error'));
        } catch (e) { console.error(e); }
    };

    const deleteCategory = async (tag: string) => {
        if (!await dialog.confirm({ message: t('profile.category_delete_confirm', { tag }), tone: 'danger' })) return;
        const tagNFD = tag.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let customStr = localStorage.getItem('financeCustomCategories');
        if (customStr) {
            let customCats = JSON.parse(customStr);
            customCats = customCats.filter((c: any) => c.label.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") !== tagNFD);
            localStorage.setItem('financeCustomCategories', JSON.stringify(customCats));
        }
        let hiddenStr = localStorage.getItem('financeHiddenCategories');
        let hiddenCats = hiddenStr ? JSON.parse(hiddenStr) : [];
        if (!hiddenCats.includes(tag)) {
            hiddenCats.push(tag);
            localStorage.setItem('financeHiddenCategories', JSON.stringify(hiddenCats));
        }
        try {
            const res = await fetch(`/api/categories?oldTag=${encodeURIComponent(tag)}`, {
                method: 'DELETE',
                headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
            });
            if (res.ok) { onCategoryChangeInfo(); onUpdate(); if (editingCategory?.oldTag === tag) setEditingCategory(null); }
        } catch (e) { console.error(e); }
    };

    const saveGoal = async () => {
        try {
            const res = await fetch('/api/user', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({ monthlyGoal: parseFloat(newGoal) })
            });
            if (res.ok) { onUpdate(); setViewMode('menu'); }
            else await dialog.alert(t('profile.goal_save_error'));
        } catch (e) { console.error(e); }
    };

    const handleDeleteAccount = async () => {
        const confirmed = await dialog.confirm({ message: t('profile.delete_account_confirm'), tone: 'danger' });
        if (!confirmed) return;

        setIsDeletingAccount(true);
        try {
            const res = await fetch('/api/user', {
                method: 'DELETE',
                headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                await dialog.alert(data.error || t('profile.delete_account_error'));
                return;
            }

            await dialog.alert(t('profile.delete_account_success'));
            onLogout();
        } catch (e) {
            console.error(e);
            await dialog.alert(t('profile.delete_account_error'));
        } finally {
            setIsDeletingAccount(false);
        }
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="profile-root">
            <BankSyncExplainer
                isOpen={isExplainerOpen}
                onClose={() => setIsExplainerOpen(false)}
                onConfirm={confirmBankSyncAction}
            />
            <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

            {/* Top bar */}
            <div className="profile-topbar">
                <h1 className="profile-title">{t('profile.title')}</h1>
                {viewMode !== 'menu' && (
                    <button className="profile-back-btn" onClick={() => setViewMode('menu')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        {t('btn.back')}
                    </button>
                )}
            </div>

            {/* ── MENU VIEW ── */}
            {viewMode === 'menu' && (
                <>
                    <div className="profile-grid">

                        {/* Identity card */}
                        <div className="profile-card profile-card--identity" onClick={() => setViewMode('identity')} style={{ cursor: 'pointer' }}>
                            <div className="profile-card-label">
                                <span>{t('profile.card_identity')}</span>
                                <span className="profile-card-label-badge">{t('profile.card_identity_badge')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                                <div className="profile-avatar-row" style={{ width: '32px', height: '32px' }}>
                                    <div className="profile-avatar-initials" style={{ width: '100%', height: '100%', fontSize: '0.7rem' }}>{initials}</div>
                                </div>
                                <div className="profile-name-display" style={{ fontSize: '1.2rem', margin: 0 }}>{name}</div>
                            </div>
                            <div className="profile-devices-row" style={{ marginTop: '0.4rem' }}>
                                <div className="profile-device-dot active" style={{ width: '22px', height: '22px' }}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="17" r="1" />
                                    </svg>
                                </div>
                                <span className="profile-devices-label">{t('profile.card_manage_devices')}</span>
                            </div>
                        </div>

                        {/* Goal card */}
                        <div className="profile-card profile-card--goal" onClick={() => setViewMode('goal')} style={{ cursor: 'pointer' }}>
                            <div className="profile-card-label">
                                <span>{t('profile.card_expense_goal')}</span>
                                <span className="profile-goal-consumed">{goalPct}{t('profile.goal_consumed')}</span>
                            </div>
                            <div className="profile-goal-amount">
                                {formatCurrency(currentMonthExpense, sym)}
                                <span className="profile-goal-limit">/ {formatCurrency(monthlyGoal, sym)}</span>
                            </div>
                            <div className="profile-goal-days">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                                {t('profile.days_left_pre')} {daysLeft} {t('profile.days_left_suf')}
                            </div>
                        </div>

                        {/* Currency card */}
                        <div className="profile-card">
                            <div className="profile-card-label">{t('profile.card_currency')}</div>
                            <svg className="profile-card-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                            </svg>
                            <select
                                className="profile-currency-select"
                                value={globalCurrency}
                                onChange={e => onCurrencyChange(e.target.value as any)}
                            >
                                {currencyOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span className="profile-card-sub">{t('profile.currency_sub')}</span>
                        </div>

                        {/* Language card */}
                        <div className="profile-card">
                            <div className="profile-card-label">{t('profile.language')}</div>
                            <svg className="profile-card-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                            </svg>
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', paddingBottom: '14px' }}>
                                <button
                                    onClick={() => setLang('es')}
                                    style={{
                                        flex: 1, padding: '0.4rem',
                                        borderRadius: '8px', border: 'none',
                                        fontWeight: 900, fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        background: lang === 'es' ? 'var(--primary)' : 'var(--surface-alt)',
                                        color: lang === 'es' ? 'var(--primary-text)' : 'var(--text-muted)',
                                        transition: 'all 0.2s',
                                    }}
                                >🇦🇷 ES</button>
                                <div style={{ flex: 1 }}>
                                    <button
                                        onClick={() => setLang('en')}
                                        style={{
                                            width: '100%', padding: '0.4rem',
                                            borderRadius: '8px', border: 'none',
                                            fontWeight: 900, fontSize: '0.72rem',
                                            cursor: 'pointer',
                                            background: lang === 'en' ? 'var(--primary)' : 'var(--surface-alt)',
                                            color: lang === 'en' ? 'var(--primary-text)' : 'var(--text-muted)',
                                            transition: 'all 0.2s',
                                        }}
                                    >🇬🇧 EN</button>
                                </div>
                            </div>
                            <span className="profile-card-sub">{lang === 'es' ? t('profile.language_name_es') : t('profile.language_name_en')}</span>
                        </div>

                    </div>{/* end profile-grid */}

                    {/* Banking integration row */}
                    <div className="profile-row-item" onClick={() => setViewMode('notifications')}>
                        <div className="profile-row-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.6" />
                            </svg>
                        </div>
                        <div className="profile-row-content">
                            <div className="profile-row-sublabel">{t('profile.bank_integration')}</div>
                            <div className="profile-row-value">{bankSyncEnabled ? t('profile.bank_linked') : t('profile.bank_unlinked')}</div>
                        </div>
                        <div className="profile-row-arrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </div>

                    {/* Categories row */}
                    <div className="profile-row-item" onClick={() => setViewMode('categories')}>
                        <div className="profile-row-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </div>
                        <div className="profile-row-content">
                            <div className="profile-row-sublabel">{t('profile.categories_row')}</div>
                            <div className="profile-row-cat-icons">
                                {uniqueCategories.slice(0, 4).map(c => (
                                    <span className="profile-row-cat-icon" key={c.tag}>{c.icon || '🏷️'}</span>
                                ))}
                                {uniqueCategories.length > 4 && (
                                    <span className="profile-row-cat-more">+{uniqueCategories.length - 4}</span>
                                )}
                            </div>
                        </div>
                        <div className="profile-row-arrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </div>

                    {/* Sync row */}
                    <div className="profile-row-item" onClick={() => { setViewMode('sync'); setSyncResult(null); }}>
                        <div className="profile-row-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                            </svg>
                        </div>
                        <div className="profile-row-content">
                            <div className="profile-row-sublabel">{t('profile.sync_title')}</div>
                            <div className="profile-row-value" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                {appContext.isOnline
                                    ? (appContext.pendingOpsCount > 0
                                        ? <span style={{ color: 'var(--accent)' }}>⚠ {appContext.pendingOpsCount} {t('profile.sync_pending')}</span>
                                        : <span style={{ color: 'var(--primary)' }}>✓ {t('profile.sync_none')}</span>)
                                    : <span style={{ color: 'var(--accent)' }}>✕ {t('profile.sync_status_offline')}</span>
                                }
                            </div>
                        </div>
                        <div className="profile-row-arrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </div>

                    {/* Colors row */}
                    <div className="profile-row-item" onClick={() => appContext.setIsColorMode(true)}>
                        <div className="profile-row-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                        </div>
                        <div className="profile-row-content">
                            <div className="profile-row-sublabel">{t('profile.colors_title')}</div>
                            <div className="profile-row-value" style={{ fontSize: '0.72rem', fontWeight: 700, display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                                {['--primary', '--accent', '--bg', '--surface'].map(v => (
                                    <span key={v} style={{
                                        width: '14px', height: '14px', borderRadius: '3px',
                                        background: appContext.customColors[v] || `var(${v})`,
                                        border: '1px solid var(--border)'
                                    }} />
                                ))}
                                {Object.keys(appContext.customColors).length > 0 &&
                                    <span style={{ fontSize: '0.55rem', color: 'var(--primary)', fontWeight: 800 }}>{t('profile.appearance_badge_custom')}</span>
                                }
                            </div>
                        </div>
                        <div className="profile-row-arrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </div>

                    {/* Logout */}
                    <button className="profile-logout" onClick={onLogout}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        {t('profile.logout')}
                    </button>
                </>
            )}

            {/* ── CATEGORIES VIEW ── */}
            {viewMode === 'categories' && (
                <div>
                    <div className="profile-subview-label">{t('profile.categories_title')}</div>

                    {!editingCategory ? (
                        <div className="profile-cat-list">
                            {uniqueCategories.map(cat => (
                                <div key={cat.tag} className="profile-cat-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div className="profile-cat-icon-box">{cat.icon || '🏷️'}</div>
                                        <div>
                                            <div className="profile-cat-name">{cat.tag}</div>
                                            <div className="profile-cat-count">{cat.count} {t('profile.cat_tx_count')}</div>
                                        </div>
                                    </div>
                                    <div className="profile-cat-actions">
                                        <button
                                            className="profile-cat-btn-edit"
                                            onClick={() => setEditingCategory({ oldTag: cat.tag, newTag: cat.tag, newIcon: cat.icon || '🏷️' })}
                                        >
                                            {t('btn.edit')}
                                        </button>
                                        <button className="profile-cat-btn-del" onClick={() => deleteCategory(cat.tag)}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="profile-cat-edit-form">
                            <div>
                                <span className="profile-edit-field-label">{t('profile.cat_new_emoji')}</span>
                                <input
                                    className="profile-edit-emoji-input"
                                    value={editingCategory.newIcon}
                                    onChange={e => setEditingCategory({ ...editingCategory, newIcon: e.target.value })}
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <span className="profile-edit-field-label">{t('profile.cat_new_name')}</span>
                                <input
                                    className="profile-edit-text-input"
                                    value={editingCategory.newTag}
                                    onChange={e => setEditingCategory({ ...editingCategory, newTag: e.target.value })}
                                />
                            </div>
                            <div className="profile-edit-actions">
                                <button className="profile-edit-cancel" onClick={() => setEditingCategory(null)}>{t('btn.cancel')}</button>
                                <button className="profile-edit-save" onClick={saveCategoryEdit}>{t('profile.apply_all')}</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── NOTIFICATIONS VIEW ── */}
            {viewMode === 'notifications' && (
                <div>
                    <div className="profile-subview-label">{t('profile.autosync_title')}</div>

                    <div className="profile-notif-card">
                        <p className="profile-notif-desc">
                            {t('profile.notif_disclosure')}
                        </p>
                        <button
                            type="button"
                            className="profile-notif-link"
                            onClick={() => setIsPrivacyOpen(true)}
                            style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                        >
                            {t('profile.notif_privacy_link')}
                        </button>
                        <div className="profile-notif-toggle-row">
                            <span className="profile-notif-toggle-label">{t('profile.notif_banks')}</span>
                            <button
                                className={`profile-toggle ${bankSyncEnabled ? 'profile-toggle--on' : 'profile-toggle--off'}`}
                                onClick={() => toggleBankSync(!bankSyncEnabled)}
                            >
                                <span className="profile-toggle-thumb" />
                            </button>
                        </div>
                        <div className="profile-notif-toggle-row" style={{ opacity: bankSyncEnabled ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                            <div>
                                <span className="profile-notif-toggle-label">{t('profile.notif_auto_save')}</span>
                                <div className="profile-notif-toggle-help">{t('profile.notif_auto_save_help')}</div>
                            </div>
                            <button
                                className={`profile-toggle ${autoAddEnabled ? 'profile-toggle--on' : 'profile-toggle--off'}`}
                                onClick={() => { if (bankSyncEnabled) toggleAutoAdd(!autoAddEnabled); }}
                                disabled={!bankSyncEnabled}
                            >
                                <span className="profile-toggle-thumb" />
                            </button>
                        </div>
                    </div>

                    <div className="profile-notif-beta">{t('profile.notif_beta')}</div>
                </div>
            )}

            {/* ── IDENTITY VIEW ── */}
            {viewMode === 'identity' && (
                <div className="profile-identity-subview">
                    <div className="profile-subview-label">{t('profile.user_profile')}</div>

                    <div className="profile-identity-edit-section">
                        <div className="profile-avatar-large">{initials}</div>
                        {/* TODO: implementar subida de foto — deshabilitado hasta S3/Cloudinary */}
                        <button
                            className="profile-photo-btn"
                            disabled
                            title={t('profile.soon')}
                            style={{ opacity: 0.35, cursor: 'not-allowed' }}
                        >
                            {t('profile.change_photo')}
                        </button>

                        <div className="profile-form-group">
                            <label>{t('profile.username_label')}</label>
                            <div className="profile-text-input-shell">
                                <div className="profile-text-display">{name}</div>
                                <span className="profile-text-input-icon" aria-hidden="true">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="5" y="11" width="14" height="10" rx="2" />
                                        <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                                    </svg>
                                </span>
                            </div>
                        </div>

                        <div className="profile-identity-action-grid">
                            <div className="profile-identity-travel-card">
                                <div className="profile-identity-travel-top">
                                    <div>
                                        <div className="profile-identity-travel-label">{t('profile.travel_mode')}</div>
                                        <div className="profile-identity-travel-status">
                                            {t('travel.disabled')}
                                        </div>
                                    </div>
                                    <button
                                        className="profile-toggle profile-identity-travel-toggle profile-toggle--off"
                                        onClick={undefined}
                                        disabled
                                        style={{ opacity: 0.45, cursor: 'not-allowed' }}
                                    >
                                        <span className="profile-toggle-thumb" />
                                    </button>
                                </div>
                                <p className="profile-identity-travel-desc">{t('profile.travel_mode_disabled_desc')}</p>
                                <p className="profile-identity-travel-help">{t('profile.travel_mode_disabled_help')}</p>
                            </div>

                            <div className="profile-identity-danger-card">
                                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {t('profile.delete_account_title')}
                                </div>
                                <p style={{ fontSize: '0.7rem', lineHeight: 1.6, color: 'var(--text-muted)', margin: '0.55rem 0 0.85rem' }}>
                                    {t('profile.delete_account_desc')}
                                </p>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeletingAccount}
                                    style={{ width: '100%', border: '1px solid var(--accent)', background: isDeletingAccount ? 'var(--surface-alt)' : 'transparent', color: 'var(--accent)', borderRadius: '10px', padding: '0.7rem 0.85rem', cursor: isDeletingAccount ? 'default' : 'pointer', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit', opacity: isDeletingAccount ? 0.65 : 1 }}
                                >
                                    {isDeletingAccount ? t('profile.delete_account_loading') : t('profile.delete_account_action')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TODO: OAuth (Google, GitHub) — pendiente de implementación */}
                    <div style={{ position: 'relative' }}>
                        <div className="profile-subview-label profile-subview-header">
                            {t('profile.social_links')}
                            <span className="profile-soon-badge">{t('profile.soon')}</span>
                        </div>
                        <div className="profile-social-list" style={{ opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
                            <div className="profile-social-item">
                                <div className="profile-social-info">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="10" /><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4c2.21 0 4-1.79 4-4s-1.79-4-4-4zm4.83 2c-.17-.67-.5-1.28-.96-1.77L15 9.06c.31.33.53.74.64 1.18h1.19zM8.17 14c.17.67.5 1.28.96 1.77L10 14.94c-.31-.33-.53-.74-.64-1.18H8.17z" />
                                    </svg>
                                    <span>{t('profile.google_account')}</span>
                                </div>
                                <button className="profile-social-btn active" disabled>{t('profile.unlink')}</button>
                            </div>
                            <div className="profile-social-item">
                                <div className="profile-social-info">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                                    </svg>
                                    <span>{t('profile.github_repository')}</span>
                                </div>
                                <button className="profile-social-btn" disabled>{t('profile.link')}</button>
                            </div>
                        </div>
                    </div>

                    {/* TODO: session management — pendiente de backend (tabla sessions/devices) */}
                    <div style={{ position: 'relative' }}>
                        <div className="profile-subview-label profile-subview-header">
                            {t('profile.linked_devices')}
                            <span className="profile-soon-badge">{t('profile.soon')}</span>
                        </div>
                        <div className="profile-device-list" style={{ opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
                            <div className="profile-device-item">
                                <div className="profile-device-icon-wrap">📱</div>
                                <div className="profile-device-details">
                                    <div className="profile-device-name">{t('profile.device_current_example')}</div>
                                    <div className="profile-device-meta">{t('profile.device_current_meta')}</div>
                                </div>
                                <div className="profile-device-status">{t('profile.device_online')}</div>
                            </div>
                            <div className="profile-device-item">
                                <div className="profile-device-icon-wrap">💻</div>
                                <div className="profile-device-details">
                                    <div className="profile-device-name">{t('profile.device_secondary_example')}</div>
                                    <div className="profile-device-meta">{t('profile.device_secondary_meta')}</div>
                                </div>
                                <button className="profile-device-logout" disabled>{t('profile.close_session')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── GOAL VIEW ── */}
            {viewMode === 'goal' && (
                <div>
                    <div className="profile-subview-label">{t('profile.configure_goal')}</div>

                    <div className="profile-goal-form">
                        <div>
                            <span className="profile-edit-field-label">{t('profile.goal_max_amount')} ({sym})</span>
                            <div className="profile-goal-input-wrap">
                                <span className="profile-goal-sym">{sym}</span>
                                <input
                                    className="profile-goal-input"
                                    type="number"
                                    value={newGoal}
                                    onChange={e => setNewGoal(e.target.value)}
                                />
                            </div>
                        </div>
                        <p className="profile-goal-hint">
                            {t('profile.goal_hint')}
                        </p>
                        <div className="profile-goal-actions">
                            <button className="profile-goal-cancel" onClick={() => setViewMode('menu')}>{t('btn.cancel')}</button>
                            <button className="profile-goal-save" onClick={saveGoal}>{t('profile.goal_save_btn')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SYNC VIEW ── */}
            {viewMode === 'sync' && (
                <div>
                    <div className="profile-subview-label">{t('profile.sync_subview_title')}</div>

                    {/* Estado de conexión */}
                    <div className="profile-sync-status-row">
                        <div className={`profile-sync-dot ${appContext.isOnline ? 'profile-sync-dot--on' : 'profile-sync-dot--off'}`} />
                        <span className="profile-sync-status-label">
                            {appContext.isOnline ? t('profile.sync_status_online') : t('profile.sync_status_offline')}
                        </span>
                    </div>

                    {/* Contador de pendientes */}
                    <div className="profile-sync-card">
                        <div className="profile-sync-count">
                            <span className="profile-sync-count-num" style={{ color: appContext.pendingOpsCount > 0 ? 'var(--accent)' : 'var(--primary)' }}>
                                {appContext.pendingOpsCount}
                            </span>
                            <span className="profile-sync-count-label">{t('profile.sync_pending')}</span>
                        </div>
                        {appContext.pendingOpsCount === 0 && (
                            <p className="profile-sync-all-ok">✓ {t('profile.sync_none')}</p>
                        )}
                    </div>

                    {/* Resultado de última sync */}
                    {syncResult && (
                        <div className="profile-sync-result">
                            <span style={{ color: 'var(--primary)' }}>✓ {syncResult.synced} {t('profile.sync_result_ok')}</span>
                            {syncResult.failed > 0 && (
                                <span style={{ color: 'var(--accent)' }}> · ✕ {syncResult.failed} {t('profile.sync_result_fail')}</span>
                            )}
                        </div>
                    )}

                    {/* Botón sincronizar */}
                    <button
                        className="profile-sync-btn"
                        onClick={handleSync}
                        disabled={isSyncing || !appContext.isOnline || appContext.pendingOpsCount === 0}
                    >
                        {isSyncing ? (
                            <><span className="profile-sync-spinner" /> {t('profile.sync_syncing')}</>
                        ) : (
                            <>{t('profile.sync_btn')}</>
                        )}
                    </button>

                    {!appContext.isOnline && (
                        <p className="profile-sync-offline-note">⚠ {t('profile.sync_offline_warn')}</p>
                    )}
                </div>
            )}

            {/* ── COLORS VIEW ── */}
            {viewMode === 'colors' && (
                <div>
                    <div className="profile-subview-label">{t('profile.colors_subview_title')}</div>

                    <div className="profile-color-list">
                        {COLOR_VARS.map(({ variable, labelKey, descKey }) => (
                            <div key={variable} className="profile-color-row">
                                <div className="profile-color-info">
                                    <div className="profile-color-name">{t(labelKey)}</div>
                                    <div className="profile-color-desc">{t(descKey)}</div>
                                    <div className="profile-color-var">{variable}</div>
                                </div>
                                <div className="profile-color-picker-wrap">
                                    <span
                                        className="profile-color-preview"
                                        style={{ background: getCurrentColor(variable) }}
                                    />
                                    <input
                                        type="color"
                                        className="profile-color-input"
                                        value={appContext.customColors[variable] || '#000000'}
                                        onChange={e => appContext.setCustomColor(variable, e.target.value)}
                                        title={`${t('profile.appearance_change_color')}: ${t(labelKey)}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {Object.keys(appContext.customColors).length > 0 && (
                        <button
                            className="profile-colors-reset-btn"
                            onClick={async () => {
                                if (await dialog.confirm({ message: t('profile.colors_reset_confirm') })) {
                                    appContext.resetCustomColors();
                                }
                            }}
                        >
                            ↺ {t('profile.colors_reset')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
