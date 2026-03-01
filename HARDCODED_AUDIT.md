# 🔍 Auditoría: Elementos Hardcodeados y Funciones No Implementadas

> **Fecha:** 28 de Febrero de 2026  
> **Alcance:** `src/` completo — ProfileTab, MovementsTab, DashboardTab, StatsTab, APIs  
> **Última actualización:** Fase 1 completada — migración i18n total

---

## ✅ Estado post-fix (aplicado en esta sesión)

| Feature | Estado anterior | Estado actual |
|---|---|---|
| Foto de Perfil | `alert("próximamente")` activo | Deshabilitado visualmente (`disabled`, `opacity:0.35`) |
| Vinculaciones Sociales (Google / GitHub) | Botones funcionales sin lógica | `pointerEvents:none`, `opacity:0.35`, badge **Próximamente** |
| Dispositivos Vinculados | Datos inventados, botón activo | `pointerEvents:none`, `opacity:0.35`, badge **Próximamente** |
| Idioma → English | Sin indicación de estado parcial | Badge **PARCIAL** debajo del botón EN |

---

## ✅ Fase 1 completada — Migración i18n

> **Fecha completada:** 28 de Febrero de 2026

Todos los strings hardcodeados en español han sido migrados al sistema `t()` mediante nuevas claves en `src/i18n/translations.ts`.

| Componente | Strings migrados | Estado |
|---|---|---|
| `ProfileTab.tsx` | ~27 strings | ✅ Completo |
| `MovementsTab.tsx` | ~18 strings | ✅ Completo |
| `DashboardTab.tsx` | ~17 strings | ✅ Completo |
| `StatsTab.tsx` | ~15 strings | ✅ Completo |
| `translations.ts` | ~90 claves nuevas añadidas | ✅ Completo |

**Secciones de claves añadidas a `translations.ts`:**  
`common.*`, `profile.card_*`, `profile.categories_*`, `profile.autosync_*`, `profile.user_*`, `movements.*`, `dashboard.*`, `stats.*`

**Bug corregido durante migración:**  
`DashboardTab.tsx` — `router.push('/movements')` corregido a `router.push('/app/movements')`


---

## 🔴 Funciones no implementadas (requieren trabajo futuro)

### 1. `ProfileTab.tsx` → Identidad

#### 1.1 Foto de Perfil
- **Problema:** Sin backend de almacenamiento de imágenes.
- **Requiere:** Integración con S3, Cloudinary o similar. Endpoint `PUT /api/user/avatar`.
- **Línea:** [`src/app/components/ProfileTab.tsx`](src/app/components/ProfileTab.tsx)

#### 1.2 Vinculaciones Sociales
- **Google Account:** Botón "Desvincular" hardcodeado como `active` sin OAuth implementado.
- **GitHub Repository:** Botón "Vincular" sin flujo OAuth.
- **Requiere:** NextAuth.js o similar, tabla `accounts` en Prisma.

#### 1.3 Dispositivos Vinculados
- **Problema:** Datos 100% inventados. `"Samsung Galaxy S24 Ultra"`, `"MacBook Pro 14" M3"`, ubicaciones y timestamps falsos.
- **Requiere:** Tabla `sessions` en Prisma con campos `deviceName`, `lastSeen`, `ip`, `location`. Lógica de cierre de sesión remoto.

---

### 2. `ProfileTab.tsx` → Idioma (English)

#### 2.1 Traducción parcial
El botón EN funciona y **✅ todos los textos visibles pasan por el sistema `t()`** — la migración de Fase 1 está completa. Aún falta completar las traducciones al inglés en `translations.ts` para los ~90 nuevas claves añadidas (actualmente en español en ambos idiomas).

---

### 3. `src/app/api/notifications/route.ts`

- **Estado:** Placeholder documentado en el código.
- **Propósito futuro:** Recibir webhooks de bancos externos (ej. Mercado Pago API comercial).
- **Actualmente:** No conectado a ningún proveedor real.

---

## 🟡 Deuda técnica menor (no bloquea funcionalidad)

| Archivo | Línea | Issue |
|---|---|---|
| `AuthModal.tsx` | 17, 29, 35 | `alert()` en lugar de toast/inline error |
| `NewOrderModal.tsx` | Múltiples | `alert()` en validaciones y errores de red |
| `TransactionDetailsModal.tsx` | 143, 146 | `alert()` en errores de guardado |
| `ProfileTab.tsx` | 137, 170 | `alert()` en errores de categoría/meta |
| `useMovementsLogic.ts` | 194 | `alert()` en error de Excel |

> Todos los `alert()` deberían migrarse al sistema de toasts (`BankNotifToast` o similar).

---

## 🗺️ Roadmap sugerido

```
✅ Fase 1 — Traducciones (COMPLETADA)
  └─ ProfileTab, MovementsTab, DashboardTab, StatsTab migrados al sistema t()
  └─ ~90 nuevas claves en translations.ts
  └─ Bug de routing en DashboardTab corregido
  
Fase 2 — Traducción al inglés (0.5 días)
  └─ Completar valores EN de las ~90 claves nuevas en translations.ts
  
Fase 3 — Auth Social (1 semana)
  └─ Integrar NextAuth.js con proveedor Google
  └─ Diseñar tabla accounts en Prisma
  
Fase 4 — Sessions/Devices (1 semana)
  └─ Tabla sessions con deviceName, ip, lastSeen
  └─ Endpoint DELETE /api/sessions/:id
  
Fase 5 — Foto de Perfil (2-3 días)
  └─ Elegir proveedor (Cloudflare Images o Cloudinary free tier)
  └─ Endpoint PUT /api/user/avatar
  └─ Guardar URL en tabla User de Prisma

Fase 6 — Replace alert() con toasts (medio día)
  └─ Crear hook useToast() global
  └─ Reemplazar todos los alert() listados arriba
```

---

*Generado automáticamente por auditoría de código — `gastos-app`*
