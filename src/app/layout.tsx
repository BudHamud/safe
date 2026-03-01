import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import { LanguageProvider } from "../context/LanguageContext";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit', display: 'swap' });

export const metadata = {
    title: "Caja Fuerte",
    description: "Gestión de finanzas personales con privacidad radical.",
    icons: {
        icon: '/favicon.svg',
    }
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#141714',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" suppressHydrationWarning data-theme="dark" className={`${inter.variable} ${outfit.variable}`}>
            <body suppressHydrationWarning>
                <LanguageProvider>
                    <AppProvider>
                        {children}
                    </AppProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}
