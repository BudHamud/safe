import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { requireAuth } from '../../../lib/supabase-server';

const normalizeTag = (tag: string) => tag.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function resolveUserId(authId: string) {
    const user = await prisma.user.findFirst({ where: { authId }, select: { id: true } });
    return user?.id ?? null;
}

export async function PUT(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    try {
        const { oldTag, newTag, newIcon } = await req.json();

        if (!oldTag || !newTag || !newIcon) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const normalizedOldStr = normalizeTag(oldTag);
        const userTxs = await prisma.transaction.findMany({ where: { userId } });
        const idsToUpdate = userTxs
            .filter(tx => normalizeTag(tx.tag) === normalizedOldStr)
            .map(tx => tx.id);

        let count = 0;
        if (idsToUpdate.length > 0) {
            const result = await prisma.transaction.updateMany({
                where: { id: { in: idsToUpdate } },
                data: { tag: newTag, icon: newIcon }
            });
            count = result.count;
        }

        return NextResponse.json({ success: true, count });
    } catch (err) {
        console.error('PUT Error:', err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { user, error, status } = await requireAuth(req);
    if (!user) return NextResponse.json({ error }, { status });

    const userId = await resolveUserId(user.id);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const oldTag = searchParams.get('oldTag');
    if (!oldTag) return NextResponse.json({ error: 'Falta oldTag' }, { status: 400 });

    try {
        const normalizedOldStr = normalizeTag(oldTag);
        const userTxs = await prisma.transaction.findMany({ where: { userId } });
        const idsToUpdate = userTxs
            .filter(tx => normalizeTag(tx.tag) === normalizedOldStr)
            .map(tx => tx.id);

        let count = 0;
        if (idsToUpdate.length > 0) {
            const result = await prisma.transaction.updateMany({
                where: { id: { in: idsToUpdate } },
                data: { tag: 'OTROS', icon: '\u2753' }
            });
            count = result.count;
        }

        return NextResponse.json({ success: true, count });
    } catch (err) {
        console.error('DELETE Error:', err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

