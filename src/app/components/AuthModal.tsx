import React, { useState } from 'react';
import './AuthModal.css';

type AuthModalProps = {
    onLogin: (userId: string, username: string) => void;
};

export const AuthModal = ({ onLogin }: AuthModalProps) => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.password) {
            alert("Por favor completa los campos.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, action: isRegister ? 'register' : 'login' })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Error de autenticación');
                return;
            }
            onLogin(data.id, data.username);
        } catch (e) {
            console.error(e);
            alert("Error de conexión al servidor");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-box">

                {/* Logo bar */}
                <div className="auth-logo-bar">
                    <div className="auth-logo-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <span className="auth-logo-name">Caja Fuerte</span>
                </div>

                {/* Body */}
                <form className="auth-body" onSubmit={handleSubmit}>

                    <h2 className="auth-title">
                        {isRegister ? 'Crear Cuenta' : 'Acceso Seguro'}
                    </h2>

                    {/* Login / Registro toggle */}
                    <div className="auth-toggle">
                        <button
                            type="button"
                            className={`auth-toggle-opt ${!isRegister ? 'active' : ''}`}
                            onClick={() => setIsRegister(false)}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            className={`auth-toggle-opt ${isRegister ? 'active' : ''}`}
                            onClick={() => setIsRegister(true)}
                        >
                            Registro
                        </button>
                    </div>

                    {/* Username */}
                    <div className="auth-field">
                        <span className="auth-label">ID Usuario / Alias</span>
                        <div className="auth-input-wrap">
                            <input
                                type="text"
                                className="auth-input"
                                placeholder="Ej. alex_dev"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                autoFocus
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="auth-field">
                        <div className="auth-field-header">
                            <span className="auth-label">Clave de Acceso</span>
                            {!isRegister && (
                                <button type="button" className="auth-forgot">
                                    ¿Olvidó su clave?
                                </button>
                            )}
                        </div>
                        <div className="auth-input-wrap">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="auth-input auth-input--password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                autoComplete={isRegister ? 'new-password' : 'current-password'}
                            />
                            <button
                                type="button"
                                className="auth-eye-btn"
                                onClick={() => setShowPassword(v => !v)}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" className="auth-submit" disabled={isLoading}>
                        {isLoading ? 'Procesando...' : isRegister ? 'Registrar' : 'Autenticar'}
                    </button>

                </form>

                {/* Footer */}
                <div className="auth-footer">
                    <span className="auth-footer-version">© Sistema Organic v3.0</span>
                    <div className="auth-footer-icons">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                        </svg>
                    </div>
                </div>

            </div>
        </div>
    );
};
