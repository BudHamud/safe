"use client";
import React from "react";
import { DashboardTab } from "./components/DashboardTab";
import { useAppContext } from "../context/AppContext";

export default function DashboardPage() {
    const context = useAppContext();

    if (!context.isClient || !context.userName) return null;

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
