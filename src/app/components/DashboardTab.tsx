import React, { useEffect, useState } from 'react';
import { IconShapes } from './Icons';
import { Transaction } from "../../types";
import { useRouter } from 'next/navigation';

type DashboardTabProps = {
    transactions: Transaction[];
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;
    monthlyGoal: number;
    savingsTarget: number;
    onTransactionClick: (tx: Transaction) => void;
    globalCurrency: string;
    isTravelMode?: boolean;
    toggleTravelMode?: () => void;
    onAddClick?: () => void;
    allTransactions?: Transaction[];
    setIsAddModalOpen?: (open: boolean) => void;
    setAddModalInitialData?: (data: Partial<Transaction> | null) => void;
};

// Hook: watch window width
function useWindowWidth() {
    const [width, setWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );
    useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return width;
}

// Icon map for transaction categories
const categoryIconMap: Record<string, string> = {
    alquiler: '🏠', viajes: '✈️', comida: '🍔', suscripcion: '🎵',
    internet: '📡', seguro: '🛡️', impuestos: '🏛️', transporte: '🚌',
    entretenimiento: '🎬', salud: '💊', educacion: '📚', default: '💳'
};
const getIcon = (tag: string) =>
    categoryIconMap[tag?.toLowerCase()] || categoryIconMap.default;

// Month name helper
const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const getCurrentMonth = () => months[new Date().getMonth()];

export const DashboardTab = ({
    transactions, totalIncome, totalExpense, currentBalance,
    monthlyGoal, savingsTarget, onTransactionClick, globalCurrency,
    isTravelMode, toggleTravelMode, onAddClick, allTransactions,
    setIsAddModalOpen, setAddModalInitialData
}: DashboardTabProps) => {
    const router = useRouter();
    const windowWidth = useWindowWidth();

    // Responsive breakpoints
    const isMobile = windowWidth < 640;   // phones
    const isTablet = windowWidth < 960;   // tablets / small desktop

    const sym = globalCurrency === 'ILS' ? '₪' : (globalCurrency === 'EUR' ? '€' : '$');
    const userName = localStorage.getItem("financeUserName") || "OPERADOR";

    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const curMonthName = monthNames[curMonth];

    const parseTxDate = (d: string) => {
        if (!d || d === 'Hoy') return new Date();
        if (d === 'Ayer') { const yesterday = new Date(); yesterday.setDate(now.getDate() - 1); return yesterday; }
        const parts = d.split(d.includes('/') ? '/' : '-');
        if (parts.length < 2) return new Date(0);
        if (parts[0].length === 4) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) || 1);
        return new Date(Number(parts[2]) || curYear, Number(parts[1]) - 1, Number(parts[0]));
    };

    // Dashboard context: Current month stats
    const currentMonthTxs = transactions.filter(t => {
        const d = parseTxDate(t.date);
        return d.getMonth() === curMonth && d.getFullYear() === curYear || t.date === 'Hoy' || t.date === 'Ayer';
    });

    const monthIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const monthExpense = currentMonthTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

    // Goal: only this month's expenses, excluding recurring ones
    const expensesForGoal = currentMonthTxs.filter(t => t.type === 'expense' && !t.excludeFromBudget && t.goalType !== 'mensual' && t.goalType !== 'periodo');
    const totalExpenseForGoal = expensesForGoal.reduce((acc, curr) => acc + curr.amount, 0);
    const progressPct = monthlyGoal > 0 ? Math.min((totalExpenseForGoal / monthlyGoal) * 100, 100) : 0;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPct / 100) * circumference;

    // Categories top (donut)
    const catTotals = expensesForGoal.reduce((acc, tx) => {
        acc[tx.tag] = (acc[tx.tag] || 0) + tx.amount;
        return acc;
    }, {} as Record<string, number>);

    // Liquidity change calculation (spending vs last month)
    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
    const prevYear = curMonth === 0 ? curYear - 1 : curYear;
    const prevMonthSpending = transactions
        .filter(t => {
            const d = parseTxDate(t.date);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.type === 'expense' && !t.excludeFromBudget && t.goalType !== 'mensual' && t.goalType !== 'periodo';
        })
        .reduce((acc, t) => acc + t.amount, 0);

    let spendingChangePct = 0;
    if (prevMonthSpending > 0) {
        spendingChangePct = ((totalExpenseForGoal - prevMonthSpending) / prevMonthSpending) * 100;
    }
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topSum = topCats.reduce((acc, c) => acc + c[1], 0);
    let currentCatOffset = 0;
    const palette = ['#5d7253', '#8e4a39', '#e0e0ce'];
    const topCatSegments = topCats.map((cat) => {
        const pct = topSum > 0 ? (cat[1] / topSum) * 100 : 0;
        const segmentDasharray = `${(pct / 100) * circumference} ${circumference}`;
        const segmentDashoffset = -currentCatOffset;
        currentCatOffset += (pct / 100) * circumference;
        return { tag: cat[0], pct, segmentDasharray, segmentDashoffset, amount: cat[1] };
    });

    const recentTx = transactions.slice(0, 7);

    // Payment Checklist Logic
    const sourceForFixed = allTransactions || transactions;
    const monthlyMasterMap = new Map<string, { latest: Transaction, isPaid: boolean, day: number, label: string }>();

    sourceForFixed.forEach(t => {
        if (t.type !== 'expense') return;
        // Only consider recurring items that are NOT cancelled
        if ((t.goalType !== 'mensual' && t.goalType !== 'periodo') || t.isCancelled) return;

        const cleanDesc = t.desc.trim().toLowerCase();
        const cleanTag = t.tag.trim().toLowerCase();
        const key = `${cleanDesc}-${cleanTag}`;
        const txDate = parseTxDate(t.date);

        // Recurrence logic: 
        // 1. Mensual: every month.
        // 2. Periodo: every X months.
        let isDueThisMonth = false;
        if (t.goalType === 'mensual') {
            isDueThisMonth = true;
        } else if (t.goalType === 'periodo' && t.periodicity) {
            const monthsDiff = (curYear * 12 + curMonth) - (txDate.getFullYear() * 12 + txDate.getMonth());
            if (monthsDiff >= 0 && monthsDiff % t.periodicity === 0) {
                isDueThisMonth = true;
            }
        }

        if (!isDueThisMonth) return;

        const isPaidThisMonth = (txDate.getMonth() === curMonth && txDate.getFullYear() === curYear) || t.date === 'Hoy';

        const existing = monthlyMasterMap.get(key);
        if (!existing || parseTxDate(existing.latest.date) < txDate) {
            monthlyMasterMap.set(key, {
                latest: t,
                isPaid: (existing?.isPaid || isPaidThisMonth),
                day: txDate.getDate(),
                label: t.desc.trim()
            });
        } else if (isPaidThisMonth) {
            existing.isPaid = true;
        }
    });

    const fixedTxsData = Array.from(monthlyMasterMap.values())
        .sort((a, b) => {
            if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
            return a.day - b.day;
        });

    /* ─────────── shared style tokens ─────────── */
    const card: React.CSSProperties = {
        background: '#141714', border: '1px solid #222',
        borderRadius: '10px', padding: '1.25rem',
        display: 'flex', flexDirection: 'column',
    };
    const cardLabel: React.CSSProperties = {
        fontSize: '0.65rem', fontWeight: 800, color: '#8c8c80',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem'
    };
    const stableBadge: React.CSSProperties = {
        background: '#5d7253', color: '#fff', fontSize: '0.55rem',
        padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.05em'
    };
    const panelTitleBar: React.CSSProperties = {
        width: '4px', height: '16px', background: '#5d7253', borderRadius: '2px'
    };
    const seeAll: React.CSSProperties = {
        fontSize: '0.65rem', fontWeight: 800, color: '#5d7253',
        cursor: 'pointer', letterSpacing: '0.05em'
    };

    /* ─────────── layout vars based on breakpoint ─────────── */
    // Top-row: 3 cols on desktop, 1 col on mobile (balance always first, then goal, then cats)
    const topRowStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr',
        gap: '1rem',
    };

    // Bottom row: side-by-side on desktop, stacked on tablet/mobile
    const bottomRowStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr',
        gap: '1rem',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: isMobile ? '0' : '1rem' }}>


            {/* ── TOP ROW: 3 Cards ── */}
            <div style={topRowStyle}>

                {/* 1. Liquidez actual */}
                <div style={{ ...card, background: isTravelMode ? '#2a1515' : '#141714', position: 'relative', overflow: 'hidden', minHeight: '140px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={cardLabel}>{isTravelMode ? 'Presupuesto Viaje' : 'Liquidez Actual'}</span>
                        <span style={stableBadge}>ESTABLE</span>
                    </div>
                    <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, color: '#e0e0ce', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                        {sym}{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: spendingChangePct > 0 ? '#8e4a39' : '#5d7253', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {spendingChangePct > 0 ? '↗' : '↘'} {Math.abs(spendingChangePct).toFixed(1)}% {spendingChangePct > 0 ? 'más' : 'menos'} este mes
                    </div>
                    {/* subtle wave */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.06 }}>
                        <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ width: '100%', height: '36px', display: 'block' }}>
                            <path d="M0,20 L0,12 Q25,20 50,10 T100,4 L100,20 Z" fill="#5d7253" />
                        </svg>
                    </div>
                </div>

                {/* 2. Meta de Gastos */}
                <div style={card}>
                    <span style={cardLabel}>Meta de Gastos</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative', margin: '0.25rem 0' }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px' }}>
                            <circle cx="50" cy="50" r={radius} stroke="#222" strokeWidth="12" fill="none" />
                            <circle
                                cx="50" cy="50" r={radius}
                                stroke={progressPct >= 100 ? '#8e4a39' : '#5d7253'}
                                strokeWidth="12" fill="none"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                transform="rotate(-90 50 50)"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#e0e0ce' }}>{Math.round(progressPct)}%</span>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#8c8c80', textTransform: 'uppercase' }}>Usado</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.55rem', color: '#8c8c80', fontWeight: 800, textTransform: 'uppercase' }}>Gastado</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#e0e0ce' }}>
                                {sym}{totalExpenseForGoal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.55rem', color: '#8c8c80', fontWeight: 800, textTransform: 'uppercase' }}>Límite</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#e0e0ce' }}>{sym}{monthlyGoal.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* 3. Categorías Top — hidden on mobile if only 1-col to save space, shown otherwise */}
                <div style={{ ...card, display: isMobile ? 'none' : 'flex' }}>
                    <span style={cardLabel}>Categorías Top</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ width: '85px', height: '85px', position: 'relative', flexShrink: 0 }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <circle cx="50" cy="50" r={radius} stroke="#222" strokeWidth="20" fill="none" />
                                {topCatSegments.length === 0 && (
                                    <circle cx="50" cy="50" r={radius} stroke="#2a2a2a" strokeWidth="20" fill="none" />
                                )}
                                {topCatSegments.map((seg, i) => (
                                    <circle
                                        key={i} cx="50" cy="50" r={radius}
                                        stroke={palette[i % palette.length]}
                                        strokeWidth="20" fill="none"
                                        strokeDasharray={seg.segmentDasharray}
                                        strokeDashoffset={seg.segmentDashoffset}
                                    />
                                ))}
                            </svg>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            {topCatSegments.length > 0 ? topCatSegments.map((seg, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette[i % palette.length], flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e0e0ce', textTransform: 'capitalize' }}>{seg.tag}</span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8c8c80' }}>{Math.round(seg.pct)}%</span>
                                </div>
                            )) : (
                                <div style={{ fontSize: '0.7rem', color: '#8c8c80', fontWeight: 700 }}>Sin datos aún</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* ── BOTTOM ROW: Actividad + Timeline ── */}
            <div style={bottomRowStyle}>

                {/* LEFT: Actividad Reciente */}
                <div style={{ ...card, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#e0e0ce', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={panelTitleBar} />
                            Actividad Reciente
                        </div>
                        <div onClick={() => router.push('/movements')} style={seeAll}>VER TODO</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' }}>
                        {recentTx.length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#8c8c80', fontWeight: 700 }}>Sin transacciones recientes.</div>
                        )}
                        {recentTx.map((tx) => (
                            <div
                                key={tx.id}
                                onClick={() => onTransactionClick(tx)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.65rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                                    background: '#1a1a1a', transition: 'background 0.15s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                    <div style={{
                                        width: '34px', height: '34px', borderRadius: '8px', background: '#222',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1rem', flexShrink: 0
                                    }}>
                                        {tx.icon && tx.icon.length < 5 ? tx.icon : getIcon(tx.tag)}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e0e0ce', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {tx.desc}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: '#8c8c80', fontWeight: 600, marginTop: '0.1rem' }}>
                                            {tx.tag} • {tx.date}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.82rem', fontWeight: 900, flexShrink: 0, marginLeft: '0.5rem',
                                    color: tx.type === 'expense' ? '#8e4a39' : '#5d7253',
                                    fontFamily: 'var(--font-display)'
                                }}>
                                    {tx.type === 'expense' ? '-' : '+'}{sym}{tx.amount.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Línea de Pagos */}
                <div style={{ ...card, position: 'relative', paddingBottom: '3.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#e0e0ce', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5d7253" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            Ficha de Pagos
                        </div>
                        <span style={{ ...stableBadge, background: '#1a1a1a', color: '#5d7253', border: '1px solid #333' }}>
                            {curMonthName?.toUpperCase()}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
                        {fixedTxsData.length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#8c8c80', fontWeight: 700 }}>
                                Sin gastos fijos registrados.
                            </div>
                        )}
                        {fixedTxsData.map((item, i) => {
                            const { latest: tx, isPaid, day, label } = item;
                            return (
                                <div
                                    key={tx.id}
                                    style={{ display: 'flex', gap: '0.75rem', paddingBottom: '0.85rem', cursor: 'pointer', opacity: isPaid ? 0.7 : 1 }}
                                    onClick={() => {
                                        if (isPaid) {
                                            onTransactionClick(tx);
                                        } else if (setIsAddModalOpen && setAddModalInitialData) {
                                            setAddModalInitialData({
                                                desc: tx.desc,
                                                amount: tx.amountILS,
                                                tag: tx.tag,
                                                icon: tx.icon,
                                                type: 'expense',
                                                goalType: tx.goalType as any,
                                                periodicity: tx.periodicity,
                                                excludeFromBudget: tx.excludeFromBudget
                                            });
                                            setIsAddModalOpen(true);
                                        }
                                    }}
                                >
                                    {/* dot + line */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3px' }}>
                                        <div style={{
                                            width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                                            background: isPaid ? '#5d7253' : '#a16207',
                                            border: isPaid ? 'none' : '2px solid #ca8a04'
                                        }} />
                                        {i < fixedTxsData.length - 1 && (
                                            <div style={{ width: '1px', flex: 1, background: '#2a2a2a', marginTop: '4px' }} />
                                        )}
                                    </div>
                                    {/* content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isPaid ? '#a0a090' : '#e0e0ce', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {label}
                                            </div>
                                            {tx.goalType === 'periodo' && (
                                                <span style={{ fontSize: '0.45rem', background: '#232623', color: '#8c8c80', border: '1px solid #333', padding: '0.05rem 0.25rem', borderRadius: '3px', fontWeight: 900 }}>
                                                    {tx.periodicity === 12 ? 'ANUAL' : tx.periodicity === 6 ? 'SEMESTRAL' : `CADA ${tx.periodicity}M`}
                                                </span>
                                            )}
                                            {isPaid ? (
                                                <span style={{ fontSize: '0.45rem', background: '#5d7253', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 900 }}>PAGADO</span>
                                            ) : (
                                                <span style={{ fontSize: '0.45rem', background: '#422006', color: '#fbbf24', border: '1px solid #78350f', padding: '0.05rem 0.25rem', borderRadius: '3px', fontWeight: 900 }}>PENDIENTE</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: '#8c8c80', fontWeight: 600 }}>
                                            Referencia: Día {day} • {tx.tag}
                                        </div>
                                    </div>
                                    {/* amount */}
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: isPaid ? '#5d7253' : '#8e4a39', flexShrink: 0, fontFamily: 'var(--font-display)' }}>
                                        {sym}{tx.amount.toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer actions */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        borderTop: '1px solid #1e1e1e', display: 'flex', alignItems: 'center',
                        background: '#141714', borderRadius: '0 0 10px 10px'
                    }}>
                        <button
                            onClick={() => {
                                if (setIsAddModalOpen && setAddModalInitialData) {
                                    setAddModalInitialData({ goalType: 'mensual' });
                                    setIsAddModalOpen(true);
                                }
                            }}
                            style={{
                                flex: 1, padding: '0.75rem 1rem', background: 'transparent',
                                color: '#8c8c80', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer',
                                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                letterSpacing: '0.05em'
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5d7253" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                            Añadir Recurrente
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
