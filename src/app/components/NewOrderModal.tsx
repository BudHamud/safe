import React, { useState, useEffect } from 'react';
import './NewOrderModal.css';
import { Transaction, Category } from "../../types";
import { useAppContext } from "../../context/AppContext";

type NewOrderModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tx: Transaction) => void;
    availableCategories: Category[];
    initialData?: Partial<Transaction> | null;
    globalCurrency: string;
};

export const NewOrderModal = ({ isOpen, onClose, onSave, availableCategories, initialData, globalCurrency }: NewOrderModalProps) => {
    const { setCatSignal } = useAppContext();
    const [transactionType, setTransactionType] = useState('expense');
    const [goalType, setGoalType] = useState<'unico' | 'mensual' | 'periodo' | 'meta'>('unico');
    const [formData, setFormData] = useState({
        amount: '',
        currency: 'USD',
        desc: '',
        details: '',
        tag: '',
        customTag: '',
        customIcon: '💳',
        date: new Date().toISOString().split('T')[0],
        excludeFromBudget: false,
        periodicity: '12', // Default to 12 months (annual)
        paymentMethod: '', // Default to empty
        cardDigits: '',
    });

    // Track if we already hydrated this modal session to avoid resets while typing
    const [lastOpened, setLastOpened] = useState(false);

    useEffect(() => {
        if (isOpen && !lastOpened) {
            if (initialData) {
                setFormData({
                    amount: initialData.amount ? initialData.amount.toString() : '',
                    currency: 'ILS', // Since we pass amountILS for 'Pago Rápido'
                    desc: initialData.desc || '',
                    details: initialData.details || '',
                    tag: initialData.tag || '',
                    customTag: '',
                    customIcon: initialData.icon || '💳',
                    date: new Date().toISOString().split('T')[0],
                    excludeFromBudget: initialData.excludeFromBudget || false,
                    periodicity: initialData.periodicity?.toString() || '12',
                    paymentMethod: initialData.paymentMethod || '',
                    cardDigits: initialData.cardDigits || ''
                });
                if (initialData.type) setTransactionType(initialData.type);
                if (initialData.goalType) setGoalType(initialData.goalType as 'unico' | 'mensual' | 'periodo' | 'meta');
            } else {
                setFormData({
                    amount: '',
                    currency: globalCurrency || 'USD',
                    desc: '',
                    details: '',
                    tag: '',
                    customTag: '',
                    customIcon: '💳',
                    date: new Date().toISOString().split('T')[0],
                    excludeFromBudget: false,
                    periodicity: '12',
                    paymentMethod: '',
                    cardDigits: ''
                });
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAnalyzingImage(true);
            setTimeout(() => {
                setFormData(prev => ({ ...prev, amount: '85.50', desc: 'Ticket de supermercado', tag: 'alimentacion' }));
                setAnalyzingImage(false);
            }, 1500);
        }
    };

    const handleSubmit = async () => {
        if (!formData.amount) { alert("El Volumen Operativo (Monto) es obligatorio."); return; }
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
                const note = `(Cargado originalmente como ${formData.currency} ${amountInput.toLocaleString('es-AR', { maximumFractionDigits: 2 })})`;
                additionalDetails = additionalDetails ? `${additionalDetails}\n\n*${note}*` : `*${note}*`;
            }
        } catch (error) {
            console.error("Error fetching rates", error);
            alert("Error al obtener cotizaciones globales. Verifica tu conexión.");
            setIsProcessing(false);
            return;
        }

        let finalTagLabel = formData.tag;
        let finalIcon = '💳';

        if (formData.tag === 'custom') {
            if (!formData.customTag) { alert("Proporciona un nombre para la nueva clasificación."); setIsProcessing(false); return; }
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
                alert("Por favor selecciona una clasificación.");
                setIsProcessing(false);
                return;
            }
            finalTagLabel = selectedCat.label;
            finalIcon = selectedCat.icon;
            if (transactionType === 'income') { finalIcon = '💼'; finalTagLabel = 'Ingreso de Capital'; }
        }

        const newTx: Transaction = {
            id: Date.now().toString(),
            desc: formData.desc || 'Sin título',
            amount: amountILS,
            amountUSD, amountARS, amountILS, amountEUR,
            tag: finalTagLabel,
            type: transactionType,
            date: formData.date === new Date().toISOString().split('T')[0] ? "Hoy" : formData.date,
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
        setFormData({ amount: "", currency: "USD", desc: "", details: "", tag: "", customTag: "", customIcon: "💳", date: new Date().toISOString().split('T')[0], excludeFromBudget: false, periodicity: '12', paymentMethod: '', cardDigits: '' });
        setTransactionType('expense');
        setGoalType('unico');
        setIsProcessing(false);
    };

    if (!isOpen) return null;

    return (
        <div className="order-modal-overlay" onClick={onClose}>
            <div className="order-modal-box" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="order-modal-header">
                    <span className="order-modal-title">Nueva Orden</span>
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
                            EGRESO
                        </button>
                        <button
                            className={`order-modal-toggle-btn ${transactionType === 'income' ? 'active income' : ''}`}
                            onClick={() => setTransactionType('income')}
                        >
                            INGRESO
                        </button>
                    </div>

                    {/* Recurrence Types: UNICO / MENSUAL / PERIODO */}
                    <div className="order-modal-goal-group">
                        <button
                            className={`order-modal-goal-btn ${goalType === 'unico' ? 'active' : ''}`}
                            onClick={() => setGoalType('unico')}
                        >
                            ÚNICO
                        </button>
                        <button
                            className={`order-modal-goal-btn ${goalType === 'mensual' ? 'active' : ''}`}
                            onClick={() => setGoalType('mensual')}
                        >
                            MENSUAL
                        </button>
                        <button
                            className={`order-modal-goal-btn ${goalType === 'periodo' ? 'active' : ''}`}
                            onClick={() => setGoalType('periodo')}
                        >
                            PERIODO
                        </button>
                    </div>

                    {goalType === 'periodo' && (
                        <div>
                            <span className="order-modal-label">Frecuencia del Periodo</span>
                            <select
                                className="order-modal-input"
                                name="periodicity"
                                value={formData.periodicity}
                                onChange={handleInputChange}
                            >
                                <option value="3">Trimestral (3 meses)</option>
                                <option value="6">Semestral (6 meses)</option>
                                <option value="12">Anual (12 meses)</option>
                                <option value="24">Bianual (24 meses)</option>
                            </select>
                        </div>
                    )}

                    {/* Volumen Operativo */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                            <span className="order-modal-label">Volumen Operativo *</span>
                            <div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} id="ticket-upload" style={{ display: 'none' }} />
                                <label htmlFor="ticket-upload" className="order-modal-ticket-btn">
                                    {analyzingImage ? "Analizando..." : "Ticket / Factura"}
                                </label>
                            </div>
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
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#737670" strokeWidth="3" style={{ position: 'absolute', right: '0.4rem', pointerEvents: 'none' }}>
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
                        <label className="order-modal-label">Título *</label>
                        <input className="order-modal-input" type="text" name="desc" value={formData.desc} onChange={handleInputChange} placeholder="Ej. Súper, Cripto" />
                    </div>

                    {/* Medio de Pago */}
                    <div>
                        <label className="order-modal-label">Medio de Pago (Opcional)</label>
                        <div className="order-modal-methods-group">
                            <button
                                className={`order-modal-method-btn ${formData.paymentMethod === 'billete' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, paymentMethod: formData.paymentMethod === 'billete' ? '' : 'billete', cardDigits: '' })}
                            >
                                💵 EFECTIVO
                            </button>
                            <button
                                className={`order-modal-method-btn ${formData.paymentMethod === 'tarjeta' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, paymentMethod: formData.paymentMethod === 'tarjeta' ? '' : 'tarjeta' })}
                            >
                                💳 TARJETA
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
                        <label className="order-modal-label">Descripción (Opcional)</label>
                        <textarea className="order-modal-input" name="details" value={formData.details} onChange={handleInputChange} placeholder="Notas o detalles..." rows={3} style={{ resize: 'vertical', minHeight: '70px', lineHeight: 1.55 }} />
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
                                Excluir de la meta (gasto fijo)
                            </span>
                        </label>
                    )}



                    {/* Clasificación */}
                    <div className="order-modal-cat-wrap">
                        <label className="order-modal-label">Clasificación *</label>
                        <div className="order-modal-cat-dropdown">
                            {/* Trigger button — shows selected or placeholder */}
                            <button
                                type="button"
                                className="order-modal-cat-trigger order-modal-input"
                                onClick={() => setCatSearch(prev => prev === null ? '' : null)}
                            >
                                <span>
                                    {formData.tag === 'custom'
                                        ? '＋ Nueva categoría'
                                        : formData.tag
                                            ? (() => {
                                                const normalize = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                const target = normalize(formData.tag);
                                                const found = availableCategories.find(c => normalize(c.label) === target);
                                                return found ? `${found.icon} ${found.label}` : formData.tag;
                                            })()
                                            : 'Seleccionar...'}
                                </span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#737670" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {/* Dropdown panel */}
                            {catSearch !== null && (
                                <div className="order-modal-cat-panel">
                                    <input
                                        className="order-modal-cat-panel-search"
                                        type="text"
                                        placeholder="Buscar..."
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
                                            <span>Nueva categoría...</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Nueva Categoría UI - Moved here */}
                        {formData.tag === 'custom' && (
                            <div style={{ marginTop: '1rem', border: '1px dashed #373a37', borderRadius: '8px', padding: '1rem', background: '#232623', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <span className="order-modal-label" style={{ color: '#5c7152', marginBottom: 0 }}>Configurar Nueva Categoría</span>
                                <input className="order-modal-input" type="text" name="customTag" value={formData.customTag} onChange={handleInputChange} placeholder="Nombre (Ej. Mascotas, Cripto)" />
                                <div>
                                    <span className="order-modal-label">Ícono de Categoría</span>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            value={['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].includes(formData.customIcon) ? '' : formData.customIcon}
                                            onChange={e => { let v = e.target.value; if (v.length > 2) v = v.slice(-2); setFormData({ ...formData, customIcon: v || '💳' }); }}
                                            placeholder="+"
                                            style={{ width: '36px', height: '36px', textAlign: 'center', fontSize: '1.1rem', padding: 0, outline: 'none', cursor: 'text', fontFamily: 'inherit', borderRadius: '6px', border: (!['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].includes(formData.customIcon) && formData.customIcon) ? '2px solid #5c7152' : '1px dashed #373a37', background: (!['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].includes(formData.customIcon) && formData.customIcon) ? '#5c7152' : 'transparent', color: (!['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].includes(formData.customIcon) && formData.customIcon) ? '#fff' : '#e0ddd4' }}
                                        />
                                        {['💳', '🍔', '🚌', '💡', '🎉', '🛒', '🏥', '🏋️', '✈️', '🐶'].map(ic => (
                                            <div key={ic} onClick={() => setFormData({ ...formData, customIcon: ic })} style={{ width: '36px', height: '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', border: formData.customIcon === ic ? '2px solid #5c7152' : '1px solid #2b2e2b', background: formData.customIcon === ic ? '#5c715222' : '#1d201d', transition: 'all 0.15s' }}>
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
                        <label className="order-modal-label">Período</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="order-modal-input"
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                style={{ paddingRight: '2.25rem' }}
                            />
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737670" strokeWidth="2" style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="order-modal-footer">
                        <button className="order-modal-btn-cancel" onClick={onClose} disabled={isProcessing}>
                            Anular
                        </button>
                        <button className="order-modal-btn-submit" onClick={handleSubmit} disabled={isProcessing}>
                            {isProcessing ? 'Procesando...' : 'Procesar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
