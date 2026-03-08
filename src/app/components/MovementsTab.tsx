import React, { useEffect, useState } from 'react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { MONTHS, formatDate, getTxIcon, MonthBlock, ImportedRow } from './movements.utils';
import { ColumnMapping } from './movements.utils';
import { useMovementsLogic, SidebarData } from './useMovementsLogic';
import { useLanguage } from '../../context/LanguageContext';

// ─── Props ────────────────────────────────────────────────────────────────────

type MovementsTabProps = {
    transactions: Transaction[];
    onTransactionClick: (tx: Transaction) => void;
    userId: string | null;
    onTransactionsUpdated: () => void;
    globalCurrency: string;
    monthlyGoal: number;
    availableCategories: any[];
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const TOKEN = {
    dark: 'var(--surface)',
    border: 'var(--border-dim)',
    text: 'var(--text-main)',
    muted: 'var(--text-muted)',
    green: 'var(--primary)',
    red: 'var(--accent)',
    surface: 'var(--surface-alt)',
} as const;

// ─── Style factories ──────────────────────────────────────────────────────────

const iconBtnStyle = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
    border: `1px solid ${active ? TOKEN.green : 'var(--border)'}`,
    background: active ? TOKEN.green : 'var(--surface-alt)',
    color: active ? 'var(--primary-text)' : TOKEN.muted,
    letterSpacing: '0.04em', transition: 'all 0.15s',
});

const selectStyle: React.CSSProperties = {
    background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '6px',
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
const TxCard = ({ tx, sym, onClick }: { tx: Transaction; sym: string; onClick: () => void }) => {
    const { t } = useLanguage();

    return (
        <div
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', cursor: 'pointer', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border-dim)', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--surface) 70%, #fff 30%)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
        >
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--w-tx-icon-bg, var(--surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                {getTxIcon(tx)}
            </div>

            <div style={{ flex: 1, minWidth: 0, margin: '0 0.85rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: TOKEN.text, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.desc}
                </div>
                <div style={{ fontSize: '0.62rem', color: TOKEN.muted, fontWeight: 600, marginTop: '0.15rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {tx.tag} • {formatDate(tx.date)}
                    {tx.goalType === 'mensual' && <TxBadge color={TOKEN.green} bg="var(--surface-alt)">{t('movements.badge_monthly')}</TxBadge>}
                    {tx.goalType === 'periodo' && <TxBadge color={TOKEN.green} bg="var(--surface-alt)">{t('movements.badge_recurring_n', { count: tx.periodicity ?? '' } as any)}</TxBadge>}
                    {tx.isCancelled && <TxBadge color={TOKEN.red} bg={`${TOKEN.red}22`}>{t('movements.badge_cancelled')}</TxBadge>}
                </div>
            </div>

            <div style={{ fontSize: '0.9rem', fontWeight: 900, flexShrink: 0, color: tx.type === 'expense' ? TOKEN.red : TOKEN.green, fontFamily: 'var(--font-display)' }}>
                {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, sym)}
            </div>
        </div>
    );
};

// Sidebar: balance + income/expense
const SidebarBalance = ({ balance, income, expense, sym }: { balance: number; income: number; expense: number; sym: string }) => {
    const { t } = useLanguage();
    return (
        <div style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-dim)' }}>
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
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: TOKEN.surface, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{t('movements.no_goal')}</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontWeight: 600 }}>{t('movements.set_goal')}</div>
            </div>
        </div>
    );

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '0.25rem 0' }}>
                <svg viewBox="0 0 120 120" style={{ width: '110px', height: '110px' }}>
                    <circle cx="60" cy="60" r={RADIUS} stroke="var(--border-dim)" strokeWidth="14" fill="none" />
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
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{formatCurrency(row.amt, sym)}</div>
                </div>
            ))}
        </div>
    );
};

// Sidebar: top categories bar chart
const SidebarTopCats = ({ topCats, maxCat, sym }: { topCats: [string, number][]; maxCat: number; sym: string }) => {
    const { t } = useLanguage();
    const BAR_COLORS = [TOKEN.green, TOKEN.red, 'var(--border)'];
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
const SidebarPanel = ({ sidebar, sym, fullWidth }: { sidebar: SidebarData; sym: string; fullWidth?: boolean }) => {
    const { t } = useLanguage();

    return (
        <div style={{ width: fullWidth ? '100%' : '220px', flexShrink: 0 }}>
            <div style={{ background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '10px', padding: '1.1rem' }}>

            {/* Period label */}
            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: TOKEN.green, flexShrink: 0, display: 'inline-block' }} />
                {sidebar.label}
            </div>

            <SidebarBalance balance={sidebar.balance} income={sidebar.income} expense={sidebar.expense} sym={sym} />

            {/* Middle widget: donut (month) or fixed/variable (year/hist) */}
                <div style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-dim)' }}>
                    <div style={{ fontSize: '0.6rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                        {sidebar.isMonth ? t('movements.sidebar_goal') : t('movements.sidebar_fixed_var')}
                    </div>
                    {sidebar.isMonth
                        ? <SidebarGoal goalPct={sidebar.goalPct} goalSpent={sidebar.goalSpent} goalLimit={sidebar.goalLimit} sym={sym} />
                        : <SidebarFixedVar fixedPct={sidebar.fixedPct} varPct={sidebar.varPct} fixedAmt={sidebar.fixedAmt} varAmt={sidebar.varAmt} sym={sym} />
                    }
                </div>

            {/* Top categories */}
            <div>
                <div style={{ fontSize: '0.6rem', color: TOKEN.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.7rem' }}>{t('movements.sidebar_top_cats')}</div>
                <SidebarTopCats topCats={sidebar.topCats} maxCat={sidebar.maxCat} sym={sym} />
            </div>
        </div>
    </div>
    );
};

// ─── Column mapping modal ─────────────────────────────────────────────────────

const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
    { key: 'dateCol', label: 'Fecha', required: true },
    { key: 'descCol', label: 'Descripción' },
    { key: 'debitCol', label: 'Monto (egreso)' },
    { key: 'creditCol', label: 'Monto (ingreso)' },
    { key: 'detailsCol', label: 'Detalles' },
    { key: 'categoryCol', label: 'Categoría' },
];

const autoDetect = (headers: string[], candidates: string[]): string => {
    const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return headers.find(h => candidates.some(c => norm(h) === c || norm(h).startsWith(c))) ?? '';
};

const ColumnMapModal = ({
    headers, onConfirm, onCancel, importProgress,
}: {
    headers: string[];
    onConfirm: (m: ColumnMapping) => void;
    onCancel: () => void;
    importProgress: { done: number; total: number } | null;
}) => {
    const buildDefault = (): ColumnMapping => ({
        dateCol: autoDetect(headers, ['date', 'fecha', 'dia']),
        descCol: autoDetect(headers, ['transaction', 'transactio', 'description', 'descripcion', 'concepto', 'titulo', 'desc']),
        debitCol: autoDetect(headers, ['debit', 'egreso', 'monto', 'amount']),
        creditCol: autoDetect(headers, ['credit', 'ingreso']),
        detailsCol: autoDetect(headers, ['details', 'detalle', 'detalles', 'additional']),
        categoryCol: autoDetect(headers, ['category', 'categoria', 'tag']),
    });

    const [mapping, setMapping] = useState<ColumnMapping>(buildDefault);
    const set = (key: keyof ColumnMapping) => (e: React.ChangeEvent<HTMLSelectElement>) =>
        setMapping(prev => ({ ...prev, [key]: e.target.value }));

    const canConfirm = !!mapping.dateCol && (!!mapping.debitCol || !!mapping.creditCol);
    const isImporting = importProgress !== null;
    const progressPct = isImporting ? Math.round((importProgress!.done / importProgress!.total) * 100) : 0;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
            <div style={{
                background: TOKEN.dark, border: `1px solid ${TOKEN.border}`,
                borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '460px',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                {/* Header */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                        Importar Excel
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: TOKEN.text }}>Configurar columnas</div>
                    <div style={{ fontSize: '0.68rem', color: TOKEN.muted, marginTop: '0.25rem' }}>
                        Asigná cada campo al nombre de columna de tu archivo.
                    </div>
                </div>

                {/* Column chips */}
                <div style={{ marginBottom: '1.1rem', padding: '0.7rem 0.85rem', background: TOKEN.surface, borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 700, color: TOKEN.muted, textTransform: 'uppercase', marginBottom: '0.45rem' }}>Columnas detectadas</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {headers.map(h => (
                            <span key={h} style={{ fontSize: '0.63rem', fontWeight: 700, color: TOKEN.text, background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.18rem 0.45rem' }}>
                                {h}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Field mappings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    {MAPPING_FIELDS.map(({ key, label, required }) => (
                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: required ? TOKEN.text : TOKEN.muted }}>
                                {label}{required && <span style={{ color: TOKEN.red }}> *</span>}
                            </span>
                            <select value={mapping[key]} onChange={set(key)} style={{ ...selectStyle, width: '100%' }}>
                                <option value="">— No usar —</option>
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    ))}
                </div>

                {!canConfirm && (
                    <div style={{ fontSize: '0.65rem', color: TOKEN.red, marginBottom: '0.85rem', fontWeight: 700 }}>
                        Seleccioná al menos Fecha y un campo de monto.
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexDirection: 'column' }}>

                    {/* Progress bar */}
                    {isImporting && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                <span style={{ fontSize: '0.63rem', fontWeight: 700, color: TOKEN.green }}>Importando...</span>
                                <span style={{ fontSize: '0.63rem', fontWeight: 800, color: TOKEN.text }}>
                                    {importProgress!.done} / {importProgress!.total} filas ({progressPct}%)
                                </span>
                            </div>
                            <div style={{ height: '5px', background: 'var(--surface-alt)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: '3px',
                                    background: TOKEN.green,
                                    width: `${progressPct}%`,
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        <button onClick={onCancel} disabled={isImporting} style={{ ...iconBtnStyle(), opacity: isImporting ? 0.4 : 1, cursor: isImporting ? 'default' : 'pointer' }}>Cancelar</button>
                        <button
                            onClick={() => canConfirm && !isImporting && onConfirm(mapping)}
                            style={{
                                ...iconBtnStyle(),
                                background: canConfirm && !isImporting ? TOKEN.green : 'var(--border)',
                                color: canConfirm && !isImporting ? 'var(--primary-text)' : TOKEN.muted,
                                border: `1px solid ${canConfirm && !isImporting ? TOKEN.green : 'var(--border)'}`,
                                opacity: canConfirm && !isImporting ? 1 : 0.5,
                                cursor: canConfirm && !isImporting ? 'pointer' : 'default',
                            }}
                        >
                            {isImporting ? `Importando... ${progressPct}%` : 'Importar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Import Review modal ──────────────────────────────────────────────────────

const ImportReviewModal = ({
    blocks, sym, onConfirm, onCancel, importProgress,
}: {
    blocks: MonthBlock[];
    sym: string;
    onConfirm: (rows: ImportedRow[]) => void;
    onCancel: () => void;
    importProgress: { done: number; total: number } | null;
}) => {
    // Selection state: monthKey → Set of selected row indexes
    const [selected, setSelected] = useState<Map<string, Set<number>>>(() => {
        const m = new Map<string, Set<number>>();
        blocks.forEach(b => m.set(b.monthKey, new Set(b.excelRows.map((_, i) => i))));
        return m;
    });
    const [activeMonth, setActiveMonth] = useState(blocks[0]?.monthKey ?? '');

    const isImporting = importProgress !== null;
    const progressPct = isImporting ? Math.round((importProgress!.done / importProgress!.total) * 100) : 0;

    const toggleRow = (monthKey: string, idx: number) => {
        setSelected(prev => {
            const next = new Map(prev);
            const s = new Set(next.get(monthKey) ?? []);
            s.has(idx) ? s.delete(idx) : s.add(idx);
            next.set(monthKey, s);
            return next;
        });
    };

    const toggleMonth = (monthKey: string, excelCount: number, forceVal?: boolean) => {
        setSelected(prev => {
            const next = new Map(prev);
            const cur = next.get(monthKey) ?? new Set<number>();
            const allSelected = cur.size === excelCount;
            const target = (forceVal !== undefined ? forceVal : !allSelected);
            next.set(monthKey, target ? new Set(Array.from({ length: excelCount }, (_, i) => i)) : new Set());
            return next;
        });
    };

    const selectAll = (val: boolean) => blocks.forEach(b => toggleMonth(b.monthKey, b.excelRows.length, val));

    const totalSelected = blocks.reduce((s, b) => s + (selected.get(b.monthKey)?.size ?? 0), 0);
    const totalRows = blocks.reduce((s, b) => s + b.excelRows.length, 0);

    const handleConfirm = () => {
        const rows: ImportedRow[] = [];
        for (const b of blocks) {
            const s = selected.get(b.monthKey) ?? new Set();
            b.excelRows.forEach((r, i) => { if (s.has(i)) rows.push(r); });
        }
        onConfirm(rows);
    };

    const activeBlock = blocks.find(b => b.monthKey === activeMonth);

    // Diff badge
    const DiffBadge = ({ excelExp, existExp }: { excelExp: number; existExp: number }) => {
        const diff = excelExp - existExp;
        const color = Math.abs(diff) < 0.01 ? TOKEN.muted : diff > 0 ? TOKEN.red : TOKEN.green;
        const label = Math.abs(diff) < 0.01 ? 'IGUAL' : diff > 0 ? `+${formatCurrency(diff, sym)}` : formatCurrency(diff, sym);
        return <span style={{ fontSize: '0.55rem', fontWeight: 800, color, background: `${color}22`, padding: '0.1rem 0.35rem', borderRadius: '3px' }}>{label}</span>;
    };

    const MonthStatusBadge = ({ b }: { b: MonthBlock }) => {
        if (b.existingTxs.length === 0) return <span style={{ fontSize: '0.5rem', fontWeight: 800, color: TOKEN.green, background: 'var(--surface-alt)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>NUEVO</span>;
        const diff = Math.abs(b.excelExpense - b.existingExpense);
        if (diff < 0.01) return <span style={{ fontSize: '0.5rem', fontWeight: 800, color: TOKEN.muted, background: 'var(--surface-alt)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>CUBIERTO</span>;
        return <span style={{ fontSize: '0.5rem', fontWeight: 800, color: 'var(--accent)', background: 'var(--surface-alt)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>DIFERENCIA</span>;
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ background: TOKEN.dark, border: `1px solid ${TOKEN.border}`, borderRadius: '14px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '1.1rem 1.4rem', borderBottom: `1px solid ${TOKEN.border}`, flexShrink: 0 }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Importar Excel — Paso 2 de 2</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: TOKEN.text }}>Revisión por meses</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => selectAll(true)} disabled={isImporting} style={{ ...iconBtnStyle(), fontSize: '0.6rem' }}>✓ Todo</button>
                            <button onClick={() => selectAll(false)} disabled={isImporting} style={{ ...iconBtnStyle(), fontSize: '0.6rem' }}>✗ Nada</button>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: TOKEN.muted, marginTop: '0.2rem' }}>
                        {blocks.length} {blocks.length === 1 ? 'mes' : 'meses'} detectados · {totalSelected} / {totalRows} filas seleccionadas
                    </div>
                </div>

                {/* Body: two-panel layout */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                    {/* Left: month list */}
                    <div style={{ width: '210px', flexShrink: 0, borderRight: `1px solid ${TOKEN.border}`, overflowY: 'auto', padding: '0.6rem 0' }}>
                        {blocks.map(b => {
                            const sel = selected.get(b.monthKey) ?? new Set();
                            const allSel = sel.size === b.excelRows.length;
                            const someSel = sel.size > 0 && !allSel;
                            const isActive = b.monthKey === activeMonth;
                            return (
                                <div
                                    key={b.monthKey}
                                    onClick={() => setActiveMonth(b.monthKey)}
                                    style={{ padding: '0.6rem 0.85rem', cursor: 'pointer', background: isActive ? 'var(--surface-alt)' : 'transparent', borderLeft: `3px solid ${isActive ? TOKEN.green : 'transparent'}`, transition: 'all 0.1s' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={allSel}
                                            ref={el => { if (el) el.indeterminate = someSel; }}
                                            onChange={e => { e.stopPropagation(); toggleMonth(b.monthKey, b.excelRows.length); }}
                                            disabled={isImporting}
                                            style={{ accentColor: TOKEN.green, cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isActive ? TOKEN.green : TOKEN.text }}>{b.label}</span>
                                        <MonthStatusBadge b={b} />
                                    </div>
                                    <div style={{ fontSize: '0.58rem', color: TOKEN.muted, paddingLeft: '1.3rem' }}>
                                        XLS: <span style={{ color: TOKEN.red }}>↓{formatCurrency(b.excelExpense, sym)}</span>
                                        {b.existingTxs.length > 0 && (
                                            <span> · App: <span style={{ color: TOKEN.muted }}>↓{formatCurrency(b.existingExpense, sym)}</span></span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.55rem', color: TOKEN.muted, paddingLeft: '1.3rem', marginTop: '0.1rem' }}>
                                        {sel.size}/{b.excelRows.length} sel.
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: detail of active month */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activeBlock && (
                            <>
                                {/* Excel rows */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: TOKEN.green, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            Filas del Excel ({activeBlock.excelRows.length})
                                        </div>
                                        <DiffBadge excelExp={activeBlock.excelExpense} existExp={activeBlock.existingExpense} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {activeBlock.excelRows.map((row, i) => {
                                            const isSel = (selected.get(activeBlock.monthKey) ?? new Set()).has(i);
                                            return (
                                                <label
                                                    key={i}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.65rem', borderRadius: '6px', background: isSel ? 'var(--surface-alt)' : 'var(--surface)', border: `1px solid ${isSel ? 'var(--border)' : 'var(--border-dim)'}`, cursor: isImporting ? 'default' : 'pointer', transition: 'all 0.1s' }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSel}
                                                        onChange={() => !isImporting && toggleRow(activeBlock.monthKey, i)}
                                                        style={{ accentColor: TOKEN.green, flexShrink: 0 }}
                                                    />
                                                    <span style={{ fontSize: '0.6rem', color: TOKEN.muted, flexShrink: 0, minWidth: '54px' }}>{row.date}</span>
                                                    <span style={{ flex: 1, fontSize: '0.68rem', fontWeight: 700, color: TOKEN.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.desc || '—'}</span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, flexShrink: 0, color: row.type === 'expense' ? TOKEN.red : TOKEN.green }}>
                                                        {row.type === 'expense' ? '-' : '+'}{formatCurrency(row.amount, sym)}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Existing txs (reference only) */}
                                {activeBlock.existingTxs.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: TOKEN.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                            Ya en la app ({activeBlock.existingTxs.length}) — referencia
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            {activeBlock.existingTxs.slice(0, 20).map(tx => (
                                                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.65rem', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border-dim)', opacity: 0.7 }}>
                                                    <span style={{ fontSize: '0.6rem', color: TOKEN.muted, flexShrink: 0, minWidth: '54px' }}>{formatDate(tx.date)}</span>
                                                    <span style={{ flex: 1, fontSize: '0.68rem', fontWeight: 700, color: TOKEN.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.desc}</span>
                                                    <span style={{ fontSize: '0.65rem', color: TOKEN.muted, flexShrink: 0 }}>{tx.tag}</span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, flexShrink: 0, color: tx.type === 'expense' ? `${TOKEN.red}aa` : `${TOKEN.green}aa` }}>
                                                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, sym)}
                                                    </span>
                                                </div>
                                            ))}
                                            {activeBlock.existingTxs.length > 20 && (
                                                <div style={{ fontSize: '0.6rem', color: TOKEN.muted, padding: '0.3rem 0.65rem' }}>
                                                    + {activeBlock.existingTxs.length - 20} más...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '0.85rem 1.4rem', borderTop: `1px solid ${TOKEN.border}`, flexShrink: 0 }}>
                    {/* Progress bar */}
                    {isImporting && (
                        <div style={{ marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.63rem', fontWeight: 700, color: TOKEN.green }}>Importando...</span>
                                <span style={{ fontSize: '0.63rem', fontWeight: 800, color: TOKEN.text }}>{importProgress!.done} / {importProgress!.total} filas ({progressPct}%)</span>
                            </div>
                            <div style={{ height: '5px', background: 'var(--surface-alt)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '3px', background: TOKEN.green, width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: TOKEN.muted, fontWeight: 700 }}>
                            {totalSelected} fila{totalSelected !== 1 ? 's' : ''} a importar
                        </span>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button onClick={onCancel} disabled={isImporting} style={{ ...iconBtnStyle(), opacity: isImporting ? 0.4 : 1 }}>Cancelar</button>
                            <button
                                onClick={handleConfirm}
                                disabled={isImporting || totalSelected === 0}
                                style={{ ...iconBtnStyle(), background: totalSelected > 0 && !isImporting ? TOKEN.green : 'var(--border)', color: totalSelected > 0 && !isImporting ? 'var(--primary-text)' : TOKEN.muted, border: `1px solid ${totalSelected > 0 && !isImporting ? TOKEN.green : 'var(--border)'}`, opacity: totalSelected > 0 && !isImporting ? 1 : 0.5, cursor: totalSelected > 0 && !isImporting ? 'pointer' : 'default' }}
                            >
                                {isImporting ? `Importando... ${progressPct}%` : `Importar ${totalSelected} filas →`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
    transactions, onTransactionClick, userId, onTransactionsUpdated, globalCurrency, monthlyGoal, availableCategories,
}: MovementsTabProps) => {
    const isMobile = useIsMobile();
    const { t } = useLanguage();
    const {
        filters, patch, setPage,
        allCategories, years, filteredTxs, paginated, totalPages,
        sym, fileInputRef, sidebar,
        handleExport, handleImport, handleDeleteAll,
        importDraft, setImportDraft, handleConfirmMapping,
        importReview, setImportReview,
        handleConfirmReview, importProgress,
    } = useMovementsLogic(transactions, userId, globalCurrency, monthlyGoal, onTransactionsUpdated);

    const { showFilters, search, filterMonth, filterYear, filterCategory, filterType, currentPage } = filters;
    const TYPE_LABELS: Record<string, string> = { all: t('movements.filter_all'), expense: `↓ ${t('movements.expenses')}`, income: `↑ ${t('movements.income')}` };

    return (
        <div data-color-zone="tx-rows" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

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

                    <button onClick={() => fileInputRef.current?.click()} style={{ ...iconBtnStyle(), background: 'var(--surface-alt)', border: `1px solid ${TOKEN.green}`, color: TOKEN.green }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {!isMobile && t('movements.import_excel')}
                    </button>

                    <button onClick={handleDeleteAll} style={{ ...iconBtnStyle(), background: 'var(--surface-alt)', border: `1px solid ${TOKEN.red}`, color: TOKEN.red }} title="Borrar TODOS los movimientos">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                        {!isMobile && "Borrar todo"}
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
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', borderTop: '1px solid var(--border-dim)' }}>
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

            {/* Column mapping modal — step 1 */}
            {importDraft && (
                <ColumnMapModal
                    headers={importDraft.headers}
                    onConfirm={handleConfirmMapping}
                    onCancel={() => setImportDraft(null)}
                    importProgress={null}
                />
            )}

            {/* Import review modal — step 2 */}
            {importReview && (
                <ImportReviewModal
                    blocks={importReview}
                    sym={sym}
                    onConfirm={handleConfirmReview}
                    onCancel={() => !importProgress && setImportReview(null)}
                    importProgress={importProgress}
                />
            )}
        </div>
    );
};
