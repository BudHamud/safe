import React, { useEffect, useState } from 'react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { MONTHS, formatDate, getTxIcon } from './movements.utils';
import { useMovementsLogic, SidebarData } from './useMovementsLogic';
import { useLanguage } from '../../context/LanguageContext';

// ─── Props ────────────────────────────────────────────────────────────────────

type MovementsTabProps = {
    transactions: Transaction[];
    onTransactionClick: (tx: Transaction) => void;
    userId: string | null;
    onTransactionsUpdated: () => void;
    globalCurrency: string;
    availableCategories: any[];
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const TOKEN = {
    dark: '#141714',
    border: '#222',
    text: '#e0e0ce',
    muted: '#8c8c80',
    green: '#5d7253',
    red: '#8e4a39',
    surface: '#1e1e1e',
} as const;

// ─── Style factories ──────────────────────────────────────────────────────────

const iconBtnStyle = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
    border: `1px solid ${active ? TOKEN.green : '#333'}`,
    background: active ? TOKEN.green : '#1a1a1a',
    color: active ? '#fff' : TOKEN.muted,
    letterSpacing: '0.04em', transition: 'all 0.15s',
});

const selectStyle: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px',
    color: TOKEN.text, fontSize: '0.7rem', fontWeight: 700,
    padding: '0.4rem 0.6rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// Pill badge on a transaction card (MENSUAL / RECURRENTE / CANCELADO)
const TxBadge = ({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) => (
    <span style={{ fontSize: '0.5rem', background: bg, color, padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 800 }}>
        {children}
    </span>
);

// Single transaction card
const TxCard = ({ tx, sym, onClick }: { tx: Transaction; sym: string; onClick: () => void }) => (
    <div
        onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', cursor: 'pointer', background: '#1a1a1a', borderRadius: '10px', border: '1px solid #222', transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#222')}
        onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
    >
        {/* Icon avatar */}
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: TOKEN.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
            {getTxIcon(tx)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, margin: '0 0.85rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: TOKEN.text, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.desc}
            </div>
            <div style={{ fontSize: '0.62rem', color: TOKEN.muted, fontWeight: 600, marginTop: '0.15rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {tx.tag} • {formatDate(tx.date)}
                {tx.goalType === 'mensual' && <TxBadge color={TOKEN.green} bg="#1e2b1e">MENSUAL</TxBadge>}
                {tx.goalType === 'periodo' && <TxBadge color={TOKEN.green} bg="#1e2b1e">RECURRENTE {tx.periodicity}M</TxBadge>}
                {tx.isCancelled && <TxBadge color={TOKEN.red} bg={`${TOKEN.red}22`}>CANCELADO</TxBadge>}
            </div>
        </div>

        {/* Amount */}
        <div style={{ fontSize: '0.9rem', fontWeight: 900, flexShrink: 0, color: tx.type === 'expense' ? TOKEN.red : TOKEN.green, fontFamily: 'var(--font-display)' }}>
            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, sym)}
        </div>
    </div>
);

// Sidebar: balance + income/expense
const SidebarBalance = ({ balance, income, expense, sym }: { balance: number; income: number; expense: number; sym: string }) => {
    const { t } = useLanguage();
    return (
    <div style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
            <div style={{ fontSize: '0.6rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase' }}>{t('common.balance')}</div>
            <div style={{ width: '28px', height: '28px', background: TOKEN.surface, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TOKEN.green} strokeWidth="2.5">
                    <rect x="2" y="5" width="20" height="14" /><line x1="2" y1="10" x2="22" y2="10" />
                </svg>
            </div>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: balance >= 0 ? TOKEN.text : TOKEN.red, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {formatCurrency(balance, sym)}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            {[{ label: t('common.income_arrow'), color: TOKEN.green, val: income }, { label: t('common.expense_arrow'), color: TOKEN.red, val: expense }].map(row => (
                <div key={row.label}>
                    <div style={{ fontSize: '0.55rem', color: row.color, fontWeight: 700 }}>{row.label}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: TOKEN.text }}>{formatCurrency(row.val, sym)}</div>
                </div>
            ))}
        </div>
    </div>
    );
};

// Sidebar: goal donut (month view)
const SidebarGoal = ({ goalPct, goalSpent, goalLimit, sym }: { goalPct: number; goalSpent: number; goalLimit: number; sym: string }) => {
    const { t } = useLanguage();
    const RADIUS = 46;
    const circ = 2 * Math.PI * RADIUS;
    const dash = circ - (goalPct / 100) * circ;

    if (goalLimit === 0) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: TOKEN.surface, border: '1px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4a4d4a" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#737670' }}>{t('movements.no_goal')}</div>
                <div style={{ fontSize: '0.55rem', color: '#4a4d4a', marginTop: '0.15rem', fontWeight: 600 }}>{t('movements.set_goal')}</div>
            </div>
        </div>
    );

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '0.25rem 0' }}>
                <svg viewBox="0 0 120 120" style={{ width: '110px', height: '110px' }}>
                    <circle cx="60" cy="60" r={RADIUS} stroke="#222" strokeWidth="14" fill="none" />
                    <circle cx="60" cy="60" r={RADIUS} stroke={goalPct >= 100 ? TOKEN.red : TOKEN.green} strokeWidth="14" fill="none"
                        strokeDasharray={circ} strokeDashoffset={dash}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                        transform="rotate(-90 60 60)" strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: TOKEN.text }}>{Math.round(goalPct)}%</span>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[{ label: t('common.spent'), val: goalSpent }, { label: t('common.limit'), val: goalLimit }].map(({ label, val }) => (
                    <div key={label} style={label === t('common.limit') ? { textAlign: 'right' } : {}}>
                        <div style={{ fontSize: '0.55rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: TOKEN.text }}>{formatCurrency(val, sym)}</div>
                    </div>
                ))}
            </div>
        </>
    );
};

// Sidebar: fixed vs variable bars (year / history view)
const SidebarFixedVar = ({ fixedPct, varPct, fixedAmt, varAmt, sym }: { fixedPct: number; varPct: number; fixedAmt: number; varAmt: number; sym: string }) => {
    const { t } = useLanguage();
    const rows = [
        { label: t('movements.fixed_expenses'), pct: fixedPct, amt: fixedAmt, color: TOKEN.green },
        { label: t('movements.variable_expenses'), pct: varPct, amt: varAmt, color: TOKEN.red },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {rows.map(row => (
                <div key={row.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: TOKEN.text }}>{row.label}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: TOKEN.muted }}>{row.pct}%</span>
                    </div>
                    <div style={{ height: '5px', background: TOKEN.surface, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: '3px', transition: 'width 0.7s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.58rem', color: '#737670', marginTop: '0.15rem' }}>{formatCurrency(row.amt, sym)}</div>
                </div>
            ))}
        </div>
    );
};

// Sidebar: top categories bar chart
const SidebarTopCats = ({ topCats, maxCat, sym }: { topCats: [string, number][]; maxCat: number; sym: string }) => {
    const { t } = useLanguage();
    const BAR_COLORS = [TOKEN.green, TOKEN.red, '#4a5a42'];
    if (topCats.length === 0) return <div style={{ fontSize: '0.7rem', color: TOKEN.muted }}>{t('common.no_data')}</div>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {topCats.map(([cat, amt], i) => (
                <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TOKEN.text, textTransform: 'capitalize' }}>{cat}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: TOKEN.muted }}>{formatCurrency(amt, sym)}</span>
                    </div>
                    <div style={{ height: '4px', background: TOKEN.surface, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '2px', width: `${(amt / maxCat) * 100}%`, background: BAR_COLORS[i] ?? BAR_COLORS[2], transition: 'width 0.8s ease' }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// Full sidebar panel
const SidebarPanel = ({ sidebar, sym, fullWidth }: { sidebar: SidebarData; sym: string; fullWidth?: boolean }) => (
    <div style={{ width: fullWidth ? '100%' : '220px', flexShrink: 0 }}>
        <div style={{ background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '10px', padding: '1.1rem' }}>

            {/* Period label */}
            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: TOKEN.green, flexShrink: 0, display: 'inline-block' }} />
                {sidebar.label}
            </div>

            <SidebarBalance balance={sidebar.balance} income={sidebar.income} expense={sidebar.expense} sym={sym} />

            {/* Middle widget: donut (month) or fixed/variable (year/hist) */}
            <div style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid #1e1e1e' }}>
                <div style={{ fontSize: '0.6rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                    {sidebar.isMonth ? 'Objetivo Gastos' : 'Fijo vs Variable'}
                </div>
                {sidebar.isMonth
                    ? <SidebarGoal goalPct={sidebar.goalPct} goalSpent={sidebar.goalSpent} goalLimit={sidebar.goalLimit} sym={sym} />
                    : <SidebarFixedVar fixedPct={sidebar.fixedPct} varPct={sidebar.varPct} fixedAmt={sidebar.fixedAmt} varAmt={sidebar.varAmt} sym={sym} />
                }
            </div>

            {/* Top categories */}
            <div>
                <div style={{ fontSize: '0.6rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.7rem' }}>Top Categorías</div>
                <SidebarTopCats topCats={sidebar.topCats} maxCat={sidebar.maxCat} sym={sym} />
            </div>
        </div>
    </div>
);

// ─── Responsive hook ──────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [breakpoint]);
    return isMobile;
}

// ─── Main component ───────────────────────────────────────────────────────────

export const MovementsTab = ({
    transactions, onTransactionClick, userId, onTransactionsUpdated, globalCurrency, availableCategories,
}: MovementsTabProps) => {
    const isMobile = useIsMobile();
    const { t } = useLanguage();
    const {
        filters, patch, setPage,
        allCategories, years, filteredTxs, paginated, totalPages,
        sym, fileInputRef, sidebar,
        handleExport, handleImport,
    } = useMovementsLogic(transactions, userId, globalCurrency, onTransactionsUpdated);

    const { showFilters, search, filterMonth, filterYear, filterCategory, filterType, currentPage } = filters;
    const TYPE_LABELS: Record<string, string> = { all: t('movements.filter_all'), expense: `↓ ${t('movements.expenses')}`, income: `↑ ${t('movements.income')}` };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* ── TOP BAR ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: TOKEN.text, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {t('movements.title')}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button onClick={() => patch({ showFilters: !showFilters, currentPage: 1 } as any)} style={iconBtnStyle(showFilters)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {!isMobile && (showFilters ? t('movements.hide_filters') : t('movements.show_filters'))}
                    </button>

                    <button onClick={handleExport} style={iconBtnStyle()}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {!isMobile && t('movements.export')}
                    </button>

                    <button onClick={() => fileInputRef.current?.click()} style={{ ...iconBtnStyle(), background: '#1e2b1e', border: `1px solid ${TOKEN.green}`, color: TOKEN.green }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {!isMobile && t('movements.import_excel')}
                    </button>

                    <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImport} />
                </div>
            </div>

            {/* ── MAIN LAYOUT ── */}
            <div style={{ display: 'flex', gap: '1.25rem', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', width: '100%' }}>

                {/* LEFT: filters + list */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                    {/* Search */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '8px', padding: '0.6rem 1rem' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TOKEN.muted} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            placeholder={t('movements.search')}
                            value={search}
                            onChange={e => patch({ search: e.target.value })}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: TOKEN.text, fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                        />
                        {search && <button onClick={() => patch({ search: '' })} style={{ background: 'none', color: TOKEN.muted, cursor: 'pointer', fontSize: '1rem', padding: 0, fontFamily: 'inherit' }}>✕</button>}
                    </div>

                    {/* Filter row */}
                    {showFilters && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                            <select value={filterMonth} onChange={e => patch({ filterMonth: e.target.value === 'all' ? 'all' : Number(e.target.value) })} style={selectStyle}>
                                <option value="all">{t('movements.all_months')}</option>
                                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>

                            <select value={filterYear} onChange={e => patch({ filterYear: e.target.value === 'all' ? 'all' : Number(e.target.value) })} style={selectStyle}>
                                <option value="all">{t('movements.all_years')}</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>

                            <select value={filterCategory} onChange={e => patch({ filterCategory: e.target.value })} style={selectStyle}>
                                <option value="all">{t('movements.all_categories')}</option>
                                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                                {(['all', 'expense', 'income'] as const).map(t => (
                                    <button key={t} onClick={() => patch({ filterType: t })} style={{ ...iconBtnStyle(filterType === t), padding: '0.4rem 0.65rem' }}>
                                        {TYPE_LABELS[t]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!showFilters && (
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: TOKEN.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {t('dashboard.recent')}
                        </div>
                    )}

                    {/* Transaction list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredTxs.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: TOKEN.muted, fontWeight: 700, fontSize: '0.85rem', background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '10px' }}>
                                {t('movements.no_results')}
                            </div>
                        ) : (
                            <>
                                {paginated.map(tx => (
                                    <TxCard key={tx.id} tx={tx} sym={sym} onClick={() => onTransactionClick(tx)} />
                                ))}

                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', borderTop: '1px solid #1a1a1a' }}>
                                        <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ ...iconBtnStyle(), opacity: currentPage === 1 ? 0.4 : 1 }}>
                                            {t('movements.prev_page')}
                                        </button>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: TOKEN.muted }}>{currentPage} / {totalPages}</span>
                                        <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ ...iconBtnStyle(), opacity: currentPage === totalPages ? 0.4 : 1 }}>
                                            {t('movements.next_page')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* RIGHT: sidebar (hidden on mobile) */}
                {!isMobile && <SidebarPanel sidebar={sidebar} sym={sym} />}
            </div>

            {/* Sidebar below list on mobile */}
            {isMobile && <SidebarPanel sidebar={sidebar} sym={sym} fullWidth />}
        </div>
    );
};
