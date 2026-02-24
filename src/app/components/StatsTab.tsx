import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from "../../types";

type StatsTabProps = {
    transactions: Transaction[];
    globalCurrency: string;
    monthlyGoal: number;
};

// ── Design tokens ──────────────────────────────────────────
const BG = '#161917';
const SURFACE = '#1d201d';
const SURF2 = '#232623';
const BORDER = '#2b2e2b';
const BORDER2 = '#383b38';
const TEXT = '#e0ddd4';
const MUTED = '#737670';
const MUTED2 = '#4a4d4a';
const GREEN = '#5c7152';
const RED = '#8b4a38';

const sectionLabel: React.CSSProperties = {
    fontSize: '0.58rem',
    fontWeight: 800,
    color: MUTED,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
};

export const StatsTab = ({ transactions, globalCurrency, monthlyGoal }: StatsTabProps) => {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    const sym = globalCurrency === 'ILS' ? '₪' : (globalCurrency === 'EUR' ? '€' : '$');
    const currentYear = new Date().getFullYear().toString();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState('ALL');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const getYearMonth = (dateStr: string) => {
        let d = dateStr.replace(/-/g, '/');
        let year = "", month = "";
        if (d.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
            const parts = d.split('/'); year = parts[0]; month = parts[1];
        } else if (d.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
            const parts = d.split('/');
            year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            month = parts[1].padStart(2, '0');
        } else if (d.match(/^\d{4}-\d{2}-\d{2}T/)) {
            const dObj = new Date(d);
            year = dObj.getFullYear().toString();
            month = (dObj.getMonth() + 1).toString().padStart(2, '0');
        }
        return { year, month };
    };

    const availableYears = Array.from(new Set(transactions.map(t => getYearMonth(t.date).year).filter(y => y.length === 4))).sort().reverse();
    if (availableYears.length === 0) availableYears.push(currentYear);
    if (!availableYears.includes(selectedYear) && availableYears.length > 0) setSelectedYear(availableYears[0]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const { year, month } = getYearMonth(t.date);
            if (year !== selectedYear) return false;
            if (selectedMonth !== 'ALL' && month !== selectedMonth) return false;
            return true;
        });
    }, [transactions, selectedYear, selectedMonth]);

    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    const expensesForGoal = filteredTransactions.filter(t => t.type === 'expense' && !t.excludeFromBudget && t.goalType !== 'mensual' && t.goalType !== 'periodo');
    const totalExpenseForGoal = expensesForGoal.reduce((acc, t) => acc + t.amount, 0);
    const progress = Math.min((totalExpenseForGoal / monthlyGoal) * 100, 100);

    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const categoryTotals = expenses.reduce((acc, t) => {
        acc[t.tag] = (acc[t.tag] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);
    const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

    const trendData = useMemo(() => {
        const monthTotals = new Array(12).fill(0);
        transactions.forEach(t => {
            if (t.type === 'income' || t.excludeFromBudget || t.goalType === 'mensual' || t.goalType === 'periodo') return;
            const { year, month } = getYearMonth(t.date);
            if (year === selectedYear && month.length === 2) {
                const mIdx = parseInt(month, 10) - 1;
                if (mIdx >= 0 && mIdx < 12) monthTotals[mIdx] += t.amount;
            }
        });
        return monthTotals;
    }, [transactions, selectedYear]);

    const maxTrend = Math.max(...trendData, monthlyGoal, 1);
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    const BAR_AREA_H = 160; // px — fixed height for chart bars

    return (
        <div style={{ paddingBottom: '3rem', position: 'relative', color: TEXT }}>

            {/* ── TOP BAR ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: TEXT, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
                    Métricas
                </h1>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {/* Month selector */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            style={{ appearance: 'none' as any, background: SURFACE, color: TEXT, border: `1px solid ${BORDER2}`, borderRadius: '4px', padding: '0.45rem 1.75rem 0.45rem 0.8rem', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            <option value="ALL">Todo el año</option>
                            {monthNames.map((m, i) => (
                                <option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>
                            ))}
                        </select>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.5" style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>

                    {/* Year pill */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                            style={{ appearance: 'none' as any, background: GREEN, color: '#fff', border: 'none', borderRadius: '4px', padding: '0.45rem 1.5rem 0.45rem 0.85rem', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.06em', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>

                    {/* Bell (Hidden on mobile) */}
                    {!isMobile && (
                        <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: SURFACE, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Section label */}
            <div style={sectionLabel}>
                {selectedMonth === 'ALL' ? 'Reporte Anual' : 'Reporte Mensual'}
            </div>

            {/* ── RESUMEN CARD ── */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '0', padding: '1.4rem 1.5rem', marginBottom: '1.75rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>

                {/* Balance */}
                <div style={{ flex: '1 1 180px' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                        Liquidez
                    </div>
                    <div style={{ fontSize: '2.6rem', fontWeight: 900, color: currentBalance >= 0 ? TEXT : RED, lineHeight: 1, letterSpacing: '-0.03em', display: 'flex', alignItems: 'flex-start', gap: '0.15rem' }}>
                        <span style={{ fontSize: '1.1rem', color: MUTED, marginTop: '0.35rem' }}>{sym}</span>
                        {Math.abs(currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', background: BORDER, alignSelf: 'stretch', flexShrink: 0 }} />

                {/* Income + Expense */}
                <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: GREEN, flexShrink: 0, display: 'inline-block' }} />
                            Ingresos
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: GREEN, letterSpacing: '-0.01em' }}>
                            +{sym}{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: RED, flexShrink: 0, display: 'inline-block' }} />
                            Egresos
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: RED, letterSpacing: '-0.01em' }}>
                            -{sym}{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Progress bar (only in month view) */}
                {selectedMonth !== 'ALL' && monthlyGoal > 0 && (
                    <div style={{ width: '100%', borderTop: `1px solid ${BORDER}`, paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.57rem', fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            <span>Consumo de meta</span>
                            <span style={{ color: progress >= 100 ? RED : TEXT }}>{progress.toFixed(0)}% · {sym}{monthlyGoal}</span>
                        </div>
                        <div style={{ height: '6px', background: SURF2, borderRadius: '0', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? RED : GREEN, borderRadius: '0', transition: 'width 0.8s ease' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* ── TENDENCIAS DE GASTO ── */}
            <div style={{ ...sectionLabel, marginBottom: '0.7rem' }}>
                <span style={{ width: '7px', height: '7px', background: GREEN, borderRadius: '1px', display: 'inline-block', flexShrink: 0 }} />
                Tendencias de Gasto ({selectedYear})
            </div>

            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '0', padding: '1.25rem 1.25rem 1rem', marginBottom: '1.75rem', overflowX: 'auto' }}>
                <div style={{ minWidth: '480px', position: 'relative' }}>

                    {/* Goal line */}
                    {monthlyGoal > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: `calc(1.5rem + ${(monthlyGoal / maxTrend) * BAR_AREA_H}px)`,
                            left: 0, right: 0,
                            borderTop: `1px dashed ${RED}`,
                            zIndex: 10, pointerEvents: 'none',
                        }}>
                            <span style={{
                                position: 'absolute', left: '0', top: '-14px',
                                fontSize: '0.5rem', fontWeight: 900, color: RED,
                                background: SURFACE, padding: '2px 6px', borderRadius: '4px',
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}>
                                LÍMITE {sym}{monthlyGoal}
                            </span>
                        </div>
                    )}

                    {/* Bars */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.35rem', height: `${BAR_AREA_H + 24}px`, paddingBottom: '1.5rem', justifyContent: 'space-between' }}>
                        {trendData.map((val, i) => {
                            const heightPx = (val / maxTrend) * BAR_AREA_H;
                            const isSelected = selectedMonth === (i + 1).toString().padStart(2, '0');
                            const isOverGoal = monthlyGoal > 0 && val > monthlyGoal;
                            const barColor = isSelected ? TEXT : isOverGoal ? RED : GREEN;

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedMonth((i + 1).toString().padStart(2, '0'))}
                                    title={`${sym}${val.toFixed(0)}`}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, cursor: 'pointer', height: '100%', justifyContent: 'flex-end' }}
                                >
                                    {/* Value label */}
                                    <div style={{ fontSize: '0.42rem', fontWeight: 800, color: isSelected ? TEXT : MUTED2, marginBottom: '3px', textAlign: 'center', lineHeight: 1.2 }}>
                                        {val > 0 ? (val > 999 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0)) : ''}
                                    </div>

                                    {/* Bar */}
                                    <div style={{ width: '100%', height: `${BAR_AREA_H}px`, background: SURF2, borderRadius: '0', position: 'relative', overflow: 'hidden', border: isSelected ? `1px solid ${BORDER2}` : `1px solid ${BORDER}` }}>
                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            height: `${heightPx}px`,
                                            background: isSelected ? barColor : `${barColor}cc`,
                                            borderRadius: '0',
                                            transition: 'height 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        }}>
                                            {isOverGoal && (
                                                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.06) 4px, rgba(255,255,255,0.06) 8px)' }} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Month label */}
                                    <span style={{ fontSize: '0.52rem', fontWeight: 800, color: isSelected ? TEXT : MUTED, marginTop: '0.35rem', letterSpacing: '0.06em' }}>
                                        {monthNames[i]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── TOP CATEGORÍAS ── */}
            <div style={{ ...sectionLabel, marginBottom: '0.7rem' }}>
                Top Categorías {selectedMonth !== 'ALL' && `(${monthNames[parseInt(selectedMonth) - 1]})`}
            </div>

            {sortedCategories.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: MUTED, fontWeight: 700, fontSize: '0.82rem', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '0' }}>
                    Sin gastos en este período
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {sortedCategories.map(([cat, amount], idx) => {
                        const txForCat = transactions.find(t => t.tag === cat);
                        const catIcon = txForCat?.icon && txForCat.icon.length < 5 ? txForCat.icon : '💳';
                        const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0.0';
                        const isTop = idx === 0;

                        return (
                            <div
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    background: SURFACE,
                                    border: `1px solid ${isTop ? BORDER2 : BORDER}`,
                                    borderRadius: '0',
                                    padding: '0.9rem 1.1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                                    transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = BORDER2}
                                onMouseLeave={e => e.currentTarget.style.borderColor = isTop ? BORDER2 : BORDER}
                            >
                                {/* Vivid bottom progress bar */}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${pct}%`, background: idx === 0 ? GREEN : idx === 1 ? `${GREEN}99` : `${GREEN}66`, zIndex: 2, transition: 'width 0.8s ease' }} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', zIndex: 1 }}>
                                    {/* Icon box */}
                                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: SURF2, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                        {catIcon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: TEXT }}>
                                            {cat}
                                        </div>
                                        <div style={{ fontSize: '0.58rem', color: MUTED, fontWeight: 700, marginTop: '0.15rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            {pct}% del total
                                        </div>
                                    </div>
                                </div>

                                <div style={{ fontWeight: 900, fontSize: '1rem', color: TEXT, zIndex: 1, letterSpacing: '-0.01em', flexShrink: 0 }}>
                                    {sym}{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── CATEGORY DETAIL OVERLAY ── */}
            {selectedCategory && (
                <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 3000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                    {/* Sticky header */}
                    <div style={{
                        position: 'sticky', top: 0, background: BG,
                        borderBottom: `1px solid ${BORDER}`,
                        padding: `calc(1.25rem + env(safe-area-inset-top, 0px)) 1.5rem 1.25rem 1.5rem`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
                    }}>
                        <div>
                            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                                Desglose de Categoría
                            </div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: TEXT, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em' }}>
                                {selectedCategory}
                            </h2>
                        </div>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            style={{ background: SURFACE, border: `1px solid ${BORDER2}`, borderRadius: '0', color: TEXT, padding: '0.6rem 1.1rem', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                            </svg>
                            Volver
                        </button>
                    </div>

                    {/* Transactions list */}
                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredTransactions.filter(t => t.tag === selectedCategory).map(tx => (
                            <div
                                key={tx.id}
                                style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '0', padding: '0.85rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: TEXT, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{tx.desc}</div>
                                    <div style={{ fontSize: '0.6rem', color: MUTED, fontWeight: 700, marginTop: '0.2rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tx.date}</div>
                                </div>
                                <div style={{ fontWeight: 900, fontSize: '0.95rem', color: tx.type === 'expense' ? RED : GREEN, flexShrink: 0, letterSpacing: '-0.01em' }}>
                                    {tx.type === 'expense' ? '-' : '+'}{sym}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        ))}
                        {filteredTransactions.filter(t => t.tag === selectedCategory).length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: MUTED, fontSize: '0.82rem', fontWeight: 700 }}>
                                Sin transacciones en este período
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
