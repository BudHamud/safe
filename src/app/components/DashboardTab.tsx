import React, { useEffect, useState } from 'react';
import { Transaction } from "../../types";
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

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
    const { t, lang } = useLanguage();

    // Responsive breakpoints
    const isMobile = windowWidth < 640;   // phones
    const isTablet = windowWidth < 960;   // tablets / small desktop

    const sym = globalCurrency === 'ILS' ? '₪' : (globalCurrency === 'EUR' ? '€' : '$');
    const userName = localStorage.getItem("financeUserName") || "OPERADOR";

    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const curMonthName = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', { month: 'long' }).format(now);

    const getTxAmountForCurrency = (tx: Transaction) => {
        if (globalCurrency === 'USD') return tx.amountUSD ?? tx.amount;
        if (globalCurrency === 'ARS') return tx.amountARS ?? tx.amount;
        if (globalCurrency === 'EUR') return tx.amountEUR ?? tx.amount;
        return tx.amountILS ?? tx.amount;
    };

    const getRecurringLabel = (periodicity?: number) => {
        if (!periodicity) return '';
        if (periodicity === 12) return t('dashboard.annual');
        if (periodicity === 6) return t('dashboard.biannual');
        return `${t('dashboard.every_n_months')} ${periodicity}M`;
    };

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
    const palette = ['var(--primary)', 'var(--accent)', 'var(--text-main)'];
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
        background: 'var(--w-card-bg, var(--surface))', border: '1px solid var(--w-card-border, var(--border))',
        borderRadius: '10px', padding: '1.25rem',
        display: 'flex', flexDirection: 'column',
    };
    const cardLabel: React.CSSProperties = {
        fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem'
    };
    const stableBadge: React.CSSProperties = {
        background: 'var(--primary)', color: 'var(--primary-text)', fontSize: '0.55rem',
        padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.05em'
    };
    const panelTitleBar: React.CSSProperties = {
        width: '4px', height: '16px', background: 'var(--primary)', borderRadius: '2px'
    };
    const seeAll: React.CSSProperties = {
        fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)',
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
        <div data-color-zone="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: isMobile ? '0' : '1rem' }}>


            {/* ── TOP ROW: 3 Cards ── */}
            <div style={topRowStyle}>

                {/* 1. Liquidez actual */}
                <div style={{ ...card, position: 'relative', overflow: 'hidden', minHeight: '140px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={cardLabel}>{isTravelMode ? t('dashboard.travel_budget') : t('dashboard.liquidity')}</span>
                        {(() => {
                            const isNeg = currentBalance < 0;
                            const isLow = !isNeg && monthIncome > 0 && (currentBalance / monthIncome) < 0.1;
                            const isSolid = !isNeg && !isLow && monthIncome > 0 && (currentBalance / monthIncome) > 0.4;
                            const bg = isNeg ? 'var(--accent)' : isLow ? '#78350f' : isSolid ? 'var(--primary)' : 'var(--primary)';
                            const fg = isNeg ? 'var(--accent-text)' : isLow ? '#fbbf24' : 'var(--primary-text)';
                            const label = isNeg ? t('dashboard.status_red') : isLow ? t('dashboard.status_tight') : isSolid ? t('dashboard.status_solid') : t('dashboard.status_stable');
                            return <span style={{ ...stableBadge, background: bg, color: fg }}>{label}</span>;
                        })()}
                    </div>
                    <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                        {formatCurrency(currentBalance, sym)}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: spendingChangePct > 0 ? 'var(--accent)' : 'var(--primary)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {spendingChangePct > 0 ? '↗' : '↘'} {Math.abs(spendingChangePct).toFixed(1)}% {spendingChangePct > 0 ? t('dashboard.spending_more') : t('dashboard.spending_less')}
                    </div>
                    {/* dynamic wave */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        opacity: 0.08 + (progressPct / 200),
                        transition: 'all 1s ease-in-out'
                    }}>
                        <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{
                            width: '100%',
                            height: `${30 + (progressPct * 0.4)}px`,
                            display: 'block',
                            transition: 'height 1s ease-in-out'
                        }}>
                            <path d="M0,20 L0,12 Q25,20 50,10 T100,4 L100,20 Z" fill={progressPct > 80 ? 'var(--accent)' : 'var(--primary)'} />
                        </svg>
                    </div>
                </div>

                {/* 2. Meta de Gastos */}
                <div style={card}>
                    <span style={cardLabel}>{t('dashboard.expense_goal') ?? 'Meta de Gastos'}</span>
                    {monthlyGoal === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface-alt)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>{t('dashboard.no_limit')}</div>
                                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 600 }}>{t('dashboard.set_goal_hint')}</div>
                            </div>
                            <button
                                onClick={() => router.push('/profile')}
                                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 800, padding: '0.45rem 0.9rem', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                            >
                                {t('dashboard.configure_limit')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative', margin: '0.25rem 0' }}>
                                <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px' }}>
                                    <circle cx="50" cy="50" r={radius} stroke="var(--border-dim)" strokeWidth="12" fill="none" />
                                    <circle
                                        cx="50" cy="50" r={radius}
                                        stroke={progressPct >= 100 ? 'var(--accent)' : 'var(--primary)'}
                                        strokeWidth="12" fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                        transform="rotate(-90 50 50)"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>{Math.round(progressPct)}%</span>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('common.used')}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{t('common.spent')}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)' }}>{formatCurrency(totalExpenseForGoal, sym)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{t('common.limit')}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)' }}>{formatCurrency(monthlyGoal, sym)}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 3. Categorías Top — hidden on mobile if only 1-col to save space, shown otherwise */}
                <div style={{ ...card, display: isMobile ? 'none' : 'flex' }}>
                    <span style={cardLabel}>{t('dashboard.top_cats')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ width: '85px', height: '85px', position: 'relative', flexShrink: 0 }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <circle cx="50" cy="50" r={radius} stroke="var(--border-dim)" strokeWidth="20" fill="none" />
                                {topCatSegments.length === 0 && (
                                    <circle cx="50" cy="50" r={radius} stroke="var(--surface-hover)" strokeWidth="20" fill="none" />
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
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize' }}>{seg.tag}</span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{Math.round(seg.pct)}%</span>
                                </div>
                            )) : (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('dashboard.no_data')}</div>
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
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={panelTitleBar} />
                            {t('dashboard.activity')}
                        </div>
                        <div onClick={() => router.push('/app/movements')} style={seeAll}>{t('common.see_all')}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' }}>
                        {recentTx.length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('dashboard.no_recent')}</div>
                        )}
                        {recentTx.map((tx) => (
                            <div
                                key={tx.id}
                                onClick={() => onTransactionClick(tx)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.65rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                                    background: 'var(--surface-alt)', transition: 'background 0.15s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                    <div style={{
                                        width: '34px', height: '34px', borderRadius: '8px', background: 'var(--surface-alt)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1rem', flexShrink: 0
                                    }}>
                                        {tx.icon && tx.icon.length < 5 ? tx.icon : getIcon(tx.tag)}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {tx.desc}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>
                                            {tx.tag} • {tx.date}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.82rem', fontWeight: 900, flexShrink: 0, marginLeft: '0.5rem',
                                    color: tx.type === 'expense' ? 'var(--accent)' : 'var(--primary)',
                                    fontFamily: 'var(--font-display)'
                                }}>
                                    {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, sym)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Línea de Pagos */}
                <div style={{ ...card, position: 'relative', paddingBottom: '3.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {t('dashboard.payment_sheet')}
                        </div>
                        <span style={{ ...stableBadge, background: 'var(--surface-alt)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                            {curMonthName?.toUpperCase()}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
                        {fixedTxsData.length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                {t('dashboard.no_fixed')}
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
                                                amount: getTxAmountForCurrency(tx),
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
                                            background: isPaid ? 'var(--primary)' : 'var(--accent)',
                                            border: isPaid ? 'none' : '2px solid var(--accent)'
                                        }} />
                                        {i < fixedTxsData.length - 1 && (
                                            <div style={{ width: '1px', flex: 1, background: 'var(--border-dim)', marginTop: '4px' }} />
                                        )}
                                    </div>
                                    {/* content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isPaid ? 'var(--text-muted)' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {label}
                                            </div>
                                            {tx.goalType === 'periodo' && (
                                                <span style={{ fontSize: '0.45rem', background: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.05rem 0.25rem', borderRadius: '3px', fontWeight: 900 }}>
                                                    {getRecurringLabel(tx.periodicity)}
                                                </span>
                                            )}
                                            {isPaid ? (
                                                <span style={{ fontSize: '0.45rem', background: 'var(--primary)', color: 'var(--primary-text)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 900 }}>{t('dashboard.paid')}</span>
                                            ) : (
                                                <span style={{ fontSize: '0.45rem', background: 'var(--surface-alt)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '0.05rem 0.25rem', borderRadius: '3px', fontWeight: 900 }}>{t('dashboard.pending')}</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            {t('dashboard.reference_day')} {day} • {tx.tag}
                                        </div>
                                    </div>
                                    {/* amount */}
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: isPaid ? 'var(--primary)' : 'var(--accent)', flexShrink: 0, fontFamily: 'var(--font-display)' }}>
                                        {formatCurrency(getTxAmountForCurrency(tx), sym)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer actions */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        borderTop: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center',
                        background: 'var(--surface)', borderRadius: '0 0 10px 10px'
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
                                color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer',
                                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                letterSpacing: '0.05em'
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                            {t('dashboard.add_recurring')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
