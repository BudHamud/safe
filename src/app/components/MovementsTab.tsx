import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Transaction } from "../../types";

type MovementsTabProps = {
    transactions: Transaction[];
    onTransactionClick: (tx: Transaction) => void;
    userId: string | null;
    onTransactionsUpdated: () => void;
    globalCurrency: string;
    availableCategories: any[];
};

// Icon map for categories
const categoryIconMap: Record<string, string> = {
    alquiler: '🏠', viajes: '✈️', comida: '🍔', suscripcion: '🎵', ocio: '🎵',
    internet: '📡', seguro: '🛡️', impuestos: '🏛️', transporte: '🚌', vivienda: '🏠',
    entretenimiento: '🎬', salud: '💊', educacion: '📚', alimentacion: '🛒',
    servicios: '📡', ingreso: '💼', nomina: '💼', salario: '💼', default: '💳'
};
const getIcon = (tx: Transaction) => {
    if (tx.icon && tx.icon.length < 5) return tx.icon;
    return categoryIconMap[tx.tag?.toLowerCase()] || categoryIconMap.default;
};

// Hook
function useWindowWidth() {
    const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
    useEffect(() => {
        const h = () => setWidth(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return width;
}

const parseDate = (dString: string): Date => {
    if (!dString) return new Date(0);
    if (dString.toLowerCase() === 'hoy') return new Date();
    const parts = dString.includes('/') ? dString.split('/') : dString.split('-');
    if (dString.includes('/') && parts.length >= 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parts.length === 3 ? parseInt(parts[2], 10) : new Date().getFullYear();
        const safeYear = year < 100 ? 2000 + year : year;
        return new Date(safeYear, month, day);
    }
    const dt = new Date(dString);
    return isNaN(dt.getTime()) ? new Date(0) : dt;
};

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export const MovementsTab = ({ transactions, onTransactionClick, userId, onTransactionsUpdated, globalCurrency, availableCategories }: MovementsTabProps) => {
    const sym = globalCurrency === 'ILS' ? '₪' : (globalCurrency === 'EUR' ? '€' : '$');
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth < 768;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filters state
    const now = new Date();
    const [showFilters, setShowFilters] = useState(false);
    const [search, setSearch] = useState('');
    const [filterMonth, setFilterMonth] = useState<number>(now.getMonth()); // 0-indexed
    const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // All unique categories
    const allCategories = Array.from(new Set(transactions.map(t => t.tag))).sort();

    // Available years
    const years = Array.from(new Set(transactions.map(t => {
        const d = parseDate(t.date);
        return d.getFullYear();
    }))).filter(y => y > 2000).sort((a, b) => b - a);
    if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear());

    // Filtered list
    const filteredTxs = transactions
        .filter(t => {
            const d = parseDate(t.date);
            const matchMonth = !showFilters || (d.getMonth() === filterMonth && d.getFullYear() === filterYear);
            const matchSearch = !search || t.desc.toLowerCase().includes(search.toLowerCase()) || t.tag.toLowerCase().includes(search.toLowerCase());
            const matchCat = filterCategory === 'all' || t.tag === filterCategory;
            const matchType = filterType === 'all' || t.type === filterType;
            return matchMonth && matchSearch && matchCat && matchType;
        })
        .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    // Summary stats for the selected month/year (always current month in default view)
    const statsMonth = showFilters ? filterMonth : now.getMonth();
    const statsYear = showFilters ? filterYear : now.getFullYear();
    const monthTxs = transactions.filter(t => {
        const d = parseDate(t.date);
        return d.getMonth() === statsMonth && d.getFullYear() === statsYear;
    });
    const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthBalance = monthIncome - monthExpense;

    // Top categories (expenses only)
    const catTotals = monthTxs
        .filter(t => t.type === 'expense')
        .reduce((acc, tx) => { acc[tx.tag] = (acc[tx.tag] || 0) + tx.amount; return acc; }, {} as Record<string, number>);
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCat = topCats[0]?.[1] || 1;

    // Monthly goal (from all transactions)
    const allMonthExpenses = transactions
        .filter(t => t.type === 'expense' && !t.excludeFromBudget)
        .filter(t => { const d = parseDate(t.date); return d.getMonth() === statsMonth && d.getFullYear() === statsYear; })
        .reduce((s, t) => s + t.amount, 0);
    const savedGoal = typeof window !== 'undefined' ? Number(localStorage.getItem('monthlyGoal') || 0) : 0;
    const goalPct = savedGoal > 0 ? Math.min((allMonthExpenses / savedGoal) * 100, 100) : 0;
    const radius = 46;
    const circ = 2 * Math.PI * radius;
    const dashOffset = circ - (goalPct / 100) * circ;

    // Pagination
    const paginated = filteredTxs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredTxs.length / ITEMS_PER_PAGE);

    // Export/Import
    const handleExport = () => {
        const data = transactions.map(t => ({
            Fecha: t.date, Categoria: t.tag,
            Monto: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
            Descripcion: t.desc, Detalles: t.details || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
        XLSX.writeFile(wb, "Historial_Movimientos.xlsx");
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;
        const fallbackYearMatch = file.name.match(/\b(20\d{2})\b/);
        const fallbackYear = fallbackYearMatch ? fallbackYearMatch[1] : new Date().getFullYear().toString();
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                let globalLastDate = new Date().toISOString().split('T')[0];
                for (const wsname of wb.SheetNames) {
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { raw: false, defval: "" });
                    for (const row of data as any[]) {
                        const keys = Object.keys(row);
                        const getVal = (possible: string[]) => {
                            const found = keys.find(k => possible.includes(String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
                            return found ? row[found] : "";
                        };
                        const valMonto = getVal(['monto', 'amount', 'valor', 'precio']);
                        const valDesc = getVal(['descripcion', 'desc', 'concepto', 'titulo']);
                        const valCat = getVal(['categoria', 'tag', 'clase']);
                        const valFecha = getVal(['fecha', 'date', 'dia']);
                        const valDetalles = getVal(['detalles', 'details', 'notas']);
                        let currentDate = valFecha ? String(valFecha).trim() : '';
                        if (currentDate.match(/^\d{1,2}[\/\-]\d{1,2}$/)) currentDate = `${currentDate}/${fallbackYear}`;
                        if (currentDate) globalLastDate = currentDate;
                        else currentDate = globalLastDate;
                        let amtRawStr = String(valMonto).replace(',', '.').replace(/[^0-9.\-+]/g, '');
                        const isIncome = amtRawStr.includes('+');
                        const isNegative = amtRawStr.includes('-');
                        const amtRaw = amtRawStr ? parseFloat(amtRawStr.replace('+', '')) : 0;
                        if (amtRaw === 0 && !valDesc && !valCat) continue;
                        let txType = isIncome ? 'income' : 'expense';
                        if (amtRawStr.includes('+')) txType = 'income';
                        await fetch('/api/transactions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ desc: valDesc || 'Importado', amount: Math.abs(amtRaw), tag: valCat || 'custom', type: txType, date: currentDate, icon: '💳', details: valDetalles || '', userId })
                        });
                    }
                }
                onTransactionsUpdated();
            } catch (error) {
                console.error('Error importing Excel', error);
                alert("Hubo un error al procesar el archivo Excel.");
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    /* ── Styles ── */
    const dark = '#141714';
    const border = '#222';

    const iconBtn = (active = false): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
        border: `1px solid ${active ? '#5d7253' : '#333'}`,
        background: active ? '#5d7253' : '#1a1a1a',
        color: active ? '#fff' : '#8c8c80',
        letterSpacing: '0.04em', transition: 'all 0.15s'
    });

    const select: React.CSSProperties = {
        background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px',
        color: '#e0e0ce', fontSize: '0.7rem', fontWeight: 700, padding: '0.4rem 0.6rem',
        cursor: 'pointer', fontFamily: 'inherit', outline: 'none'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            {/* ── TOP BAR ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem'
            }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#e0e0ce', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    Movimientos
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {/* Filter toggle */}
                    <button onClick={() => setShowFilters(f => !f)} style={{ ...iconBtn(showFilters) }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {!isMobile && (showFilters ? 'Ocultar filtros' : 'Filtrar')}
                    </button>
                    {/* Export */}
                    <button onClick={handleExport} style={iconBtn()}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {!isMobile && 'Exportar Excel'}
                    </button>
                    {/* Import */}
                    <button onClick={() => fileInputRef.current?.click()} style={{ ...iconBtn(), background: '#1e2b1e', border: '1px solid #5d7253', color: '#5d7253' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {!isMobile && 'Importar Excel'}
                    </button>
                    <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImport} />
                    {/* Bell (Hidden on mobile as header has it) */}
                    {!isMobile && (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1a1a1a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c80', cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* ── MAIN LAYOUT: List + Sidebar ── */}
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', width: '100%' }}>

                {/* ── LEFT: Search + Filters + List ── */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                    {/* Search (Always visible) */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: dark, border: `1px solid ${border}`, borderRadius: '8px',
                        padding: '0.6rem 1rem'
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8c8c80" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            placeholder="Buscar transacción..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: '#e0e0ce', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} style={{ background: 'none', color: '#8c8c80', cursor: 'pointer', fontSize: '1rem', padding: 0, fontFamily: 'inherit' }}>✕</button>
                        )}
                    </div>

                    {/* Filters (only for specific month/category) */}
                    {showFilters && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                            {/* Month */}
                            <select value={filterMonth} onChange={e => { setFilterMonth(Number(e.target.value)); setCurrentPage(1); }} style={select}>
                                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            {/* Year */}
                            <select value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setCurrentPage(1); }} style={select}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            {/* Category */}
                            <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }} style={select}>
                                <option value="all">Todas las categorías</option>
                                {availableCategories.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                            </select>
                            {/* Type toggles */}
                            <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                                {(['all', 'expense', 'income'] as const).map(t => (
                                    <button key={t} onClick={() => { setFilterType(t); setCurrentPage(1); }}
                                        style={{ ...iconBtn(filterType === t), padding: '0.4rem 0.65rem' }}
                                    >
                                        {t === 'all' ? 'Todos' : t === 'expense' ? '↓ Gastos' : '↑ Ingresos'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent label when filters hidden */}
                    {!showFilters && (
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#8c8c80', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Últimos movimientos
                        </div>
                    )}

                    {/* Transaction list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredTxs.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#8c8c80', fontWeight: 700, fontSize: '0.85rem', background: dark, border: `1px solid ${border}`, borderRadius: '10px' }}>
                                Sin resultados para este filtro.
                            </div>
                        ) : (
                            <>
                                {paginated.map((tx, idx) => (
                                    <div
                                        key={tx.id}
                                        onClick={() => onTransactionClick(tx)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.65rem 0.85rem', cursor: 'pointer',
                                            background: '#1a1a1a', borderRadius: '10px',
                                            border: '1px solid #222',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
                                    >
                                        {/* Icon */}
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '8px', background: '#1e1e1e',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1rem', flexShrink: 0
                                        }}>
                                            {getIcon(tx)}
                                        </div>
                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0, margin: '0 0.85rem' }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#e0e0ce', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {tx.desc}
                                            </div>
                                            <div style={{ fontSize: '0.62rem', color: '#8c8c80', fontWeight: 600, marginTop: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <span style={{ color: '#e0e0ce', fontWeight: 800 }}>{tx.tag}</span> • {tx.date}
                                                {tx.goalType === 'mensual' && (
                                                    <span style={{ fontSize: '0.5rem', background: '#1e2b1e', color: '#5d7253', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 800 }}>MENSUAL</span>
                                                )}
                                                {tx.goalType === 'periodo' && (
                                                    <span style={{ fontSize: '0.5rem', background: '#1e2b1e', color: '#5d7253', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 800 }}>RECURRENTE {tx.periodicity}M</span>
                                                )}
                                                {tx.isCancelled && (
                                                    <span style={{ fontSize: '0.5rem', background: `#8e4a3922`, color: '#8e4a39', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 800 }}>CANCELADO</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Amount */}
                                        <div style={{ fontSize: '0.9rem', fontWeight: 900, flexShrink: 0, color: tx.type === 'expense' ? '#8e4a39' : '#5d7253', fontFamily: 'var(--font-display)' }}>
                                            {tx.type === 'expense' ? '-' : '+'}{sym}{tx.amount.toFixed(2)}
                                        </div>
                                    </div>
                                ))}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', borderTop: `1px solid #1a1a1a` }}>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            style={{ ...iconBtn(), opacity: currentPage === 1 ? 0.4 : 1 }}
                                        >← Anterior</button>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8c8c80' }}>
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            style={{ ...iconBtn(), opacity: currentPage === totalPages ? 0.4 : 1 }}
                                        >Siguiente →</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Summary sidebar (shown only when filters active) ── */}
                {showFilters && (
                    <div style={{ width: isMobile ? '100%' : '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {/* Resumen Mensual */}
                        <div style={{ background: dark, border: `1px solid ${border}`, borderRadius: '10px', padding: '1.1rem' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#8c8c80', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
                                Resumen Mensual
                            </div>

                            {/* Balance */}
                            <div style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid #1e1e1e' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                                    <div style={{ fontSize: '0.6rem', color: '#8c8c80', fontWeight: 700, textTransform: 'uppercase' }}>Balance Total</div>
                                    <div style={{
                                        width: '28px', height: '28px', background: '#1e1e1e', borderRadius: '6px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5d7253" strokeWidth="2.5">
                                            <rect x="2" y="5" width="20" height="14" /><line x1="2" y1="10" x2="22" y2="10" />
                                        </svg>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: monthBalance >= 0 ? '#e0e0ce' : '#8e4a39', letterSpacing: '-0.03em', lineHeight: 1 }}>
                                    {sym}{monthBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.55rem', color: '#5d7253', fontWeight: 700 }}>↑ Ingresos</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e0e0ce' }}>{sym}{monthIncome.toFixed(0)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.55rem', color: '#8e4a39', fontWeight: 700 }}>↓ Gastos</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e0e0ce' }}>{sym}{monthExpense.toFixed(0)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Objective donut */}
                            <div style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid #1e1e1e' }}>
                                <div style={{ fontSize: '0.6rem', color: '#8c8c80', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem' }}>Objetivo Gastos</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '0.25rem 0' }}>
                                    <svg viewBox="0 0 120 120" style={{ width: '110px', height: '110px' }}>
                                        <circle cx="60" cy="60" r={radius} stroke="#222" strokeWidth="14" fill="none" />
                                        <circle
                                            cx="60" cy="60" r={radius}
                                            stroke={goalPct >= 100 ? '#8e4a39' : '#8e4a39'}
                                            strokeWidth="14" fill="none"
                                            strokeDasharray={circ}
                                            strokeDashoffset={dashOffset}
                                            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                            transform="rotate(-90 60 60)"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#e0e0ce' }}>{Math.round(goalPct)}%</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '0.55rem', color: '#8c8c80', fontWeight: 700, textTransform: 'uppercase' }}>Gastado</div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e0e0ce' }}>{sym}{allMonthExpenses.toFixed(0)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.55rem', color: '#8c8c80', fontWeight: 700, textTransform: 'uppercase' }}>Límite</div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e0e0ce' }}>{sym}{savedGoal > 0 ? savedGoal.toFixed(0) : '—'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Top Categories bar chart */}
                            <div>
                                <div style={{ fontSize: '0.6rem', color: '#8c8c80', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.7rem' }}>Top Categorías</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {topCats.length === 0 && (
                                        <div style={{ fontSize: '0.7rem', color: '#8c8c80' }}>Sin datos</div>
                                    )}
                                    {topCats.map(([cat, amt], i) => (
                                        <div key={cat}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e0e0ce', textTransform: 'capitalize' }}>{cat}</span>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8c8c80' }}>{sym}{amt.toFixed(0)}</span>
                                            </div>
                                            <div style={{ height: '4px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: '2px',
                                                    width: `${(amt / maxCat) * 100}%`,
                                                    background: i === 0 ? '#5d7253' : i === 1 ? '#8e4a39' : '#4a5a42',
                                                    transition: 'width 0.8s ease'
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {topCats.length > 0 && (
                                    <button
                                        onClick={() => { }}
                                        style={{ marginTop: '0.85rem', width: '100%', padding: '0.5rem', background: 'transparent', border: '1px solid #333', borderRadius: '6px', color: '#8c8c80', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
                                    >
                                        Ver Reporte Completo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
