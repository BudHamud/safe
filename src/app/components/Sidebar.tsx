import React from 'react';
import { IconShapes } from './Icons';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../../context/LanguageContext';
import { Logo } from './Logo';

type SidebarProps = {
    theme: string;
    toggleTheme: () => void;
    activeTab: string;
    userName: string;
    onLogout: () => void;
    onAddClick: () => void;
    travelModeStart: string;
    toggleTravelMode: () => void;
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
                <Link href="/app" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
                    <IconShapes type="dashboard" />
                    <span>{t('nav.dashboard')}</span>
                </Link>
                <Link href="/app/movements" className={`nav-item ${activeTab === 'movements' ? 'active' : ''}`}>
                    <IconShapes type="card" />
                    <span>{t('nav.movements')}</span>
                </Link>

                <button className="app-add-btn" onClick={onAddClick}>
                    <div className="add-btn-icon">
                        <IconShapes type="plus" />
                    </div>
                </button>

                <Link href="/app/stats" className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}>
                    <IconShapes type="chart" />
                    <span>{t('nav.stats')}</span>
                </Link>
                <Link href="/app/profile" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
                    <IconShapes type="user" />
                    <span>{t('nav.profile')}</span>
                </Link>
            </nav>

            {/* Footer: solo campana de notificaciones */}
            <div className="sidebar-footer desktop-only">
                <button
                    className="sidebar-util-btn"
                    onClick={onBellClick}
                    title="Notificaciones bancarias"
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
