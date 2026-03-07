"use client";

import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { AuthModal } from "./components/AuthModal";
import { NewOrderModal } from "./components/NewOrderModal";
import { TransactionDetailsModal } from "./components/TransactionDetailsModal";
import { BankNotifToast } from "./components/BankNotifToast";
import { ColorCustomizerOverlay } from "./components/ColorCustomizerOverlay";
import { IconShapes } from "./components/Icons";
import { useAppContext } from "../context/AppContext";
import { useBankNotifications, PendingBankTransaction } from "../hooks/useBankNotifications";
import { useLanguage } from "../context/LanguageContext";
import { usePathname, useRouter } from "next/navigation";
import { useAndroidBackButton } from "../hooks/useAndroidBackButton";
import "./page.css";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const context = useAppContext();
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();

    // Handle Android hardware back button
    useAndroidBackButton();

    // ── Bank sync settings (synced from ProfileTab via localStorage) ──
    const [bankSyncEnabled, setBankSyncEnabled] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('bankSyncEnabled') === 'true';
    });
    const [autoAddEnabled, setAutoAddEnabled] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('bankAutoAddEnabled') === 'true';
    });

    // ── Notification panel state ───────────────────────────────
    const [notifPanelOpen, setNotifPanelOpen] = useState(false);
    // Keeps track of which pending DB entry to delete after modal save
    const [pendingNotifId, setPendingNotifId] = useState<string | null>(null);

    const onAutoSaved = React.useCallback(() => {
        if (context.userId) context.loadUserTransactions(context.userId);
    }, [context.userId, context.loadUserTransactions]);

    // ── Bank notification listener ─────────────────────────────
    const {
        pending,
        permissionGranted,
        requestPermission,
        dismissPending,
        processNotification,
    } = useBankNotifications({
        enabled: bankSyncEnabled,
        userId: context.userId ?? '',
        autoAdd: autoAddEnabled,
        apiBase: '',
        onAutoSaved,
    });

    // ── Handle confirm: open NewOrderModal pre-filled ──────────
    const handleBankConfirm = React.useCallback(async (item: PendingBankTransaction) => {
        // Build initial data for the modal from the parsed notification
        const initialData = {
            desc: item.merchant,
            amount: item.amount,
            tag: item.tag,
            type: item.type as 'expense' | 'income',
            currency: item.currency,
        };
        // Remember which pending entry to delete after save
        setPendingNotifId(item.id);
        // Close panel if open, then open the pre-filled modal
        setNotifPanelOpen(false);
        context.setAddModalInitialData(initialData);
        context.setIsAddModalOpen(true);
    }, [context]);

    // ── Expose bank sync controls globally so ProfileTab can call them ──
    if (typeof window !== 'undefined') {
        (window as any).__setBankSync = (enabled: boolean) => {
            setBankSyncEnabled(enabled);
            localStorage.setItem('bankSyncEnabled', String(enabled));
            if (enabled && permissionGranted === false) {
                requestPermission();
            }
        };
        (window as any).__setBankAutoAdd = (enabled: boolean) => {
            setAutoAddEnabled(enabled);
            localStorage.setItem('bankAutoAddEnabled', String(enabled));
        };
        (window as any).__debugNotify = ({ packageName, title, text }: any) => {
            processNotification(packageName, title, text);
        };
    }

    if (!context.isClient) return null;

    // Sin sesión: devolvemos children directo (la página /app lo maneja con AuthModal)
    // Agregamos SplashScreen aquí también para que se muestre en el login
    if (!context.userName) {
        return (
            <>
                {children}
            </>
        );
    }

    let activeTab = "dashboard";
    if (pathname.includes("/app/movements")) activeTab = "movements";
    else if (pathname.includes("/app/stats")) activeTab = "stats";
    else if (pathname.includes("/app/profile")) activeTab = "profile";

    return (
        <div className="app-wrapper">
            <Sidebar
                theme={context.theme}
                toggleTheme={context.toggleTheme}
                activeTab={activeTab}
                userName={context.userName}
                onLogout={() => {
                    context.handleLogout();
                    router.push('/app');
                }}
                onAddClick={() => context.setIsAddModalOpen(true)}
                travelModeStart={context.travelModeStart}
                toggleTravelMode={context.toggleTravelMode}
                pendingCount={pending.length}
                onBellClick={() => setNotifPanelOpen(true)}
            />

            <header className="app-header">
                <div className="app-header-left">
                    <div className="app-user-avatar">
                        {context.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="app-user-info">
                        <span className="app-system-status">
                            {bankSyncEnabled ? t('header.banks_active') : t('header.system_active')}
                        </span>
                        <span className="app-welcome">{t('header.hello')}, {context.userName}</span>
                    </div>
                </div>
                {/* ... app-header-right ... */}
                <div className="app-header-right">
                    <div
                        className="app-icon-btn"
                        onClick={() => setNotifPanelOpen(true)}
                        style={{ cursor: 'pointer' }}
                    >
                        <IconShapes type="bell" />
                        {pending.length > 0 && (
                            <span className="notif-badge">{pending.length}</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="main-content">
                {children}
            </main>

            <button
                className="brutalist-btn fab-btn"
                onClick={() => context.setIsAddModalOpen(true)}
            >
                <IconShapes type="plus" />
            </button>

            <NewOrderModal
                isOpen={context.isAddModalOpen}
                onClose={() => {
                    context.setIsAddModalOpen(false);
                    context.setAddModalInitialData(null);
                    setPendingNotifId(null);
                }}
                onSave={async (tx) => {
                    await context.saveTransaction(tx);
                    if (pendingNotifId) {
                        await fetch(`/api/parse-notification?id=${pendingNotifId}`, { method: 'DELETE' });
                        dismissPending(pendingNotifId);
                        setPendingNotifId(null);
                    }
                    context.setIsAddModalOpen(false);
                }}
                availableCategories={context.allCategories}
                initialData={context.addModalInitialData}
                globalCurrency={context.globalCurrency}
            />

            <TransactionDetailsModal
                transaction={context.selectedTransaction}
                onClose={() => context.setSelectedTransaction(null)}
                onDelete={async (id) => {
                    await context.handleDeleteTransaction(id);
                    context.setSelectedTransaction(null);
                }}
                onUpdate={() => {
                    if (context.userId) context.loadUserTransactions(context.userId);
                    context.setSelectedTransaction(null);
                }}
                globalCurrency={context.globalCurrency}
                availableCategories={context.allCategories}
            />

            <BankNotifToast
                pending={pending}
                onConfirm={handleBankConfirm}
                onDismiss={dismissPending}
                globalCurrency={context.globalCurrency}
                panelOpen={notifPanelOpen}
                onClosePanel={() => setNotifPanelOpen(false)}
            />

            <ColorCustomizerOverlay />
        </div>
    );
}
