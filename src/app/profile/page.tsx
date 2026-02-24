"use client";
import React from "react";
import { ProfileTab } from "../components/ProfileTab";
import { useAppContext } from "../../context/AppContext";

export default function ProfilePage() {
    const context = useAppContext();

    if (!context.isClient || !context.userId) return null;

    return (
        <ProfileTab
            userName={context.userName!}
            theme={context.theme}
            toggleTheme={context.toggleTheme}
            onLogout={context.handleLogout}
            transactions={context.transactions} // Profile needs original tags/etc, amount mapping is fine
            userId={context.userId}
            monthlyGoal={context.userGoal}
            onUpdate={() => {
                if (context.userId) context.loadUserData(context.userId);
            }}
            globalCurrency={context.globalCurrency}
            onCurrencyChange={context.handleCurrencyChange}
            availableCategories={context.allCategories}
            onCategoryChangeInfo={() => context.setCatSignal(c => c + 1)}
        />
    );
}
