import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSupabaseAdminClient } from '../../../lib/supabase-server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const supabaseAdmin = createSupabaseAdminClient();
        const { username, email, password, monthlyGoal, action } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
        }

        if (action === 'register' && !email) {
            return NextResponse.json({ error: 'Falta el email' }, { status: 400 });
        }

        const normalizedUsername = String(username).trim();
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const parsedGoal = Number(monthlyGoal);
        const nextMonthlyGoal = Number.isFinite(parsedGoal) && parsedGoal > 0 ? parsedGoal : 0;

        // Convertir username en email interno para Supabase Auth
        // Esto mantiene compatibilidad con el sistema de usernames existente
        const internalEmail = `${normalizedUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}@gastosapp.internal`;

        if (action === 'register') {
            // PASO 0: Verificar si el usuario ya existe
            const { data: existing, error: existingError } = await supabaseAdmin
                .from('User').select('id').eq('username', normalizedUsername).maybeSingle();
            if (existingError) {
                console.error('[AUTH REGISTER] PASO 0 - Error al consultar tabla User:', existingError);
                return NextResponse.json({ error: `[PASO 0] ${existingError.message}` }, { status: 500 });
            }
            if (existing) {
                return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
            }

            // PASO 1: Crear usuario en Supabase Auth
            console.log('[AUTH REGISTER] PASO 1 - Creando usuario en Supabase Auth:', normalizedEmail);
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                password,
                email_confirm: true,
            });

            if (authError || !authData.user) {
                console.error('[AUTH REGISTER] PASO 1 FALLÓ - authError:', authError);
                return NextResponse.json({ error: `[PASO 1] ${authError?.message ?? 'Error creando usuario en Auth'}` }, { status: 400 });
            }
            console.log('[AUTH REGISTER] PASO 1 OK - auth.user.id:', authData.user.id);

            // PASO 2: Crear perfil en tabla User
            // NOTA: Se pasa el id explícitamente porque la columna en Supabase no tiene DEFAULT configurado.
            // Esto ocurre cuando Prisma nunca corrió las migraciones contra la DB (que añade gen_random_uuid()).
            console.log('[AUTH REGISTER] PASO 2 - Insertando perfil en tabla User...');
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUserId = randomUUID();
            const { data: newUser, error: createError } = await supabaseAdmin
                .from('User')
                .insert({ id: newUserId, username: normalizedUsername, password: hashedPassword, authId: authData.user.id, monthlyGoal: nextMonthlyGoal })
                .select('id, username, monthlyGoal')
                .single();

            if (createError || !newUser) {
                console.error('[AUTH REGISTER] PASO 2 FALLÓ - createError:', createError);
                // Limpiar el usuario de Auth si la inserción en tabla falló
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => { });
                return NextResponse.json({ error: `[PASO 2] ${createError?.message ?? 'Error creando perfil de usuario'}` }, { status: 500 });
            }
            console.log('[AUTH REGISTER] PASO 2 OK - newUser.id:', newUser.id);

            // PASO 3: Sign-in para obtener el JWT real
            console.log('[AUTH REGISTER] PASO 3 - signInWithPassword...');
            const { data: signIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (signInError) {
                console.error('[AUTH REGISTER] PASO 3 FALLÓ (no crítico) - signInError:', signInError);
            }

            return NextResponse.json({
                id: newUser.id,
                username: newUser.username,
                monthlyGoal: newUser.monthlyGoal,
                access_token: signIn?.session?.access_token ?? null,
                refresh_token: signIn?.session?.refresh_token ?? null,
            });
        }

        if (action === 'login') {
            const { data: user } = await supabaseAdmin
                .from('User').select('id, username, password, monthlyGoal, authId').eq('username', normalizedUsername).maybeSingle();

            if (!user) {
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            let authEmail = internalEmail;

            if (user.authId) {
                const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(user.authId);
                authEmail = authUserData?.user?.email || internalEmail;
            }

            let passwordValid: boolean;

            if (user.authId) {
                // Usuario con Supabase Auth — verificar contraseña directamente contra Supabase.
                // Esto cubre casos donde el campo password es un placeholder (ej: creado via script).
                const { error: signInCheckError } = await supabaseAdmin.auth.signInWithPassword({
                    email: authEmail,
                    password,
                });
                passwordValid = !signInCheckError;
            } else if (user.password.startsWith('$2')) {
                // Usuario con hash bcrypt (registrado via app)
                passwordValid = await bcrypt.compare(password, user.password);
            } else {
                // Usuario legacy con contraseña en texto plano — verificar y migrar
                passwordValid = user.password === password;
                if (passwordValid) {
                    const hashed = await bcrypt.hash(password, 12);
                    await supabaseAdmin.from('User').update({ password: hashed }).eq('id', user.id);
                }
            }

            if (!passwordValid) {
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }

            // Si no tiene authId aún (usuario legacy con password válido), crearlo en Supabase
            if (!user.authId) {
                const { data: authData } = await supabaseAdmin.auth.admin.createUser({
                    email: internalEmail,
                    password,
                    email_confirm: true,
                });
                if (authData?.user) {
                    await supabaseAdmin.from('User').update({ authId: authData.user.id }).eq('id', user.id);
                }
            }

            // Obtener JWT real de Supabase
            const { data: signIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                email: authEmail,
                password,
            });

            if (signInError || !signIn?.session) {
                // Fallback: si Supabase falla, aún retornamos datos básicos (temporal)
                console.error('Supabase signIn error:', signInError);
                return NextResponse.json({ id: user.id, username: user.username, monthlyGoal: user.monthlyGoal });
            }

            return NextResponse.json({
                id: user.id,
                username: user.username,
                monthlyGoal: user.monthlyGoal,
                access_token: signIn.session.access_token,
                refresh_token: signIn.session.refresh_token,
            });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[AUTH GLOBAL CATCH]', message, err);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? `[CATCH] ${message}` : 'Error del servidor' },
            { status: 500 }
        );
    }
}
