"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Transaction, Category } from "../types";

type GlobalContextType = {
    isClient: boolean;
    userId: string | null;
    userName: string | null;
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

    setTheme: (t: string) => void;
    toggleTheme: () => void;
    handleLogin: (uid: string, un: string) => void;
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
    const [userGoal, setUserGoal] = useState<number>(3000);
    const [theme, setTheme] = useState("dark");
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [globalCurrency, setGlobalCurrency] = useState<'ILS' | 'USD' | 'ARS' | 'EUR'>('ILS');
    const [travelModeStart, setTravelModeStart] = useState<string | null>(null);
    const [catSignal, setCatSignal] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addModalInitialData, setAddModalInitialData] = useState<Partial<Transaction> | null>(null);
    const savingsTarget = 200;

    useEffect(() => {
        setIsClient(true);
        const storedTheme = localStorage.getItem("app-theme") || "dark";
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);

        const storedCurrency = localStorage.getItem("app-currency") as 'ILS' | 'USD' | 'ARS' | 'EUR';
        if (storedCurrency) setGlobalCurrency(storedCurrency);

        const storedUserId = localStorage.getItem("financeUserId");
        const storedUserName = localStorage.getItem("financeUserName");
        if (storedUserId && storedUserName) {
            setUserId(storedUserId);
            setUserName(storedUserName);
            loadUserData(storedUserId);
        }

        if (typeof window !== 'undefined') {
            setTravelModeStart(localStorage.getItem('financeTravelModeStart'));
        }
    }, []);

    const loadUserData = async (uid: string) => {
        loadUserTransactions(uid);
        try {
            const res = await fetch(`/api/user?userId=${uid}`);
            if (res.ok) {
                const data = await res.json();
                if (data.monthlyGoal) setUserGoal(data.monthlyGoal);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadUserTransactions = async (uid: string) => {
        try {
            const res = await fetch(`/api/transactions?userId=${uid}`);
            if (res.ok) {
                const data = await res.json();
                // We keep tags exactly as stored in DB to avoid unexpected merging
                setTransactions(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const saveTransaction = async (newTx: Transaction) => {
        if (!userId) return;
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTx, userId })
            });

            if (res.ok) {
                const savedTx = await res.json();
                setTransactions(prev => [savedTx, ...prev]);
                setIsAddModalOpen(false);
            }
        } catch (e) {
            console.error("No se pudo guardar", e);
        }
    };

    const handleDeleteTransaction = async (txId: string) => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/transactions?id=${txId}&userId=${userId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setTransactions(prev => prev.filter(t => t.id !== txId));
            }
        } catch (e) {
            console.error("No se pudo borrar", e);
        }
    };

    const handleLogin = (uid: string, un: string) => {
        setUserId(uid);
        setUserName(un);
        localStorage.setItem("financeUserId", uid);
        localStorage.setItem("financeUserName", un);
        loadUserData(uid);
    };

    const handleLogout = () => {
        setUserId(null);
        setUserName(null);
        localStorage.removeItem("financeUserId");
        localStorage.removeItem("financeUserName");
        setTransactions([]);
        setSelectedTransaction(null);
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
        } else {
            if (confirm("¿Activar Modo Viaje / Cuenta Nueva? Esto aislará los saldos antiguos temporalmente.")) {
                const todayStr = new Date().toISOString().split('T')[0];
                localStorage.setItem('financeTravelModeStart', todayStr);
                setTravelModeStart(todayStr);
            }
        }
    };

    const allCategories = React.useMemo(() => {
        const catMap = new Map<string, Category>();
        const normalize = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. Recover categories from transaction history (discovery)
        transactions.forEach(tx => {
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

    let mappedTransactions = transactions.map(t => {
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
            return t.date >= travelModeStart;
        });
    }

    const totalIncome = mappedTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = mappedTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    return (
        <AppContext.Provider value={{
            isClient, userId, userName, userGoal, theme, setTheme, globalCurrency, transactions, mappedTransactions, selectedTransaction, travelModeStart, allCategories, totalIncome, totalExpense, currentBalance, savingsTarget, toggleTheme, handleLogin, handleLogout, handleCurrencyChange, toggleTravelMode, saveTransaction, handleDeleteTransaction, setSelectedTransaction, loadUserData, loadUserTransactions, setCatSignal, isAddModalOpen, setIsAddModalOpen, addModalInitialData, setAddModalInitialData
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
