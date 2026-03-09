import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, requireAuth } from '../../../../../lib/supabase-server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
        }

        const { newEmail } = await req.json();
        const normalizedEmail = typeof newEmail === 'string' ? newEmail.trim().toLowerCase() : '';

        if (!normalizedEmail) {
            return NextResponse.json({ error: 'missing_email' }, { status: 400 });
        }

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
        }

        if ((auth.user.email || '').toLowerCase() === normalizedEmail) {
            return NextResponse.json({ error: 'same_email' }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdminClient();
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
            email: normalizedEmail,
        });

        if (error) {
            console.error('[AUTH EMAIL CHANGE]', error);
            return NextResponse.json({ error: 'update_email_error' }, { status: 400 });
        }

        return NextResponse.json({ email: data.user?.email ?? normalizedEmail });
    } catch (error) {
        console.error('[AUTH EMAIL CHANGE]', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}