"use client";

import Link from "next/link";
import { useLanguage } from "../../context/LanguageContext";

const PRIVACY_COPY = {
    es: {
        eyebrow: "Política de privacidad",
        title: "Cómo tratamos tus datos financieros en Safed",
        intro: "Esta política explica qué datos usamos, por qué los usamos y qué controles tenés dentro de la app.",
        back: "Volver al inicio",
        sections: [
            {
                title: "1. Qué datos tratamos",
                body: [
                    "Datos de cuenta básicos, como tu alias o nombre de usuario.",
                    "Transacciones que cargás manualmente o confirmás dentro de la app.",
                    "Si activás la sincronización bancaria en Android, textos de notificaciones compatibles de bancos o billeteras para detectar montos, comercios y tipo de movimiento.",
                ],
            },
            {
                title: "2. Qué no hacemos",
                body: [
                    "No leemos chats personales, correos ni otras notificaciones ajenas al flujo financiero compatible.",
                    "No vendemos tus datos a terceros.",
                    "No activamos la sincronización bancaria sin una acción explícita tuya.",
                ],
            },
            {
                title: "3. Para qué usamos la información",
                body: [
                    "Mostrar balances, estadísticas y metas dentro de tu cuenta.",
                    "Convertir notificaciones bancarias compatibles en movimientos pendientes para revisión o guardado.",
                    "Si activás auto-guardado, registrar automáticamente esos movimientos detectados.",
                ],
            },
            {
                title: "4. Controles del usuario",
                body: [
                    "Podés desactivar la sincronización bancaria en cualquier momento desde Perfil o desde los ajustes de Android.",
                    "Podés desactivar el auto-guardado aunque mantengas activa la detección de notificaciones.",
                    "Podés borrar o editar movimientos guardados dentro de la app.",
                ],
            },
            {
                title: "5. Retención y seguridad",
                body: [
                    "Conservamos los datos necesarios para que puedas usar tu historial financiero y tus estadísticas.",
                    "Aplicamos controles razonables para proteger la información dentro de la infraestructura de la app.",
                    "Si desactivás la función, la app deja de intentar leer nuevas notificaciones compatibles.",
                ],
            },
        ],
        contactTitle: "Contacto",
        contactBody: "Si necesitás ejercer control sobre tus datos o hacer una consulta de privacidad, usá los canales de soporte publicados junto con el lanzamiento de la app.",
    },
    en: {
        eyebrow: "Privacy policy",
        title: "How Safed handles your financial data",
        intro: "This policy explains which data we use, why we use it, and which controls remain in your hands inside the app.",
        back: "Back to home",
        sections: [
            {
                title: "1. What data we process",
                body: [
                    "Basic account data such as your alias or username.",
                    "Transactions you add manually or confirm inside the app.",
                    "If you enable bank sync on Android, compatible bank or wallet notification text to detect amounts, merchants, and movement type.",
                ],
            },
            {
                title: "2. What we do not do",
                body: [
                    "We do not read personal chats, email, or unrelated notifications outside the supported financial flow.",
                    "We do not sell your data to third parties.",
                    "We do not enable bank sync without an explicit action from you.",
                ],
            },
            {
                title: "3. Why we use the information",
                body: [
                    "To show balances, statistics, and goals inside your account.",
                    "To turn compatible bank notifications into pending movements for review or saving.",
                    "If you enable auto-save, to automatically record those detected movements.",
                ],
            },
            {
                title: "4. User controls",
                body: [
                    "You can disable bank sync at any time from Profile or Android settings.",
                    "You can disable auto-save while keeping notification detection enabled.",
                    "You can edit or delete saved movements inside the app.",
                ],
            },
            {
                title: "5. Retention and security",
                body: [
                    "We keep the data needed for your financial history and statistics to work.",
                    "We apply reasonable controls to protect information within the app infrastructure.",
                    "If you disable the feature, the app stops trying to read new compatible notifications.",
                ],
            },
        ],
        contactTitle: "Contact",
        contactBody: "If you need to exercise control over your data or ask a privacy question, use the support channels published with the app launch.",
    },
} as const;

export default function PrivacyPage() {
    const { lang, setLang } = useLanguage();
    const copy = PRIVACY_COPY[lang];

    return (
        <main style={{
            minHeight: "100vh",
            background: "var(--bg)",
            color: "var(--text-main)",
            padding: "2rem 1.25rem 4rem",
        }}>
            <div style={{ maxWidth: "760px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                    <Link href="/" style={{ color: "var(--primary)", fontWeight: 800, textDecoration: "none" }}>
                        {copy.back}
                    </Link>
                    <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "999px", padding: "0.2rem", gap: "0.2rem" }}>
                        <button type="button" onClick={() => setLang("es")} style={{ border: 0, cursor: "pointer", borderRadius: "999px", padding: "0.45rem 0.8rem", background: lang === "es" ? "var(--primary)" : "transparent", color: lang === "es" ? "var(--primary-text)" : "var(--text-muted)", fontWeight: 800 }}>ES</button>
                        <button type="button" onClick={() => setLang("en")} style={{ border: 0, cursor: "pointer", borderRadius: "999px", padding: "0.45rem 0.8rem", background: lang === "en" ? "var(--primary)" : "transparent", color: lang === "en" ? "var(--primary-text)" : "var(--text-muted)", fontWeight: 800 }}>EN</button>
                    </div>
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: "24px", background: "var(--surface)", padding: "2rem" }}>
                    <div style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "0.74rem", fontWeight: 900, marginBottom: "0.9rem" }}>{copy.eyebrow}</div>
                    <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 0.95, fontWeight: 950 }}>{copy.title}</h1>
                    <p style={{ color: "var(--text-muted)", lineHeight: 1.7, maxWidth: "62ch", margin: "1rem 0 0" }}>{copy.intro}</p>

                    <div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
                        {copy.sections.map((section) => (
                            <section key={section.title} style={{ border: "1px solid var(--border)", borderRadius: "18px", padding: "1.2rem 1.1rem", background: "var(--surface-alt)" }}>
                                <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem", fontWeight: 900 }}>{section.title}</h2>
                                <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
                                    {section.body.map((paragraph) => (
                                        <li key={paragraph} style={{ marginBottom: "0.45rem" }}>{paragraph}</li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>

                    <section style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                        <h2 style={{ margin: "0 0 0.6rem", fontSize: "1rem", fontWeight: 900 }}>{copy.contactTitle}</h2>
                        <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7 }}>{copy.contactBody}</p>
                    </section>
                </div>
            </div>
        </main>
    );
}