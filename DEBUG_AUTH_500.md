# Debug: POST /api/auth 500 al registrar usuario

## Estado actual
- Ruta: `src/app/api/auth/route.ts`
- Error: HTTP 500 al llamar `action: "register"`
- Tiempo de respuesta: ~3.3s (lento → sugiere que llega a Supabase antes de fallar)

---

## Archivos relevantes revisados

| Archivo | Relevancia |
|---|---|
| `src/app/api/auth/route.ts` | Handler principal — flujo de register y login |
| `src/lib/supabase-server.ts` | Crea `supabaseAdmin` con service role key |
| `.env` | Variables de entorno — hay un dato sospechoso (ver abajo) |
| `prisma/schema.prisma` | Define modelo `User` con campo `authId` |
| `prisma/generated/` | **VACÍA** — Prisma Client no fue generado |

---

## Hallazgos / Sospechosos

### 1. NEXT_PUBLIC_SUPABASE_ANON_KEY tiene formato nuevo (`sb_publishable_*`)

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_wJiHmkEmFJPlXHYoVbo5VA_raSgcn2B
```

- Este es el **nuevo formato de Supabase** (post-2025). No es un JWT.
- `supabase-js` v2 internamente puede intentar decodificarlo como JWT para extraer el `sub` u otras claims. Si falla silenciosamente, el cliente queda mal inicializado.
- El `supabaseAdmin` usa `SUPABASE_SERVICE_ROLE_KEY` (JWT `eyJ...`) que **sí es correcto**.
- **Riesgo**: si algún middleware o código cliente usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` para crear un cliente adicional, podría fallar.

### 2. Carpeta `prisma/generated/` está VACÍA

```
prisma/generated/   ← vacío
```

- `package.json` tiene `"postinstall": "prisma generate"`.
- Si Prisma Client nunca se generó, cualquier import de `@prisma/client` que llegue al server-side lanzaría un error.
- **Sin embargo**: `auth/route.ts` no importa `prisma` directamente — usa `supabaseAdmin` vía SDK. Esto podría no ser el problema directo aquí, pero podría romper otros imports si hay barrel files.

### 3. El 500 no loguea el error específico

El catch en `route.ts`:
```ts
} catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
}
```

El servidor sí hace `console.error(err)` — **el error real está en los logs del servidor Next.js** (terminal donde corre `npm run dev`).

### 4. Flujo de register tiene múltiples puntos de falla en cadena

```
1. supabaseAdmin.from('User').select() → chequear si existe        ← puede fallar
2. supabaseAdmin.auth.admin.createUser()                            ← puede fallar
3. bcrypt.hash()                                                    ← poco probable
4. supabaseAdmin.from('User').insert({ ..., authId: ... })         ← puede fallar (tabla/columnas)
5. supabaseAdmin.auth.signInWithPassword()                          ← puede fallar
```

### 5. Posible problema de casing en tabla `User`

Supabase/PostgreSQL es case-sensitive en nombres de tablas con comillas. Si la tabla se creó como `user` (minúscula) pero el código consulta `.from('User')` (mayúscula), las queries sillan sin error visible pero el insert podría comportarse distinto.

---

## Roadmap de investigación

### Paso 1 — Leer logs del servidor (CRÍTICO)
> Ver la consola donde corre `npm run dev` mientras se dispara el POST.
> El `catch (err)` hace `console.error(err)` — el error real está ahí.

### Paso 2 — Verificar que la tabla existe en Supabase y tiene las columnas correctas
- Ir al Dashboard de Supabase → Table Editor
- Confirmar que existe tabla `User` (o `user`) con columnas:
  - `id` (text/uuid)
  - `username` (text, unique)
  - `password` (text)
  - `authId` (text, nullable, unique)
  - `role` (text)
  - `monthlyGoal` (float)
  - `createdAt` (timestamptz)

### Paso 3 — Probar Supabase Admin directamente
Ejecutar en Node o en un script temporal:
```ts
import { createClient } from '@supabase/supabase-js';
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.auth.admin.createUser({ email: 'test@test.internal', password: 'Test1234!', email_confirm: true });
console.log(data, error);
```

### Paso 4 — Verificar que `SUPABASE_SERVICE_ROLE_KEY` es válida
- Ir a Supabase Dashboard → Project Settings → API
- Confirmar que la `service_role` key en `.env` coincide con la actual del proyecto
- El JWT tiene `exp: 2086162138` (año 2036) → no está expirada

### Paso 5 — Regenerar Prisma Client
```bash
npx prisma generate
```
Aunque auth no importa Prisma directamente, otros imports podrían estar rompiéndose al compilar.

### Paso 6 — Agregar mejor logging en el route
Reemplazar el catch genérico por uno que exponga el mensaje en dev:
```ts
} catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AUTH REGISTER ERROR]', message);
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? message : 'Error del servidor' }, { status: 500 });
}
```

---

## Hipótesis más probable

**La tabla `User` no existe en Supabase** o **el schema fue sincronizado con Prisma pero `prisma migrate` nunca se corrió contra la base de datos de producción/development.**

El insert falla → `createError` es truthy → retorna 500 desde:
```ts
if (createError || !newUser) {
    return NextResponse.json({ error: 'Error creando perfil de usuario' }, { status: 500 });
}
```

Esto daría un 500 con respuesta `{ error: 'Error creando perfil de usuario' }` — no un throw, sino un return controlado.

Pero si la primera query `.from('User').select()` también falla con una excepción, caería en el `catch` global.

---

## Próximos pasos inmediatos

1. **Abrir la terminal del servidor y buscar el `console.error` que se imprimió**
2. **Confirmar existencia de la tabla en Supabase Dashboard**
3. Si la tabla no existe: correr `npx prisma db push` para sincronizar schema
4. Si la tabla existe: revisar si RLS (Row Level Security) está bloqueando las inserts del service role (no debería, pero vale revisar)
