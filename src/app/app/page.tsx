"use client";
import React from "react";
import { DashboardTab } from "../components/dashboard";
import { useAppContext } from "../../context/AppContext";
import { AuthModal } from "../components/auth";

export default function AppDashboardPage() {
    const context = useAppContext();

    if (!context.isClient) return null;

    if (!context.userName) {
        return <AuthModal onLogin={context.handleLogin} />;
    }

    return (
        <DashboardTab
            transactions={context.mappedTransactions}
            totalIncome={context.totalIncome}
            totalExpense={context.totalExpense}
            currentBalance={context.currentBalance}
            monthlyGoal={context.userGoal}
            savingsTarget={context.savingsTarget}
            onTransactionClick={context.setSelectedTransaction}
            globalCurrency={context.globalCurrency}
            isTravelMode={!!context.travelModeStart}
            toggleTravelMode={context.toggleTravelMode}
            allTransactions={context.transactions}
            setIsAddModalOpen={context.setIsAddModalOpen}
            setAddModalInitialData={context.setAddModalInitialData}
        />
    );
}
