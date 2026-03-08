"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Transaction, Category } from "../types";
import {
    cacheTransactions,
    getCachedTransactions,
    putCachedTransaction,
    removeCachedTransaction,
    addPendingOp,
    getPendingOps,
    removePendingOp,
    removePendingCreateForTempId,
    getPendingOpsCount,
} from "../lib/db";
import {
    WidgetColors,
    COLOR_PRESETS,
    buildColorStylesheet,
    injectColorStylesheet,
} from "../lib/colorSystem";

type GlobalContextType = {
    isClient: boolean;
    userId: string | null;
    userName: string | null;
    accessToken: string | null;
    userGoal: number;
    theme: string;
    globalCurrency: 'ILS' | 'USD' | 'ARS' | 'EUR';
    transactions: Transaction[];
    mappedTransactions: Transaction[];
    selectedTransaction: Transaction | null;
    travelModeStart: string | null;
    allCategories: Category[];
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;
    savingsTarget: number;

    // Offline
    isOnline: boolean;
    pendingOpsCount: number;
    syncNow: () => Promise<{ synced: number; failed: number }>;

    // Colores personalizados (globales)
    customColors: Record<string, string>;
    setCustomColor: (variable: string, color: string) => void;
    resetCustomColors: () => void;

    // Modo personalización interactiva
    isColorMode: boolean;
    setIsColorMode: (v: boolean) => void;
    activeColorZone: string | null;
    setActiveColorZone: (zone: string | null) => void;

    // Colores por widget zone
    widgetColors: WidgetColors;
    setWidgetColor: (zone: string, variable: string, color: string) => void;
    resetWidgetColors: (zone?: string) => void;
    applyColorPreset: (presetId: string) => void;

    setTheme: (t: string) => void;
    toggleTheme: () => void;
    handleLogin: (uid: string, un: string, token?: string) => void;
    handleLogout: () => void;
    handleCurrencyChange: (curr: 'ILS' | 'USD' | 'ARS' | 'EUR') => void;
    toggleTravelMode: () => void;
    saveTransaction: (tx: Transaction) => Promise<void>;
    handleDeleteTransaction: (id: string) => Promise<void>;
    setSelectedTransaction: (tx: Transaction | null) => void;
    loadUserData: (uid: string) => void;
    loadUserTransactions: (uid: string) => void;
    setCatSignal: React.Dispatch<React.SetStateAction<number>>;

    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    addModalInitialData: Partial<Transaction> | null;
    setAddModalInitialData: (data: Partial<Transaction> | null) => void;
};

const AppContext = createContext<GlobalContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [isClient, setIsClient] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [userGoal, setUserGoal] = useState<number>(3000);
    const [theme, setTheme] = useState("dark");
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [globalCurrency, setGlobalCurrency] = useState<'ILS' | 'USD' | 'ARS' | 'EUR'>('ILS');
    const [travelModeStart, setTravelModeStart] = useState<string | null>(null);
    const [catSignal, setCatSignal] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addModalInitialData, setAddModalInitialData] = useState<Partial<Transaction> | null>(null);
    const savingsTarget = 200;

    // Offline
    const [isOnline, setIsOnline] = useState(true);
    const [pendingOpsCount, setPendingOpsCount] = useState(0);

    // Colores personalizados
    const [customColors, setCustomColorsState] = useState<Record<string, string>>({});
    const [isColorMode, setIsColorMode] = useState(false);
    const [activeColorZone, setActiveColorZone] = useState<string | null>(null);
    const [widgetColors, setWidgetColorsState] = useState<WidgetColors>({});

    const clearPersistedSession = () => {
        setUserId(null);
        setUserName(null);
        setAccessToken(null);
        setTransactions([]);
        setSelectedTransaction(null);
        setPendingOpsCount(0);
        localStorage.removeItem("financeUserId");
        localStorage.removeItem("financeUserName");
        localStorage.removeItem("financeAccessToken");
    };

    useEffect(() => {
        setIsClient(true);

        // Online/offline detection
        setIsOnline(navigator.onLine);
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        const storedTheme = localStorage.getItem("app-theme") || "dark";
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);

        const storedCurrency = localStorage.getItem("app-currency") as 'ILS' | 'USD' | 'ARS' | 'EUR';
        if (storedCurrency) setGlobalCurrency(storedCurrency);

        // Colores personalizados + widget overrides
        try {
            const storedColors: Record<string, string> = JSON.parse(localStorage.getItem('financeCustomColors') || '{}');
            const storedWidgetColors: WidgetColors = JSON.parse(localStorage.getItem('financeWidgetColors') || '{}');
            if (Object.keys(storedColors).length > 0) setCustomColorsState(storedColors);
            if (Object.keys(storedWidgetColors).length > 0) setWidgetColorsState(storedWidgetColors);
            const css = buildColorStylesheet(storedColors, storedWidgetColors);
            if (css) injectColorStylesheet(css);
        } catch (e) { /* ignorar */ }

        const storedUserId = localStorage.getItem("financeUserId");
        const storedUserName = localStorage.getItem("financeUserName");
        const storedToken = localStorage.getItem("financeAccessToken");
        if (storedUserId && storedUserName && storedToken) {
            setUserId(storedUserId);
            setUserName(storedUserName);
            setAccessToken(storedToken);
            loadUserData(storedUserId, storedToken);
            getPendingOpsCount(storedUserId).then(setPendingOpsCount);
        } else if (storedUserId || storedUserName || storedToken) {
            clearPersistedSession();
        }

        const storedTravel = localStorage.getItem('financeTravelModeStart');
        if (storedTravel) {
            setTravelModeStart(storedTravel);
            document.documentElement.setAttribute('data-travel', 'true');
        } else {
            document.documentElement.removeAttribute('data-travel');
        }

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    const loadUserData = async (uid: string, token?: string | null) => {
        const tok = token ?? accessToken;
        if (!tok) return;
        loadUserTransactions(uid, tok);
        try {
            const res = await fetch(`/api/user`, {
                headers: tok ? { 'Authorization': `Bearer ${tok}` } : {},
            });
            if (res.status === 401) {
                clearPersistedSession();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                if (data.monthlyGoal) setUserGoal(data.monthlyGoal);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadUserTransactions = async (uid: string, token?: string | null) => {
        const tok = token ?? accessToken;
        if (!tok) return;
        try {
            const res = await fetch(`/api/transactions`, {
                headers: tok ? { 'Authorization': `Bearer ${tok}` } : {},
            });
            if (res.status === 401) {
                clearPersistedSession();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
                cacheTransactions(uid, data).catch(() => { });
            } else {
                const cached = await getCachedTransactions(uid);
                if (cached.length > 0) setTransactions(cached);
            }
        } catch (e) {
            console.warn('[Offline] Cargando transacciones desde caché local');
            const cached = await getCachedTransactions(uid);
            if (cached.length > 0) setTransactions(cached);
        }
    };

    const saveTransaction = async (newTx: Transaction) => {
        if (!userId) return;

        if (!navigator.onLine) {
            // OFFLINE: guardar localmente con ID temporal
            const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const localTx: Transaction = { ...newTx, id: tempId };
            await putCachedTransaction(userId, localTx);
            await addPendingOp({ opType: 'create', data: localTx, userId, timestamp: Date.now() });
            const newCount = await getPendingOpsCount(userId);
            setPendingOpsCount(newCount);
            setTransactions(prev => [localTx, ...prev]);
            setIsAddModalOpen(false);
            return;
        }

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({ ...newTx, userId })
            });

            if (res.ok) {
                const savedTx = await res.json();
                if (savedTx) {
                    await putCachedTransaction(userId, savedTx);
                    setTransactions(prev => [savedTx, ...prev.filter(Boolean)]);
                }
                setIsAddModalOpen(false);
            }
        } catch (e) {
            console.error("No se pudo guardar", e);
        }
    };

    const handleDeleteTransaction = async (txId: string) => {
        if (!userId) return;

        // ID temporal (creado offline): solo borrar localmente y cancelar el create pendiente
        if (txId.startsWith('offline_')) {
            await removeCachedTransaction(txId);
            await removePendingCreateForTempId(txId);
            const newCount = await getPendingOpsCount(userId);
            setPendingOpsCount(newCount);
            setTransactions(prev => prev.filter(t => t.id !== txId));
            return;
        }

        if (!navigator.onLine) {
            // OFFLINE: encolar eliminación
            await removeCachedTransaction(txId);
            await addPendingOp({ opType: 'delete', data: { id: txId }, userId, timestamp: Date.now() });
            const newCount = await getPendingOpsCount(userId);
            setPendingOpsCount(newCount);
            setTransactions(prev => prev.filter(t => t.id !== txId));
            return;
        }

        try {
            const res = await fetch(`/api/transactions?id=${txId}`, {
                method: 'DELETE',
                headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
            });
            if (res.ok) {
                await removeCachedTransaction(txId);
                setTransactions(prev => prev.filter(t => t.id !== txId));
            }
        } catch (e) {
            console.error("No se pudo borrar", e);
        }
    };

    /** Sincroniza las operaciones pendientes con el servidor */
    const syncNow = async (): Promise<{ synced: number; failed: number }> => {
        if (!userId) return { synced: 0, failed: 0 };
        const ops = await getPendingOps(userId);
        let synced = 0;
        let failed = 0;
        const idReplacements: Record<string, Transaction> = {};
        const deletedIds: string[] = [];

        for (const op of ops) {
            try {
                if (op.opType === 'create') {
                    const res = await fetch('/api/transactions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                        },
                        body: JSON.stringify({ ...op.data, userId }),
                    });
                    if (res.ok) {
                        const serverTx: Transaction = await res.json();
                        await removeCachedTransaction(op.data.id);
                        await putCachedTransaction(userId, serverTx);
                        idReplacements[op.data.id] = serverTx;
                        await removePendingOp(op.localId!);
                        synced++;
                    } else { failed++; }
                } else if (op.opType === 'delete') {
                    const res = await fetch(`/api/transactions?id=${op.data.id}`, {
                        method: 'DELETE',
                        headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
                    });
                    if (res.ok) {
                        await removeCachedTransaction(op.data.id);
                        deletedIds.push(op.data.id);
                        await removePendingOp(op.localId!);
                        synced++;
                    } else { failed++; }
                }
            } catch (e) { failed++; }
        }

        setTransactions(prev => {
            let result = prev.map(t => idReplacements[t.id] ? idReplacements[t.id] : t);
            result = result.filter(t => !deletedIds.includes(t.id));
            return result;
        });
        const newCount = await getPendingOpsCount(userId);
        setPendingOpsCount(newCount);
        return { synced, failed };
    };

    // ── Color customization ──────────────────────────────────────────────────

    const setCustomColor = (variable: string, color: string) => {
        const newColors = { ...customColors, [variable]: color };
        setCustomColorsState(newColors);
        injectColorStylesheet(buildColorStylesheet(newColors, widgetColors));
        localStorage.setItem('financeCustomColors', JSON.stringify(newColors));
    };

    const resetCustomColors = () => {
        setCustomColorsState({});
        setWidgetColorsState({});
        injectColorStylesheet('');
        localStorage.removeItem('financeCustomColors');
        localStorage.removeItem('financeWidgetColors');
        localStorage.removeItem('financeActivePreset');
    };

    // ── Widget color system ─────────────────────────────────────────────

    const setWidgetColor = (zone: string, variable: string, color: string) => {
        const newWidgetColors: WidgetColors = {
            ...widgetColors,
            [zone]: { ...(widgetColors[zone] || {}), [variable]: color },
        };
        setWidgetColorsState(newWidgetColors);
        injectColorStylesheet(buildColorStylesheet(customColors, newWidgetColors));
        localStorage.setItem('financeWidgetColors', JSON.stringify(newWidgetColors));
    };

    const resetWidgetColors = (zone?: string) => {
        const newWidgetColors: WidgetColors = zone
            ? Object.fromEntries(Object.entries(widgetColors).filter(([k]) => k !== zone))
            : {};
        setWidgetColorsState(newWidgetColors);
        injectColorStylesheet(buildColorStylesheet(customColors, newWidgetColors));
        if (Object.keys(newWidgetColors).length > 0) {
            localStorage.setItem('financeWidgetColors', JSON.stringify(newWidgetColors));
        } else {
            localStorage.removeItem('financeWidgetColors');
        }
    };

    const applyColorPreset = (presetId: string) => {
        const preset = COLOR_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const newColors = preset.colors;
        const newWidgetColors: WidgetColors = {};
        setCustomColorsState(newColors);
        setWidgetColorsState(newWidgetColors);
        injectColorStylesheet(buildColorStylesheet(newColors, newWidgetColors));
        localStorage.setItem('financeCustomColors', JSON.stringify(newColors));
        localStorage.removeItem('financeWidgetColors');
        localStorage.setItem('financeActivePreset', presetId);
        // Sync data-theme to avoid CSS selector conflicts
        const darkPresets = ['organic-dark', 'ocean', 'forest', 'ember', 'purple', 'mono'];
        const targetTheme = darkPresets.includes(presetId) ? 'dark' : 'light';
        if (targetTheme !== theme) {
            setTheme(targetTheme);
            document.documentElement.setAttribute('data-theme', targetTheme);
            localStorage.setItem('app-theme', targetTheme);
        }
    };

    const handleLogin = (uid: string, un: string, token?: string) => {
        setUserId(uid);
        setUserName(un);
        if (token) {
            setAccessToken(token);
            localStorage.setItem("financeAccessToken", token);
        }
        localStorage.setItem("financeUserId", uid);
        localStorage.setItem("financeUserName", un);
        loadUserData(uid, token);
        getPendingOpsCount(uid).then(setPendingOpsCount);
    };

    const handleLogout = () => {
        clearPersistedSession();
    };

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem("app-theme", nextTheme);
    };

    const handleCurrencyChange = (curr: 'ILS' | 'USD' | 'ARS' | 'EUR') => {
        setGlobalCurrency(curr);
        localStorage.setItem("app-currency", curr);
    };

    const toggleTravelMode = () => {
        if (travelModeStart) {
            localStorage.removeItem('financeTravelModeStart');
            setTravelModeStart(null);
            document.documentElement.removeAttribute('data-travel');
        } else {
            if (confirm("¿Activar Modo Viaje / Cuenta Nueva? Esto aislará los saldos antiguos temporalmente.")) {
                const todayStr = new Date().toISOString().split('T')[0];
                localStorage.setItem('financeTravelModeStart', todayStr);
                setTravelModeStart(todayStr);
                document.documentElement.setAttribute('data-travel', 'true');
            }
        }
    };

    const allCategories = React.useMemo(() => {
        const catMap = new Map<string, Category>();
        const normalize = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. Recover categories from transaction history (discovery)
        transactions.forEach(tx => {
            if (!tx) return; // guard contra nulls
            if (tx.tag) {
                const label = tx.tag.trim();
                const up = normalize(label);
                if (!catMap.has(up)) {
                    catMap.set(up, {
                        id: `tx-cat-${up.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                        label: label,
                        icon: tx.icon || '📦'
                    });
                }
            }
        });

        // 2. Load/Overlay Custom stored Categories from LocalStorage
        if (typeof window !== 'undefined') {
            try {
                const custom = JSON.parse(localStorage.getItem('financeCustomCategories') || '[]');
                custom.forEach((c: any) => {
                    if (c && c.label) {
                        const label = c.label.trim();
                        const up = normalize(label);
                        catMap.set(up, { ...c, label });
                    }
                });
            } catch (e) { }
        }

        // Return all uniques, sorted A-Z
        return Array.from(catMap.values())
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    }, [transactions, catSignal]);

    let mappedTransactions = transactions.filter(Boolean).map(t => {
        let val = t.amount;
        if (globalCurrency === 'USD' && t.amountUSD != null) val = t.amountUSD;
        if (globalCurrency === 'ARS' && t.amountARS != null) val = t.amountARS;
        if (globalCurrency === 'EUR' && t.amountEUR != null) val = t.amountEUR;
        if (globalCurrency === 'ILS' && t.amountILS != null) val = t.amountILS;
        return { ...t, amount: val };
    });

    if (travelModeStart) {
        mappedTransactions = mappedTransactions.filter(t => {
            if (t.date === 'Hoy' || t.date === 'Ayer') return true;
            const txDate = t.date.replace(/\//g, '-');
            return txDate >= travelModeStart;
        });
    }

    const totalIncome = mappedTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = mappedTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    return (
        <AppContext.Provider value={{
            isClient, userId, userName, accessToken, userGoal, theme, setTheme, globalCurrency,
            transactions, mappedTransactions, selectedTransaction, travelModeStart,
            allCategories, totalIncome, totalExpense, currentBalance, savingsTarget,
            isOnline, pendingOpsCount, syncNow,
            customColors, setCustomColor, resetCustomColors,
            isColorMode, setIsColorMode, activeColorZone, setActiveColorZone,
            widgetColors, setWidgetColor, resetWidgetColors, applyColorPreset,
            toggleTheme, handleLogin, handleLogout, handleCurrencyChange,
            toggleTravelMode, saveTransaction, handleDeleteTransaction,
            setSelectedTransaction, loadUserData, loadUserTransactions, setCatSignal,
            isAddModalOpen, setIsAddModalOpen, addModalInitialData, setAddModalInitialData
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within AppProvider");
    return context;
};
