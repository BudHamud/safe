import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin, requireAuth } from '../../../lib/supabase-server';

// Helper: obtener userId interno a partir del authId de Supabase
async function resolveUserId(authId: string): Promise<string | null> {
    const { data: user } = await supabaseAdmin
        .from('User').select('id').eq('authId', authId).maybeSingle();
    return user?.id ?? null;
}

export async function GET(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const { data: transactions } = await supabaseAdmin
            .from('Transaction').select('*').eq('userId', userId).order('createdAt', { ascending: false });
        return NextResponse.json(transactions ?? []);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const data = await req.json();

        // Batch import
        if (Array.isArray(data)) {
            if (data.length === 0) return NextResponse.json({ count: 0 });
            const rows = data.map((d: any) => ({
                id: randomUUID(),
                desc: d.desc ?? 'Importado',
                amount: parseFloat(d.amount),
                amountUSD: d.amountUSD ? parseFloat(d.amountUSD) : null,
                amountARS: d.amountARS ? parseFloat(d.amountARS) : null,
                amountILS: d.amountILS ? parseFloat(d.amountILS) : null,
                amountEUR: d.amountEUR ? parseFloat(d.amountEUR) : null,
                tag: d.tag ?? 'custom',
                type: d.type,
                date: d.date,
                icon: d.icon ?? '\ud83d\udcb3',
                details: d.details ?? '',
                excludeFromBudget: !!d.excludeFromBudget,
                goalType: d.goalType ?? 'unico',
                isCancelled: !!d.isCancelled,
                periodicity: d.periodicity ? parseInt(d.periodicity) : null,
                paymentMethod: d.paymentMethod ?? null,
                cardDigits: d.cardDigits ?? null,
                userId,
            }));
            await supabaseAdmin.from('Transaction').insert(rows);
            return NextResponse.json({ count: data.length });
        }

        // Single transaction
        const { desc, amount, amountUSD, amountARS, amountILS, amountEUR, tag, type, date, icon, details, goalType, isCancelled, periodicity, paymentMethod, cardDigits } = data;
        if (!amount) return NextResponse.json({ error: 'Falta monto' }, { status: 400 });

        const { data: tx, error: insertError } = await supabaseAdmin.from('Transaction').insert({
            id: randomUUID(),
            desc, amount: parseFloat(amount),
            amountUSD: amountUSD ? parseFloat(amountUSD) : null,
            amountARS: amountARS ? parseFloat(amountARS) : null,
            amountILS: amountILS ? parseFloat(amountILS) : null,
            amountEUR: amountEUR ? parseFloat(amountEUR) : null,
            tag, type, date, icon, details,
            excludeFromBudget: !!data.excludeFromBudget,
            goalType: data.goalType || 'unico',
            isCancelled: !!isCancelled,
            periodicity: periodicity ? parseInt(periodicity) : null,
            paymentMethod: paymentMethod || null,
            cardDigits: cardDigits || null,
            userId,
        }).select().single();
        if (insertError || !tx) {
            console.error('[TRANSACTIONS POST] insert error:', insertError);
            return NextResponse.json({ error: insertError?.message ?? 'Error guardando transacción' }, { status: 500 });
        }
        return NextResponse.json(tx);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    try {
        if (id === 'all') {
            await supabaseAdmin.from('Transaction').delete().eq('userId', userId);
        } else {
            // Verificar ownership antes de borrar (previene IDOR)
            const { data: tx } = await supabaseAdmin
                .from('Transaction').select('id').eq('id', id).eq('userId', userId).maybeSingle();
            if (!tx) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
            await supabaseAdmin.from('Transaction').delete().eq('id', id);
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const data = await req.json();
        const { id, desc, amount, amountUSD, amountARS, amountILS, amountEUR, tag, type, date, icon, details, goalType, isCancelled, periodicity, paymentMethod, cardDigits } = data;
        if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

        // Verificar que la transacción pertenece al usuario (previene IDOR)
        const { data: existing } = await supabaseAdmin
            .from('Transaction').select('id').eq('id', id).eq('userId', userId).maybeSingle();
        if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

        const { data: tx } = await supabaseAdmin.from('Transaction').update({
            desc, amount: parseFloat(amount),
            amountUSD: amountUSD !== undefined ? (amountUSD ? parseFloat(amountUSD) : null) : undefined,
            amountARS: amountARS !== undefined ? (amountARS ? parseFloat(amountARS) : null) : undefined,
            amountILS: amountILS !== undefined ? (amountILS ? parseFloat(amountILS) : null) : undefined,
            amountEUR: amountEUR !== undefined ? (amountEUR ? parseFloat(amountEUR) : null) : undefined,
            tag, type, date, icon, details,
            excludeFromBudget: data.excludeFromBudget !== undefined ? !!data.excludeFromBudget : undefined,
            goalType: data.goalType !== undefined ? data.goalType : undefined,
            isCancelled: isCancelled !== undefined ? !!isCancelled : undefined,
            periodicity: periodicity !== undefined ? (periodicity ? parseInt(periodicity) : null) : undefined,
            paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined,
            cardDigits: cardDigits !== undefined ? cardDigits : undefined,
        }).eq('id', id).select().single();
        return NextResponse.json(tx);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

