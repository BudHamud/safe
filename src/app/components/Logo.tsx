import React from 'react';

interface LogoProps {
    size?: number;
    className?: string;
    loading?: boolean;
}

export const Logo = ({ size = 32, className = "", loading = false }: LogoProps) => {
    return (
        <div
            className={`logo-container ${loading ? 'loading-logo' : ''} ${className}`}
            style={{
                width: size,
                height: size,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: '100%' }}
            >
                {/* Outer Ring */}
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" />

                {/* Tick marks */}
                {[...Array(24)].map((_, i) => (
                    <line
                        key={i}
                        x1="50" y1="12" x2="50" y2="18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        transform={`rotate(${i * 15} 50 50)`}
                    />
                ))}

                {/* Main Dial Handle */}
                <circle cx="50" cy="50" r="28" fill="currentColor" />

                {/* Dial Indicator / Notch */}
                <rect x="48" y="26" width="4" height="10" fill="currentColor" opacity="1" transform="rotate(0 50 50)">
                    <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 50 50"
                        to="360 50 50"
                        dur="10s"
                        repeatCount="indefinite"
                        begin="0s"
                    />
                </rect>

                {/* Inner detail */}
                <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 2" />
            </svg>
            <style>{`
                .logo-container {
                    color: white;
                    flex-shrink: 0;
                }
                .loading-logo {
                    animation: rotate-dial 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
                @keyframes rotate-dial {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
