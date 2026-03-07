"use client";
import React, { useState, useEffect, useCallback } from 'react';
import './ColorCustomizerOverlay.css';
import { useAppContext } from '../../context/AppContext';
import { COLOR_PRESETS, WIDGET_ZONES } from '../../lib/colorSystem';

export const ColorCustomizerOverlay = () => {
    const ctx = useAppContext();
    const {
        isColorMode, setIsColorMode,
        activeColorZone, setActiveColorZone,
        widgetColors, setWidgetColor, resetWidgetColors,
        applyColorPreset,
        customColors,
    } = ctx;

    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState<'presets' | 'widgets'>('presets');
    const [expandedZone, setExpandedZone] = useState<string | null>(null);

    // ── Detect active zone from DOM clicks ──────────────────────────────────
    useEffect(() => {
        if (!isColorMode) return;
        const handleClick = (e: MouseEvent) => {
            const zoneEl = (e.target as Element).closest('[data-color-zone]');
            const zone = zoneEl?.getAttribute('data-color-zone') ?? null;
            if (zone) {
                setActiveColorZone(zone);
                setExpandedZone(zone);
                setActiveTab('widgets');
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [isColorMode, setActiveColorZone]);

    // ── Sync zone-active CSS class on DOM elements ──────────────────────────
    useEffect(() => {
        // Remove from all zones first
        document.querySelectorAll('[data-color-zone].zone-active').forEach(el => {
            el.classList.remove('zone-active');
        });
        // Apply to active zone
        if (activeColorZone) {
            const el = document.querySelector(`[data-color-zone="${activeColorZone}"]`);
            el?.classList.add('zone-active');
        }
    }, [activeColorZone]);

    // ── Add/remove color-mode class on app-wrapper ───────────────────────────
    useEffect(() => {
        const wrapper = document.querySelector('.app-wrapper');
        if (!wrapper) return;
        if (isColorMode) wrapper.classList.add('app-color-mode');
        else wrapper.classList.remove('app-color-mode');
        return () => wrapper.classList.remove('app-color-mode');
    }, [isColorMode]);

    const handleClose = useCallback(() => {
        setIsColorMode(false);
        setActiveColorZone(null);
        setExpandedZone(null);
    }, [setIsColorMode, setActiveColorZone]);

    // ── Get current computed value of a CSS var (widget override → computed) ─
    const resolveColor = (zone: string, variable: string, defaultColor: string): string => {
        if (widgetColors[zone]?.[variable]) return widgetColors[zone][variable];
        if (typeof window !== 'undefined') {
            const val = getComputedStyle(document.documentElement)
                .getPropertyValue(variable)
                .trim();
            if (val) return val;
        }
        return defaultColor;
    };

    // ── Determine active preset ──────────────────────────────────────────────
    const activePresetId = typeof window !== 'undefined'
        ? localStorage.getItem('financeActivePreset') ?? 'organic-dark'
        : 'organic-dark';

    if (!isColorMode) return null;

    return (
        <div className={`color-overlay ${isMinimized ? 'color-overlay--minimized' : ''}`}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="color-overlay__header">
                <div className="color-overlay__title">
                    <span className="color-overlay__title-icon">🎨</span>
                    <span>Apariencia</span>
                </div>
                <div className="color-overlay__actions">
                    <button
                        className="color-overlay__icon-btn"
                        onClick={() => setIsMinimized(v => !v)}
                        title={isMinimized ? 'Expandir' : 'Minimizar'}
                    >
                        {isMinimized ? '▲' : '▼'}
                    </button>
                    <button
                        className="color-overlay__icon-btn color-overlay__icon-btn--close"
                        onClick={handleClose}
                        title="Cerrar editor"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="color-overlay__body">
                    {/* ── Tabs ─────────────────────────────────────────── */}
                    <div className="color-overlay__tabs">
                        <button
                            className={`color-overlay__tab ${activeTab === 'presets' ? 'color-overlay__tab--active' : ''}`}
                            onClick={() => setActiveTab('presets')}
                        >
                            Presets
                        </button>
                        <button
                            className={`color-overlay__tab ${activeTab === 'widgets' ? 'color-overlay__tab--active' : ''}`}
                            onClick={() => setActiveTab('widgets')}
                        >
                            Widgets
                        </button>
                    </div>

                    {/* ── PRESETS TAB ──────────────────────────────────── */}
                    {activeTab === 'presets' && (
                        <div className="color-overlay__content">
                            <p className="color-overlay__hint">
                                Elegí un esquema de colores base. Podés personalizar cada sección en la pestaña Widgets.
                            </p>
                            <div className="color-presets-grid">
                                {COLOR_PRESETS.map(preset => {
                                    const isActive = activePresetId === preset.id;
                                    const bg = preset.colors['--bg'] || '#111';
                                    const primary = preset.colors['--primary'] || '#888';
                                    const accent = preset.colors['--accent'] || '#555';
                                    const textMain = preset.colors['--text-main'] || '#eee';
                                    return (
                                        <button
                                            key={preset.id}
                                            className={`color-preset-tile ${isActive ? 'color-preset-tile--active' : ''}`}
                                            onClick={() => applyColorPreset(preset.id)}
                                            title={preset.name}
                                            style={{ '--preset-bg': bg } as React.CSSProperties}
                                        >
                                            <div
                                                className="color-preset-swatch"
                                                style={{ background: bg, border: `2px solid ${primary}` }}
                                            >
                                                <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: primary, display: 'block' }} />
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: accent, display: 'block' }} />
                                                </div>
                                                <div style={{ width: '100%', height: '2px', background: textMain, opacity: 0.5, borderRadius: '1px' }} />
                                                <div style={{ width: '60%', height: '2px', background: textMain, opacity: 0.3, borderRadius: '1px', marginTop: '2px' }} />
                                            </div>
                                            <span className="color-preset-name">{preset.emoji} {preset.name}</span>
                                            {isActive && <span className="color-preset-check">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── WIDGETS TAB ──────────────────────────────────── */}
                    {activeTab === 'widgets' && (
                        <div className="color-overlay__content">
                            {activeColorZone ? (
                                <p className="color-overlay__hint color-overlay__hint--zone">
                                    🎯 Zona seleccionada: <strong>{WIDGET_ZONES.find(z => z.id === activeColorZone)?.name ?? activeColorZone}</strong>
                                </p>
                            ) : (
                                <p className="color-overlay__hint">
                                    Tocá una sección en la pantalla para seleccionarla, o expandí una zona aquí abajo.
                                </p>
                            )}

                            {WIDGET_ZONES.map(zone => {
                                const isExpanded = expandedZone === zone.id;
                                const isSelected = activeColorZone === zone.id;
                                const hasOverrides = Object.keys(widgetColors[zone.id] ?? {}).length > 0;
                                return (
                                    <div
                                        key={zone.id}
                                        className={`color-zone ${isSelected ? 'color-zone--selected' : ''}`}
                                    >
                                        <div
                                            className="color-zone__header"
                                            onClick={() => {
                                                setExpandedZone(isExpanded ? null : zone.id);
                                                setActiveColorZone(zone.id);
                                            }}
                                        >
                                            <div className="color-zone__title-row">
                                                <span className="color-zone__icon">{zone.icon}</span>
                                                <div>
                                                    <div className="color-zone__name">{zone.name}</div>
                                                    <div className="color-zone__desc">{zone.desc}</div>
                                                </div>
                                            </div>
                                            <div className="color-zone__meta">
                                                {hasOverrides && (
                                                    <span className="color-zone__badge">CUSTOM</span>
                                                )}
                                                <span className="color-zone__chevron">{isExpanded ? '▲' : '▼'}</span>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="color-zone__vars">
                                                {zone.vars.map(({ variable, label, defaultColor }) => {
                                                    const currentValue = resolveColor(zone.id, variable, defaultColor);
                                                    return (
                                                        <div key={variable} className="color-var-row">
                                                            <div className="color-var-info">
                                                                <span className="color-var-label">{label}</span>
                                                                <span className="color-var-name">{variable}</span>
                                                            </div>
                                                            <div className="color-var-picker-wrap">
                                                                <span
                                                                    className="color-var-preview"
                                                                    style={{ background: currentValue }}
                                                                />
                                                                <input
                                                                    type="color"
                                                                    className="color-var-input"
                                                                    value={widgetColors[zone.id]?.[variable] || (currentValue.startsWith('#') ? currentValue : '#000000')}
                                                                    onChange={e =>
                                                                        setWidgetColor(zone.id, variable, e.target.value)
                                                                    }
                                                                    title={`Cambiar ${label}`}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {hasOverrides && (
                                                    <button
                                                        className="color-zone__reset-btn"
                                                        onClick={() => resetWidgetColors(zone.id)}
                                                    >
                                                        ↺ Restaurar zona
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {Object.values(widgetColors).some(v => Object.keys(v).length > 0) && (
                                <button
                                    className="color-overlay__reset-all"
                                    onClick={() => {
                                        if (confirm('¿Resetear todas las personalizaciones de zonas?')) {
                                            resetWidgetColors();
                                        }
                                    }}
                                >
                                    ↺ Restaurar todas las zonas
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
