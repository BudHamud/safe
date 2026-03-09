import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '../../../../../lib/supabase-server';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedEmail) {
            return NextResponse.json({ error: 'missing_email' }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdminClient();
        const redirectTo = `${new URL(req.url).origin}/reset-password`;
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

        if (error) {
            console.error('[AUTH PASSWORD REQUEST]', error);
            return NextResponse.json({ error: 'reset_email_error' }, { status: 400 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[AUTH PASSWORD REQUEST]', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}