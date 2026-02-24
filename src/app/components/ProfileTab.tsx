import React, { useState, useMemo } from 'react';
import './ProfileTab.css';
import { Transaction, Category } from "../../types";

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
    const [name, setName] = useState(userName);
    const [viewMode, setViewMode] = useState<'menu' | 'categories' | 'notifications' | 'goal'>('menu');
    const [editingCategory, setEditingCategory] = useState<{ oldTag: string; newTag: string; newIcon: string } | null>(null);
    const [newGoal, setNewGoal] = useState(monthlyGoal.toString());

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
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const currentMonthExpense = useMemo(() => {
        return transactions
            .filter(t => {
                const parts = t.date.split(t.date.includes('/') ? '/' : '-');
                let dMonth, dYear;
                if (t.date === 'Hoy') { dMonth = curMonth; dYear = curYear; }
                else if (t.date === 'Ayer') { const d = new Date(); d.setDate(now.getDate() - 1); dMonth = d.getMonth(); dYear = d.getFullYear(); }
                else if (parts.length >= 2) {
                    if (parts[0].length === 4) { dYear = Number(parts[0]); dMonth = Number(parts[1]) - 1; }
                    else { dYear = Number(parts[2]) || curYear; dMonth = Number(parts[1]) - 1; }
                } else { return false; }
                return dMonth === curMonth && dYear === curYear && t.type === 'expense' && !t.excludeFromBudget && t.goalType !== 'mensual' && t.goalType !== 'periodo';
            })
            .reduce((acc, t) => acc + t.amount, 0);
    }, [transactions, curMonth, curYear]);
    const goalPct = monthlyGoal > 0 ? Math.min(Math.round((currentMonthExpense / monthlyGoal) * 100), 100) : 0;
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, oldTag: editingCategory.oldTag, newTag: editingCategory.newTag, newIcon: editingCategory.newIcon })
            });
            if (res.ok) { onCategoryChangeInfo(); onUpdate(); setEditingCategory(null); }
            else alert("Error guardando categoría");
        } catch (e) { console.error(e); }
    };

    const deleteCategory = async (tag: string) => {
        if (!confirm(`¿Borrar la categoría "${tag}"? Sus gastos pasarán a ser "OTROS".`)) return;
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
            const res = await fetch(`/api/categories?userId=${userId}&oldTag=${encodeURIComponent(tag)}`, { method: 'DELETE' });
            if (res.ok) { onCategoryChangeInfo(); onUpdate(); if (editingCategory?.oldTag === tag) setEditingCategory(null); }
        } catch (e) { console.error(e); }
    };

    const saveGoal = async () => {
        try {
            const res = await fetch('/api/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, monthlyGoal: parseFloat(newGoal) })
            });
            if (res.ok) { onUpdate(); setViewMode('menu'); }
            else alert("Error guardando meta");
        } catch (e) { console.error(e); }
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="profile-root">

            {/* Top bar */}
            <div className="profile-topbar">
                <h1 className="profile-title">Perfil</h1>
                {viewMode !== 'menu' && (
                    <button className="profile-back-btn" onClick={() => setViewMode('menu')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        Volver
                    </button>
                )}
            </div>

            {/* ── MENU VIEW ── */}
            {viewMode === 'menu' && (
                <>
                    <div className="profile-grid">

                        {/* Identity card */}
                        <div className="profile-card profile-card--identity">
                            <div className="profile-card-label">
                                <span>Identidad Premium</span>
                                <span className="profile-card-label-badge">Activo</span>
                            </div>
                            <div className="profile-avatar-row">
                                <div className="profile-avatar-initials">{initials}</div>
                            </div>
                            <input
                                className="profile-name-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onBlur={() => localStorage.setItem("financeUserName", name)}
                            />
                            <div className="profile-devices-row">
                                {[0, 1, 2].map(i => (
                                    <div className="profile-device-dot" key={i}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="17" r="1" />
                                        </svg>
                                    </div>
                                ))}
                                <span className="profile-devices-label">3 Dispositivos vinculados</span>
                            </div>
                        </div>

                        {/* Goal card */}
                        <div className="profile-card profile-card--goal" onClick={() => setViewMode('goal')} style={{ cursor: 'pointer' }}>
                            <div className="profile-card-label">
                                <span>Meta de Gastos</span>
                                <span className="profile-goal-consumed">{goalPct}% consumido</span>
                            </div>
                            <div className="profile-goal-amount">
                                <span>{sym}</span>
                                {currentMonthExpense.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                <span className="profile-goal-limit">/ {sym}{monthlyGoal.toLocaleString()}</span>
                            </div>
                            <div className="profile-goal-days">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                                Faltan {daysLeft} días para el cierre
                            </div>
                        </div>

                        {/* Currency card */}
                        <div className="profile-card">
                            <div className="profile-card-label">Divisa</div>
                            <svg className="profile-card-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                            </svg>
                            <select
                                className="profile-currency-select"
                                value={globalCurrency}
                                onChange={e => onCurrencyChange(e.target.value as any)}
                            >
                                <option value="ILS">ILS (Shekels)</option>
                                <option value="USD">USD (Dólares)</option>
                                <option value="EUR">EUR (Euros)</option>
                                <option value="ARS">ARS (Pesos)</option>
                            </select>
                            <span className="profile-card-sub">↺ Símbolo moneda</span>
                        </div>

                        {/* Theme card */}
                        <div className="profile-card" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
                            <div className="profile-card-label">Tema</div>
                            <button
                                className={`profile-toggle ${theme === 'dark' ? 'profile-toggle--on' : 'profile-toggle--off'}`}
                                onClick={e => { e.stopPropagation(); toggleTheme(); }}
                            >
                                <span className="profile-toggle-thumb" />
                            </button>
                            <div className="profile-card-value">{theme === 'dark' ? 'Activado' : 'Desactivado'}</div>
                            <span className="profile-card-sub">Organic Dark</span>
                        </div>

                    </div>

                    {/* Banking integration row */}
                    <div className="profile-row-item" onClick={() => setViewMode('notifications')}>
                        <div className="profile-row-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.6" />
                            </svg>
                        </div>
                        <div className="profile-row-content">
                            <div className="profile-row-sublabel">Integración Bancaria</div>
                            <div className="profile-row-value">Vinculado</div>
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
                            <div className="profile-row-sublabel">Categorías</div>
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

                    {/* Logout */}
                    <button className="profile-logout" onClick={onLogout}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Cerrar Sesión
                    </button>
                </>
            )}

            {/* ── CATEGORIES VIEW ── */}
            {viewMode === 'categories' && (
                <div>
                    <div className="profile-subview-label">Gestión de tus etiquetas</div>

                    {!editingCategory ? (
                        <div className="profile-cat-list">
                            {uniqueCategories.map(cat => (
                                <div key={cat.tag} className="profile-cat-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div className="profile-cat-icon-box">{cat.icon || '🏷️'}</div>
                                        <div>
                                            <div className="profile-cat-name">{cat.tag}</div>
                                            <div className="profile-cat-count">{cat.count} movimientos</div>
                                        </div>
                                    </div>
                                    <div className="profile-cat-actions">
                                        <button
                                            className="profile-cat-btn-edit"
                                            onClick={() => setEditingCategory({ oldTag: cat.tag, newTag: cat.tag, newIcon: cat.icon || '🏷️' })}
                                        >
                                            Editar
                                        </button>
                                        <button className="profile-cat-btn-del" onClick={() => deleteCategory(cat.tag)}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="profile-cat-edit-form">
                            <div>
                                <span className="profile-edit-field-label">Nuevo Emoji</span>
                                <input
                                    className="profile-edit-emoji-input"
                                    value={editingCategory.newIcon}
                                    onChange={e => setEditingCategory({ ...editingCategory, newIcon: e.target.value })}
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <span className="profile-edit-field-label">Nuevo Nombre</span>
                                <input
                                    className="profile-edit-text-input"
                                    value={editingCategory.newTag}
                                    onChange={e => setEditingCategory({ ...editingCategory, newTag: e.target.value })}
                                />
                            </div>
                            <div className="profile-edit-actions">
                                <button className="profile-edit-cancel" onClick={() => setEditingCategory(null)}>Cancelar</button>
                                <button className="profile-edit-save" onClick={saveCategoryEdit}>Aplicar a todos</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── NOTIFICATIONS VIEW ── */}
            {viewMode === 'notifications' && (
                <div>
                    <div className="profile-subview-label">Auto-Sincronización</div>

                    <div className="profile-notif-card">
                        <p className="profile-notif-desc">
                            Permite leer las notificaciones bancarias entrantes (Mercado Pago, Ualá, Google Wallet, Brubank, etc.) para registrar gastos automáticamente.
                        </p>
                        <div className="profile-notif-toggle-row">
                            <span className="profile-notif-toggle-label">Escuchar Bancos y Billeteras</span>
                            <button
                                className={`profile-toggle ${theme === 'dark' ? 'profile-toggle--on' : 'profile-toggle--off'}`}
                                onClick={toggleTheme}
                            >
                                <span className="profile-toggle-thumb" />
                            </button>
                        </div>
                        <div className="profile-notif-toggle-row" style={{ opacity: 0.5 }}>
                            <span className="profile-notif-toggle-label">Añadir automático sin preguntar</span>
                            <div className="profile-toggle profile-toggle--off">
                                <span className="profile-toggle-thumb" />
                            </div>
                        </div>
                    </div>

                    <div className="profile-notif-beta">Módulo en desarrollo (Beta API)</div>
                </div>
            )}

            {/* ── GOAL VIEW ── */}
            {viewMode === 'goal' && (
                <div>
                    <div className="profile-subview-label">Configurar Meta Mensual</div>

                    <div className="profile-goal-form">
                        <div>
                            <span className="profile-edit-field-label">Monto máximo de gasto ({sym})</span>
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
                            Esta meta se utilizará para calcular tus indicadores de salud financiera y alertas de consumo en las gráficas de métricas.
                        </p>
                        <div className="profile-goal-actions">
                            <button className="profile-goal-cancel" onClick={() => setViewMode('menu')}>Cancelar</button>
                            <button className="profile-goal-save" onClick={saveGoal}>Guardar Meta</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
