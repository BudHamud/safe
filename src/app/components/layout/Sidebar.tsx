import React from 'react';
import { IconShapes } from './Icons';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../../../context/LanguageContext';
import { Logo } from './Logo';

type SidebarProps = {
    theme: string;
    toggleTheme: () => void;
    activeTab: string;
    userName: string;
    onLogout: () => void;
    onAddClick: () => void;
    travelModeStart: string;
    toggleTravelMode: () => Promise<void>;
    pendingCount?: number;
    onBellClick?: () => void;
};

export const Sidebar = ({
    activeTab, onAddClick, pendingCount = 0, onBellClick,
}: SidebarProps) => {
    const { t } = useLanguage();

    return (
        <aside className="sidebar" data-color-zone="sidebar">
            <div className="brand">
                <Logo size={28} />
                <span className="brand-name">Safed</span>
            </div>

            <nav className="nav-menu">
                <Link href="/app" scroll={false} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} aria-current={activeTab === 'dashboard' ? 'page' : undefined}>
                    <IconShapes type="dashboard" />
                    <span>{t('nav.dashboard')}</span>
                </Link>
                <Link href="/app/movements" scroll={false} className={`nav-item ${activeTab === 'movements' ? 'active' : ''}`} aria-current={activeTab === 'movements' ? 'page' : undefined}>
                    <IconShapes type="card" />
                    <span>{t('nav.movements')}</span>
                </Link>

                <button className="app-add-btn" onClick={onAddClick}>
                    <div className="add-btn-icon">
                        <IconShapes type="plus" />
                    </div>
                </button>

                <Link href="/app/stats" scroll={false} className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`} aria-current={activeTab === 'stats' ? 'page' : undefined}>
                    <IconShapes type="chart" />
                    <span>{t('nav.stats')}</span>
                </Link>
                <Link href="/app/profile" scroll={false} className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} aria-current={activeTab === 'profile' ? 'page' : undefined}>
                    <IconShapes type="user" />
                    <span>{t('nav.profile')}</span>
                </Link>
            </nav>

            {/* Footer: solo campana de notificaciones */}
            <div className="sidebar-footer desktop-only">
                <button
                    className="sidebar-util-btn"
                    onClick={onBellClick}
                    title={t('sidebar.bank_notifications_title')}
                >
                    <IconShapes type="bell" />
                    {pendingCount > 0 && (
                        <span className="notif-badge">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
};
