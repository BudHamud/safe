import React, { useState, useEffect } from 'react';
import './NewOrderModal.css';
import { Transaction, Category } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { useLanguage } from '../../context/LanguageContext';

type NewOrderModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tx: Transaction) => void;
    availableCategories: Category[];
    initialData?: Partial<Transaction> | null;
    globalCurrency: string;
};

export const NewOrderModal = ({ isOpen, onClose, onSave, availableCategories, initialData, globalCurrency }: NewOrderModalProps) => {
    const { setCatSignal, userId } = useAppContext();
    const { lang, t } = useLanguage();
    const [transactionType, setTransactionType] = useState('expense');
    const [goalType, setGoalType] = useState<'unico' | 'mensual' | 'periodo' | 'meta'>('unico');
    const getDefaultDate = () => new Date().toISOString().split('T')[0];
    const buildEmptyFormData = (currency: string) => ({
        amount: '',
        currency,
        desc: '',
        details: '',
        tag: '',
        customTag: '',
        customIcon: '💳',
        date: getDefaultDate(),
        excludeFromBudget: false,
        periodicity: '12',
        paymentMethod: '',
        cardDigits: '',
    });
    const [formData, setFormData] = useState({
        ...buildEmptyFormData(globalCurrency || 'ILS'),
    });

    // Track if we already hydrated this modal session to avoid resets while typing
    const [lastOpened, setLastOpened] = useState(false);

    useEffect(() => {
        if (isOpen && !lastOpened) {
            if (initialData) {
                const initialCurrency = ((initialData as any).currency || globalCurrency || 'ILS') as string;
                setFormData({
                    amount: initialData.amount ? initialData.amount.toString() : '',
                    currency: initialCurrency,
                    desc: initialData.desc || '',
                    details: initialData.details || '',
                    tag: initialData.tag || '',
                    customTag: '',
                    customIcon: initialData.icon || '💳',
                    date: getDefaultDate(),
                    excludeFromBudget: initialData.excludeFromBudget || false,
                    periodicity: initialData.periodicity?.toString() || '12',
                    paymentMethod: initialData.paymentMethod || '',
                    cardDigits: initialData.cardDigits || ''
                });
                if (initialData.type) setTransactionType(initialData.type);
                if (initialData.goalType) setGoalType(initialData.goalType as 'unico' | 'mensual' | 'periodo' | 'meta');
            } else {
                setFormData(buildEmptyFormData(globalCurrency || 'ILS'));
                setTransactionType('expense');
                setGoalType('unico');
            }
            setLastOpened(true);
        } else if (!isOpen) {
            setLastOpened(false);
        }
    }, [initialData, isOpen, globalCurrency, lastOpened]);
    const [analyzingImage, setAnalyzingImage] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [catSearch, setCatSearch] = useState<string | null>(null);
    const [ticketPreview, setTicketPreview] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<{ confidence: number; desc: string; remaining: number | null } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [scanLimitReached, setScanLimitReached] = useState(false);
    const isEditing = !!initialData;
    const numberLocale = lang === 'en' ? 'en-US' : 'es-AR';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const processImageFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setAnalyzingImage(true);
        setScanResult(null);

        // Show preview
        const reader = new FileReader();
        reader.onload = (ev) => setTicketPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        // Convert to base64 for API
        const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res((r.result as string).split(',')[1]);
            r.onerror = rej;
            r.readAsDataURL(f);
        });

        try {
            const base64 = await toBase64(file);
            const resp = await fetch('/api/scan-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, mimeType: file.type, userId })
            });
            const data = await resp.json();

            if (data.isLimited) {
                setScanLimitReached(true);
                setTicketPreview(null);
                alert(`${data.error}`);
            } else if (data.error) {
                alert(`${t('order.scan_read_error_prefix')}: ${data.error}`);
            } else {
                setFormData(prev => ({
                    ...prev,
                    amount: data.amount?.toString() ?? prev.amount,
                    currency: data.currency ?? prev.currency,
                    desc: data.desc ?? prev.desc,
                    tag: data.tag ?? prev.tag,
                    date: data.date ?? prev.date,
                    details: data.details ?? prev.details,
                }));
                setScanResult({ confidence: data.confidence, desc: data.desc, remaining: data.remaining });
                setScanLimitReached(false);
            }
        } catch (err) {
            console.error('scan-ticket error', err);
            alert(t('order.scan_error'));
        } finally {
            setAnalyzingImage(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) processImageFile(e.target.files[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processImageFile(file);
    };

    const handleSubmit = async () => {
        if (!formData.amount) { alert(t('order.amount_required')); return; }
        setIsProcessing(true);

        let amountUSD = 0, amountARS = 0, amountILS = 0, amountEUR = 0;
        let amountInput = parseFloat(formData.amount);
        let additionalDetails = formData.details || '';

        try {
            const resGlobal = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const dataRates = await resGlobal.json().then((r: any) => r.rates);
            const resARS = await fetch('https://dolarapi.com/v1/dolares/blue');
            const dataARS = await resARS.json();
            const arsRate = dataARS.venta;

            if (formData.currency === 'USD') amountUSD = amountInput;
            else if (formData.currency === 'ILS') amountUSD = amountInput / dataRates.ILS;
            else if (formData.currency === 'EUR') amountUSD = amountInput / dataRates.EUR;
            else if (formData.currency === 'ARS') amountUSD = amountInput / arsRate;

            amountILS = amountUSD * dataRates.ILS;
            amountEUR = amountUSD * dataRates.EUR;
            amountARS = amountUSD * arsRate;

            if (formData.currency !== 'ILS') {
                const note = t('order.originally_loaded_as', {
                    currency: formData.currency,
                    amount: amountInput.toLocaleString(numberLocale, { maximumFractionDigits: 2 })
                } as any);
                additionalDetails = additionalDetails ? `${additionalDetails}\n\n*${note}*` : `*${note}*`;
            }
        } catch (error) {
            console.error("Error fetching rates", error);
            alert(t('order.exchange_rate_error'));
            setIsProcessing(false);
            return;
        }

        let finalTagLabel = formData.tag;
        let finalIcon = '💳';

        if (formData.tag === 'custom') {
            if (!formData.customTag) { alert(t('order.custom_category_name_required')); setIsProcessing(false); return; }
            finalTagLabel = formData.customTag.trim();
            finalIcon = formData.customIcon;
            const newCat: Category = { id: formData.customTag.toLowerCase().replace(/\s+/g, '-'), label: finalTagLabel, icon: finalIcon };
            const existingStr = localStorage.getItem('financeCustomCategories');
            let existing: Category[] = existingStr ? JSON.parse(existingStr) : [];
            existing.push(newCat);
            localStorage.setItem('financeCustomCategories', JSON.stringify(existing));
            setCatSignal(prev => prev + 1);
        } else {
            const normalize = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const target = normalize(formData.tag);
            const selectedCat = availableCategories.find(c => normalize(c.label) === target);

            if (!selectedCat) {
                alert(t('order.select_category_required'));
                setIsProcessing(false);
                return;
            }
            finalTagLabel = selectedCat.label;
            finalIcon = selectedCat.icon;
        }

        const newTx: Transaction = {
            id: Date.now().toString(),
            desc: formData.desc || t('order.untitled'),
            amount: amountILS,
            amountUSD, amountARS, amountILS, amountEUR,
            tag: finalTagLabel,
            type: transactionType,
            date: formData.date,
            icon: finalIcon,
            details: additionalDetails,
            excludeFromBudget: goalType === 'meta' ? false : formData.excludeFromBudget,
            goalType,
            isCancelled: false,
            periodicity: goalType === 'periodo' ? parseInt(formData.periodicity) : undefined,
            paymentMethod: formData.paymentMethod || undefined,
            cardDigits: formData.cardDigits || undefined
        };

        onSave(newTx);
        setFormData(buildEmptyFormData(globalCurrency || 'ILS'));
        setTransactionType('expense');
        setGoalType('unico');
        setIsProcessing(false);
    };

    if (!isOpen) return null;

    return (
        <div className="order-modal-overlay" onClick={onClose}>
            <div className="order-modal-box" data-color-zone="modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="order-modal-header">
                    <span className="order-modal-title">{isEditing ? t('order.edit_title') : t('order.new_title')}</span>
                    <button className="order-modal-close" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="order-modal-body">

                    {/* Egreso / Ingreso */}
                    <div className="order-modal-toggle-group">
                        <button
                            className={`order-modal-toggle-btn ${transactionType === 'expense' ? 'active expense' : ''}`}
                            onClick={() => setTransactionType('expense')}
                        >
                            {t('order.type_expense')}
                        </button>
                        <button
                            className={`order-modal-toggle-btn ${transactionType === 'income' ? 'active income' : ''}`}
                            onClick={() => setTransactionType('income')}
                        >
                            {t('order.type_income')}
                        </button>
                    </div>

                    {/* Recurrence Types: UNICO / MENSUAL / PERIODO */}
                    <div className="order-modal-goal-group">
                        <button
                            className={`order-modal-goal-btn ${goalType === 'unico' ? 'active' : ''}`}
                            onClick={() => setGoalType('unico')}
                        >
                            {t('order.goal_single')}
                        </button>
                        <button
                            className={`order-modal-goal-btn ${goalType === 'mensual' ? 'active' : ''}`}
                            onClick={() => setGoalType('mensual')}
                        >
                            {t('order.goal_monthly')}
                        </button>
                        <button
                            className={`order-modal-goal-btn ${goalType === 'periodo' ? 'active' : ''}`}
                            onClick={() => setGoalType('periodo')}
                        >
                            {t('order.goal_period')}
                        </button>
                    </div>

                    {goalType === 'periodo' && (
                        <div>
                            <span className="order-modal-label">{t('order.period_frequency')}</span>
                            <select
                                className="order-modal-input"
                                name="periodicity"
                                value={formData.periodicity}
                                onChange={handleInputChange}
                            >
                                <option value="3">{t('order.periodicity_quarterly')}</option>
                                <option value="6">{t('order.periodicity_biannual')}</option>
                                <option value="12">{t('order.periodicity_annual')}</option>
                                <option value="24">{t('order.periodicity_two_years')}</option>
                            </select>
                        </div>
                    )}

                    {/* Ticket Scanner ─ drag & drop zone */}
                    {scanLimitReached ? (
                        <div style={{
                            marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px',
                            border: '1.5px dashed var(--accent)', background: 'var(--bg)',
                            display: 'flex', alignItems: 'center', gap: '0.65rem'
                        }}>
                            <span style={{ fontSize: '1rem' }}>🚫</span>
                            <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.05em' }}>{t('order.daily_limit_reached')}</div>
                                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{t('order.daily_limit_help')}</div>
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{ marginBottom: '1rem' }}
                            onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
                            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                        >
                            <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} id="ticket-upload" style={{ display: 'none' }} />
                            <label
                                htmlFor="ticket-upload"
                                style={{
                                    display: 'flex',
                                    flexDirection: ticketPreview ? 'row' : 'column',
                                    alignItems: 'center',
                                    justifyContent: ticketPreview ? 'flex-start' : 'center',
                                    gap: '0.75rem',
                                    width: '100%',
                                    padding: ticketPreview ? '0.6rem 0.85rem' : '1rem',
                                    borderRadius: '8px',
                                    border: `1.5px dashed ${dragActive || analyzingImage ? 'var(--primary)' : 'var(--border)'}`,
                                    background: dragActive || analyzingImage ? 'var(--surface-alt)' : 'var(--bg)',
                                    cursor: analyzingImage ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    minHeight: ticketPreview ? 'auto' : '70px',
                                }}
                            >
                                {analyzingImage ? (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                                        </svg>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.06em' }}>{t('order.scanning_ticket')}</span>
                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{t('order.scanning_ticket_help')}</span>
                                        </div>
                                    </>
                                ) : ticketPreview ? (
                                    <>
                                        {/* Thumbnail */}
                                        <img src={ticketPreview} alt="ticket" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0, border: '1px solid var(--border)' }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {scanResult ? (
                                                <>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em' }}>{t('order.ticket_scanned')}</div>
                                                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {scanResult.desc} · {scanResult.confidence}% {t('order.confidence')}
                                                    </div>
                                                    {/* Confidence bar */}
                                                    <div style={{ marginTop: '0.3rem', height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                                                        <div style={{ width: `${scanResult.confidence}%`, height: '100%', background: scanResult.confidence > 75 ? 'var(--primary)' : 'var(--accent)', transition: 'width 0.5s ease', borderRadius: '2px' }} />
                                                    </div>
                                                    {scanResult.remaining !== null && (
                                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                            {t('order.remaining_scans_today', { count: scanResult.remaining } as any)}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t('order.change_image')}</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={e => { e.preventDefault(); setTicketPreview(null); setScanResult(null); }}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}
                                        >
                                            ✕
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <polyline points="3 9 9 9 9 3" />
                                            <polyline points="21 9 15 9 15 3" />
                                            <polyline points="21 15 15 15 15 21" />
                                            <polyline points="3 15 9 15 9 21" />
                                        </svg>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{t('order.scan_ticket_invoice')}</span>
                                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{t('order.scan_ticket_invoice_help')}</span>
                                        </div>
                                    </>
                                )}
                            </label>
                        </div>
                    )}

                    {/* Volumen Operativo */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                            <span className="order-modal-label">{t('order.amount_label')}</span>
                        </div>
                        <div className="order-modal-amount-group">
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <select
                                    className="order-modal-currency-select"
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                >
                                    <option value="USD">USD</option>
                                    <option value="ARS">ARS</option>
                                    <option value="ILS">ILS</option>
                                    <option value="EUR">EUR</option>
                                </select>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="3" style={{ position: 'absolute', right: '0.4rem', pointerEvents: 'none' }}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                            <input
                                className="order-modal-amount-input"
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Título */}
                    <div>
                        <label className="order-modal-label">{t('order.title_label')}</label>
                        <input className="order-modal-input" type="text" name="desc" value={formData.desc} onChange={handleInputChange} placeholder={t('order.title_placeholder')} />
                    </div>

                    {/* Medio de Pago */}
                    <div>
                        <label className="order-modal-label">{t('order.payment_method_optional')}</label>
                        <div className="order-modal-methods-group">
                            <button
                                className={`order-modal-method-btn ${formData.paymentMethod === 'billete' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, paymentMethod: formData.paymentMethod === 'billete' ? '' : 'billete', cardDigits: '' })}
                            >
                                💵 {t('order.payment_cash')}
                            </button>
                            <button
                                className={`order-modal-method-btn ${formData.paymentMethod === 'tarjeta' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, paymentMethod: formData.paymentMethod === 'tarjeta' ? '' : 'tarjeta' })}
                            >
                                💳 {t('order.payment_card')}
                            </button>
                        </div>

                        {formData.paymentMethod === 'tarjeta' && (
                            <div style={{ marginTop: '0.6rem' }}>
                                <div className="card-digits-wrapper">
                                    <div className="card-digits-mask">
                                        <span>••••</span>
                                        <span>••••</span>
                                        <span>••••</span>
                                    </div>
                                    <input
                                        className="card-digits-input"
                                        type="text"
                                        name="cardDigits"
                                        value={formData.cardDigits}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            setFormData({ ...formData, cardDigits: val });
                                        }}
                                        placeholder="0000"
                                        maxLength={4}
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="order-modal-label">{t('order.description_optional')}</label>
                        <textarea className="order-modal-input" name="details" value={formData.details} onChange={handleInputChange} placeholder={t('order.description_placeholder')} rows={3} style={{ resize: 'vertical', minHeight: '70px', lineHeight: 1.55 }} />
                    </div>

                    {/* Excluir de la meta */}
                    {transactionType === 'expense' && goalType !== 'meta' && (
                        <label className="order-modal-checkbox-row">
                            <input
                                className="order-modal-checkbox"
                                type="checkbox"
                                name="excludeFromBudget"
                                checked={formData.excludeFromBudget}
                                onChange={e => setFormData({ ...formData, excludeFromBudget: e.target.checked })}
                            />
                            <span className="order-modal-checkbox-label">
                                {t('order.exclude_from_goal')}
                            </span>
                        </label>
                    )}



                    {/* Clasificación */}
                    <div className="order-modal-cat-wrap">
                        <label className="order-modal-label">{t('order.category_label')}</label>
                        <div className="order-modal-cat-dropdown">
                            {/* Trigger button — shows selected or placeholder */}
                            <button
                                type="button"
                                className="order-modal-cat-trigger order-modal-input"
                                onClick={() => setCatSearch(prev => prev === null ? '' : null)}
                            >
                                <span>
                                    {formData.tag === 'custom'
                                        ? `＋ ${t('order.new_category')}`
                                        : formData.tag
                                            ? (() => {
                                                const normalize = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                const target = normalize(formData.tag);
                                                const found = availableCategories.find(c => normalize(c.label) === target);
                                                return found ? `${found.icon} ${found.label}` : formData.tag;
                                            })()
                                            : t('order.select_placeholder')}
                                </span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {/* Dropdown panel */}
                            {catSearch !== null && (
                                <div className="order-modal-cat-panel">
                                    <input
                                        className="order-modal-cat-panel-search"
                                        type="text"
                                        placeholder={t('movements.search')}
                                        value={catSearch}
                                        onChange={e => setCatSearch(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="order-modal-cat-panel-list">
                                        {availableCategories
                                            .filter(c => c.label.toLowerCase().includes(catSearch.toLowerCase()))
                                            .map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    className={`order-modal-cat-option ${formData.tag === c.label ? 'active' : ''}`}
                                                    onClick={() => { setFormData({ ...formData, tag: c.label, customTag: '', customIcon: '💳' }); setCatSearch(null); }}
                                                >
                                                    <span>{c.icon}</span>
                                                    <span>{c.label}</span>
                                                </button>
                                            ))
                                        }
                                        <button
                                            type="button"
                                            className={`order-modal-cat-option order-modal-cat-option--new ${formData.tag === 'custom' ? 'active' : ''}`}
                                            onClick={() => { setFormData({ ...formData, tag: 'custom' }); setCatSearch(null); }}
                                        >
                                            <span>＋</span>
                                            <span>{t('order.new_category_ellipsis')}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Nueva Categoría UI - Moved here */}
                        {formData.tag === 'custom' && (
                            <div style={{ marginTop: '1rem', border: '1px dashed var(--border-dim)', borderRadius: '8px', padding: '1rem', background: 'var(--surface-alt)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <span className="order-modal-label" style={{ color: 'var(--primary)', marginBottom: 0 }}>{t('order.configure_new_category')}</span>
                                <input className="order-modal-input" type="text" name="customTag" value={formData.customTag} onChange={handleInputChange} placeholder={t('order.custom_category_name_placeholder')} />
                                <div>
                                    <span className="order-modal-label">{t('order.category_icon')}</span>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            value={['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].includes(formData.customIcon) ? '' : formData.customIcon}
                                            onChange={e => { let v = e.target.value; if (v.length > 2) v = v.slice(-2); setFormData({ ...formData, customIcon: v || '💳' }); }}
                                            placeholder="+"
                                            style={{ width: '36px', height: '36px', textAlign: 'center', fontSize: '1.1rem', padding: 0, outline: 'none', cursor: 'text', fontFamily: 'inherit', borderRadius: '6px', border: (!['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].includes(formData.customIcon) && formData.customIcon) ? '2px solid var(--primary)' : '1px dashed var(--border-dim)', background: (!['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].includes(formData.customIcon) && formData.customIcon) ? 'var(--primary)' : 'transparent', color: (!['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].includes(formData.customIcon) && formData.customIcon) ? 'var(--primary-text)' : 'var(--text-main)' }}
                                        />
                                        {['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].map(ic => (
                                            <div key={ic} onClick={() => setFormData({ ...formData, customIcon: ic })} style={{ width: '36px', height: '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', border: formData.customIcon === ic ? '2px solid var(--primary)' : '1px solid var(--border)', background: formData.customIcon === ic ? 'color-mix(in srgb, var(--primary) 13%, transparent)' : 'var(--surface)', transition: 'all 0.15s' }}>
                                                {ic}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Período */}
                    <div>
                        <label className="order-modal-label">{t('field.date')}</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="order-modal-input"
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                style={{ paddingRight: '2.25rem' }}
                            />
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="order-modal-footer">
                        <button className="order-modal-btn-cancel" onClick={onClose} disabled={isProcessing}>
                            {t('btn.cancel')}
                        </button>
                        <button className="order-modal-btn-submit" onClick={handleSubmit} disabled={isProcessing}>
                            {isProcessing ? t('order.processing') : isEditing ? t('order.save_changes') : t('order.process')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
