"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useLanguage } from './LanguageContext';

type DialogTone = 'default' | 'danger';

type DialogOptions = {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: DialogTone;
};

type DialogState =
    | ({ kind: 'alert' } & DialogOptions)
    | ({ kind: 'confirm' } & DialogOptions)
    | null;

type DialogContextType = {
    alert: (options: string | DialogOptions) => Promise<void>;
    confirm: (options: string | DialogOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

const toOptions = (options: string | DialogOptions): DialogOptions => {
    if (typeof options === 'string') {
        return { message: options };
    }
    return options;
};

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
    const { t } = useLanguage();
    const [dialog, setDialog] = useState<DialogState>(null);
    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const closeDialog = useCallback((result: boolean) => {
        const resolver = resolverRef.current;
        resolverRef.current = null;
        setDialog(null);
        resolver?.(result);
    }, []);

    const openDialog = useCallback((kind: 'alert' | 'confirm', options: string | DialogOptions) => {
        const normalized = toOptions(options);
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setDialog({ kind, tone: 'default', ...normalized });
        });
    }, []);

    const alert = useCallback(async (options: string | DialogOptions) => {
        await openDialog('alert', options);
    }, [openDialog]);

    const confirm = useCallback((options: string | DialogOptions) => {
        return openDialog('confirm', options);
    }, [openDialog]);

    const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

    const isDanger = dialog?.tone === 'danger';

    return (
        <DialogContext.Provider value={value}>
            {children}

            {dialog && (
                <div
                    onClick={() => closeDialog(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.78)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        zIndex: 4000,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={event => event.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '360px',
                            background: 'var(--surface)',
                            border: `1px solid ${isDanger ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: '16px',
                            padding: '1.25rem',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
                        }}
                    >
                        {dialog.title && (
                            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {dialog.title}
                            </h2>
                        )}

                        <p style={{ margin: dialog.title ? '0.75rem 0 0' : 0, fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                            {dialog.message}
                        </p>

                        <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.1rem', justifyContent: 'flex-end' }}>
                            {dialog.kind === 'confirm' && (
                                <button
                                    onClick={() => closeDialog(false)}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--text-muted)',
                                        padding: '0.7rem 0.95rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {dialog.cancelLabel || t('btn.cancel')}
                                </button>
                            )}

                            <button
                                onClick={() => closeDialog(true)}
                                style={{
                                    background: isDanger ? 'var(--accent)' : 'var(--primary)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: isDanger ? 'var(--accent-text)' : 'var(--primary-text)',
                                    padding: '0.7rem 0.95rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {dialog.confirmLabel || (dialog.kind === 'confirm' ? t('btn.confirm') : t('btn.close'))}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used inside DialogProvider');
    return context;
};