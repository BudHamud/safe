import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, requireAuth } from '../../../lib/supabase-server';

export async function GET(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const supabaseAdmin = createSupabaseAdminClient();

    try {
        const { data: profile } = await supabaseAdmin
            .from('User').select('id, username, monthlyGoal').eq('authId', user.id).maybeSingle();
        if (!profile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        return NextResponse.json({ ...profile, email: user.email ?? null });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const supabaseAdmin = createSupabaseAdminClient();

    try {
        const { monthlyGoal } = await req.json();

        const { data: updated } = await supabaseAdmin
            .from('User').update({ monthlyGoal: parseFloat(monthlyGoal) })
            .eq('authId', user.id).select('id, username, monthlyGoal').single();
        return NextResponse.json(updated);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const supabaseAdmin = createSupabaseAdminClient();

    try {
        const { data: profile } = await supabaseAdmin
            .from('User')
            .select('id, authId')
            .eq('authId', user.id)
            .maybeSingle();

        if (!profile) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        await Promise.all([
            supabaseAdmin.from('Transaction').delete().eq('userId', profile.id),
            supabaseAdmin.from('ScanUsage').delete().eq('userId', profile.id),
            supabaseAdmin.from('PendingNotification').delete().eq('userId', profile.id),
        ]);

        const { error: deleteProfileError } = await supabaseAdmin
            .from('User')
            .delete()
            .eq('id', profile.id);

        if (deleteProfileError) {
            return NextResponse.json({ error: deleteProfileError.message }, { status: 500 });
        }

        if (profile.authId) {
            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(profile.authId);
            if (deleteAuthError) {
                console.error('[USER DELETE] auth delete error:', deleteAuthError);
                return NextResponse.json({ error: 'La cuenta local fue eliminada, pero falló el borrado del acceso autenticado.' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
