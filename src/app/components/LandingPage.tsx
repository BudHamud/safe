"use client";
import React, { useEffect, useState } from 'react';
import { IconShapes } from './Icons';
import { Logo } from './Logo';
import { useLanguage } from '../../context/LanguageContext';
import './LandingPage.css';

interface LandingPageProps {
    onGetStarted: () => void;
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
    const { t, lang, setLang } = useLanguage();
    // Prevent hydration mismatch: lang comes from localStorage (client-only)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <div className="landing-root">
            {/* Header */}
            <header className="landing-header">
                <div className="landing-logo">
                    <Logo size={24} />
                    <span>CAJA FUERTE</span>
                </div>
                <button
                    className="landing-lang-toggle"
                    onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                    suppressHydrationWarning
                >
                    {mounted ? (lang === 'es' ? 'ES/EN' : 'EN/ES') : 'ES/EN'}
                </button>
            </header>

            <main className="landing-container">
                {/* Hero Section */}
                <section className="landing-hero">
                    <h1 className="landing-headline">
                        FINANZAS<br />
                        <span className="italic-accent">EN PILOTO</span><br />
                        AUTOMÁTICO
                    </h1>
                    <p className="landing-subheadline">
                        Sophisticated financial management with organic dark aesthetics.
                    </p>
                    <button className="landing-cta" onClick={onGetStarted}>
                        GET STARTED
                    </button>
                </section>

                {/* Card Mockup */}
                <div className="landing-card-preview">
                    <div className="preview-card-chip"></div>
                    <div className="preview-card-wifi">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 8c3-3 6-3 9 0M2 5c5-5 10-5 15 0" />
                        </svg>
                    </div>
                    <div className="preview-card-info">
                        <div className="preview-card-label">PREMIUM MEMBER</div>
                        <div className="preview-card-number">**** **** **** 8824</div>
                    </div>
                </div>

                {/* Privacy Section */}
                <section className="landing-privacy">
                    <div className="privacy-badge">
                        <span className="dot"></span> PRIVACY FIRST
                    </div>
                    <h2 className="privacy-headline">
                        NO LEEMOS TUS MENSAJES, SOLO TUS ÉXITOS FINANCIEROS.
                    </h2>
                    <div className="privacy-line"></div>
                </section>

                {/* Core Features */}
                <section className="landing-features">
                    <h3 className="features-section-label">CORE FEATURES</h3>

                    <div className="feature-item">
                        <div className="feature-icon-box">
                            <IconShapes type="card" />
                        </div>
                        <div className="feature-text">
                            <h4>BANK SYNC</h4>
                            <p>Real-time updates across all your global accounts.</p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon-box">
                            <IconShapes type="plane" />
                        </div>
                        <div className="feature-text">
                            <h4>TRAVEL MODE</h4>
                            <p>Zero-fee currency exchange for the modern nomad.</p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon-box">
                            <IconShapes type="chart" />
                        </div>
                        <div className="feature-text">
                            <h4>SMART STATS</h4>
                            <p>AI-driven insights to maximize your monthly savings.</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-icons">
                    <button><IconShapes type="plus" /></button>
                    <button>✉️</button>
                    <button>?</button>
                </div>
                <div className="footer-copyright">
                    © 2024 CAJA FUERTE INC. ALL RIGHTS RESERVED.
                </div>
            </footer>
        </div>
    );
};
