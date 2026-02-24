import React from 'react';
import { IconShapes } from './Icons';
import Link from 'next/link';

type SidebarProps = {
    theme: string;
    toggleTheme: () => void;
    activeTab: string;
    userName: string;
    onLogout: () => void;
    onAddClick: () => void;
};

export const Sidebar = ({ theme, toggleTheme, activeTab, userName, onLogout, onAddClick }: SidebarProps) => {
    return (
        <aside className="sidebar">
            <div className="brand">
                <div className="brand-logo-minimal">
                    <div className="inner-circle">
                        <div className="inner-dot"></div>
                    </div>
                </div>
                <span className="brand-name">Caja Fuerte</span>
            </div>

            <nav className="nav-menu">
                <Link href="/" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
                    <IconShapes type="dashboard" />
                    <span>Resumen</span>
                </Link>
                <Link href="/movements" className={`nav-item ${activeTab === 'movements' ? 'active' : ''}`}>
                    <IconShapes type="card" />
                    <span>Movimientos</span>
                </Link>

                <button className="app-add-btn" onClick={onAddClick}>
                    <div className="add-btn-icon">
                        <IconShapes type="plus" />
                    </div>
                </button>

                <Link href="/stats" className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}>
                    <IconShapes type="chart" />
                    <span>Métricas</span>
                </Link>
                <Link href="/profile" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
                    <IconShapes type="user" />
                    <span>Perfil</span>
                </Link>
            </nav>
        </aside>
    );
};
