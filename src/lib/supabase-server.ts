import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client — bypasea RLS, solo usar en server-side
// NUNCA exponer al cliente
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// Verifica el JWT del usuario y retorna el user autenticado
// Lanza un error si el token es inválido o expiró
export async function requireAuth(req: Request) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return { user: null, error: 'No autorizado: falta token', status: 401 };
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
        return { user: null, error: 'Token inválido o expirado', status: 401 };
    }

    return { user, error: null, status: 200 };
}
