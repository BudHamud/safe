import { NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '../../../lib/supabase-server';

export async function GET(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        const { data: profile } = await supabaseAdmin
            .from('User').select('id, username, monthlyGoal').eq('authId', user.id).maybeSingle();
        if (!profile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        return NextResponse.json(profile);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

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
