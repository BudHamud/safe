import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import ClientLayout from "./ClientLayout";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit', display: 'swap' });

export const metadata = {
    title: "Finance System V2",
    description: "Bespoke expense management system",
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" suppressHydrationWarning data-theme="dark" className={`${inter.variable} ${outfit.variable}`}>
            <body>
                <AppProvider>
                    <ClientLayout>
                        {children}
                    </ClientLayout>
                </AppProvider>
            </body>
        </html>
    );
}
