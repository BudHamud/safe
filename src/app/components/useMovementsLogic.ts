import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Transaction } from '../../types';
import {
    MONTHS, parseDate, formatDate,
    buildExportFilename, exportToExcel, parseExcelRow,
} from './movements.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
    showFilters: boolean;
    search: string;
    filterMonth: number | 'all';
    filterYear: number | 'all';
    filterCategory: string;
    filterType: 'all' | 'expense' | 'income';
    currentPage: number;
}

export interface SidebarData {
    label: string;
    isMonth: boolean;
    income: number;
    expense: number;
    balance: number;
    fixedPct: number;
    varPct: number;
    fixedAmt: number;
    varAmt: number;
    goalPct: number;
    goalSpent: number;
    goalLimit: number;
    topCats: [string, number][];
    maxCat: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IS_RECURRING = (t: Transaction) =>
    t.goalType === 'mensual' || t.goalType === 'periodo';

const sumBy = (txs: Transaction[], type: 'income' | 'expense') =>
    txs.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);

const getSidebarLabel = (
    showFilters: boolean,
    filterMonth: number | 'all',
    filterYear: number | 'all',
    now: Date,
): string => {
    if (!showFilters) return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    if (filterMonth !== 'all' && filterYear !== 'all') return `${MONTHS[filterMonth as number]} ${filterYear}`;
    if (filterYear !== 'all') return String(filterYear);
    return 'Histórico';
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useMovementsLogic = (
    transactions: Transaction[],
    userId: string | null,
    globalCurrency: string,
    onTransactionsUpdated: () => void,
) => {
    const now = new Date();
    const sym = globalCurrency === 'ILS' ? '₪' : globalCurrency === 'EUR' ? '€' : '$';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ITEMS_PER_PAGE = 10;
    const savedGoal = typeof window !== 'undefined' ? Number(localStorage.getItem('monthlyGoal') ?? 0) : 0;

    // ── Filter state ──────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<FilterState>({
        showFilters: false,
        search: '',
        filterMonth: now.getMonth(),
        filterYear: now.getFullYear(),
        filterCategory: 'all',
        filterType: 'all',
        currentPage: 1,
    });

    const patch = (partial: Partial<Omit<FilterState, 'currentPage'>>) =>
        setFilters(prev => ({ ...prev, ...partial, currentPage: 1 }));

    const setPage = (page: number) =>
        setFilters(prev => ({ ...prev, currentPage: page }));

    // ── Derived: available options ────────────────────────────────────────────
    const allCategories = Array.from(new Set(transactions.map(t => t.tag))).sort();

    const years = Array.from(new Set(
        transactions.map(t => parseDate(t.date).getFullYear()).filter(y => y > 2000)
    )).sort((a, b) => b - a);
    if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear());

    // ── Derived: filtered list ────────────────────────────────────────────────
    const { showFilters, search, filterMonth, filterYear, filterCategory, filterType, currentPage } = filters;

    const filteredTxs = transactions
        .filter(t => {
            const d = parseDate(t.date);
            if (showFilters && filterMonth !== 'all' && d.getMonth() !== filterMonth) return false;
            if (showFilters && filterYear !== 'all' && d.getFullYear() !== filterYear) return false;
            if (filterCategory !== 'all' && t.tag !== filterCategory) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            if (search && !t.desc.toLowerCase().includes(search.toLowerCase())
                && !t.tag.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    const paginated = filteredTxs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredTxs.length / ITEMS_PER_PAGE);

    // ── Derived: sidebar ──────────────────────────────────────────────────────
    // Always mirrors what's visible in the list (search + all filters included).
    const sidebarTxs = filteredTxs;
    const sidebarLabel = search.trim()
        ? `"${search.trim()}"`
        : getSidebarLabel(showFilters, filterMonth, filterYear, now);
    const sidebarIsMonth = !showFilters || (filterYear !== 'all' && filterMonth !== 'all');

    const sidebarIncome = sumBy(sidebarTxs, 'income');
    const sidebarExpense = sumBy(sidebarTxs, 'expense');

    const fixedAmt = sidebarTxs.filter(t => t.type === 'expense' && IS_RECURRING(t)).reduce((s, t) => s + t.amount, 0);
    const varAmt = sidebarTxs.filter(t => t.type === 'expense' && !IS_RECURRING(t)).reduce((s, t) => s + t.amount, 0);
    const totalExp = fixedAmt + varAmt || 1;

    const goalSpent = sidebarTxs.filter(t => t.type === 'expense' && !t.excludeFromBudget).reduce((s, t) => s + t.amount, 0);
    const goalPct = sidebarIsMonth && savedGoal > 0 ? Math.min((goalSpent / savedGoal) * 100, 100) : 0;

    const catTotals = sidebarTxs
        .filter(t => t.type === 'expense')
        .reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.tag]: (acc[t.tag] ?? 0) + t.amount }), {});
    const topCats = Object.entries(catTotals).sort(([, a], [, b]) => b - a).slice(0, 5);

    const sidebar: SidebarData = {
        label: sidebarLabel,
        isMonth: sidebarIsMonth,
        income: sidebarIncome,
        expense: sidebarExpense,
        balance: sidebarIncome - sidebarExpense,
        fixedPct: Math.round((fixedAmt / totalExp) * 100),
        varPct: 100 - Math.round((fixedAmt / totalExp) * 100),
        fixedAmt,
        varAmt,
        goalPct,
        goalSpent,
        goalLimit: savedGoal,
        topCats,
        maxCat: topCats[0]?.[1] ?? 1,
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleExport = () => {
        const filename = buildExportFilename(search, showFilters, filterMonth, filterYear);
        exportToExcel(filteredTxs, filename, sym);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        const fallbackYear = file.name.match(/\b(20\d{2})\b/)?.[1] ?? String(now.getFullYear());
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target?.result, { type: 'binary', cellDates: true });

                for (const sheetName of wb.SheetNames) {
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { raw: false, defval: '' }) as Record<string, unknown>[];
                    let lastDate = new Date().toISOString().split('T')[0];

                    for (const raw of rows) {
                        const { row, resolvedDate } = parseExcelRow(raw, fallbackYear, lastDate);
                        lastDate = resolvedDate;
                        if (!row) continue;

                        await fetch('/api/transactions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...row, icon: '💳', userId }),
                        });
                    }
                }

                onTransactionsUpdated();
            } catch (err) {
                console.error('Error importing Excel', err);
                alert('Hubo un error al procesar el archivo Excel.');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsBinaryString(file);
    };

    return {
        // State via patch
        filters, patch, setPage,
        // Computed
        allCategories, years, filteredTxs, paginated, totalPages,
        sym, fileInputRef, sidebar,
        // Actions
        handleExport, handleImport,
    };
};
