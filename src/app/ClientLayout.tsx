"use client";

import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { AuthModal } from "./components/AuthModal";
import { NewOrderModal } from "./components/NewOrderModal";
import { TransactionDetailsModal } from "./components/TransactionDetailsModal";
import { IconShapes } from "./components/Icons";
import { useAppContext } from "../context/AppContext";
import { usePathname } from "next/navigation";
import "./page.css"; // Ensure global styles apply if needed here

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const context = useAppContext();
    const pathname = usePathname();

    if (!context.isClient) return null;

    if (!context.userName) {
        return <AuthModal onLogin={context.handleLogin} />;
    }

    // Determine active tab from pathname for Sidebar styling
    let activeTab = "dashboard";
    if (pathname.includes("/movements")) activeTab = "movements";
    else if (pathname.includes("/stats")) activeTab = "stats";
    else if (pathname.includes("/profile")) activeTab = "profile";

    return (
        <div className="app-wrapper">
            <Sidebar
                theme={context.theme}
                toggleTheme={context.toggleTheme}
                activeTab={activeTab}
                userName={context.userName!}
                onLogout={context.handleLogout}
                onAddClick={() => context.setIsAddModalOpen(true)}
            />

            <header className="mobile-header">
                <div className="mobile-header-left">
                    <div className="mobile-user-avatar">
                        {context.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="mobile-user-info">
                        <span className="mobile-system-status">Sistema Activo</span>
                        <span className="mobile-welcome">Hola, {context.userName}</span>
                    </div>
                </div>
                <div className="mobile-header-right">
                    <div className="mobile-icon-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                    </div>
                    <button
                        onClick={context.toggleTravelMode}
                        className={`mobile-travel-btn ${context.travelModeStart ? 'active' : ''}`}
                    >
                        ✈ {context.travelModeStart ? 'VIAJE ON' : 'VIAJE'}
                    </button>
                </div>
            </header>

            <main className="main-content">
                {children}
            </main>

            <button
                className="brutalist-btn fab-btn"
                onClick={() => context.setIsAddModalOpen(true)}
                title="Agregar Transacción"
            >
                <IconShapes type="plus" />
            </button>

            <NewOrderModal
                isOpen={context.isAddModalOpen}
                onClose={() => {
                    context.setIsAddModalOpen(false);
                    context.setAddModalInitialData(null);
                }}
                onSave={async (tx) => {
                    await context.saveTransaction(tx);
                    context.setIsAddModalOpen(false);
                    context.setAddModalInitialData(null);
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
        </div>
    );
}
