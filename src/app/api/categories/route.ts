import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// Helper to match the frontend normalization
const normalizeTag = (tag: string) => tag.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { userId, oldTag, newTag, newIcon } = body;

        console.log("Updating category", { userId, oldTag, newTag, newIcon });

        if (!userId || !oldTag || !newTag || !newIcon) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const normalizedOldStr = normalizeTag(oldTag);

        // 1. Fetch all user transactions to manually find matches (SQLite lacks NFD support natively)
        const userTxs = await prisma.transaction.findMany({ where: { userId } });
        const idsToUpdate = userTxs
            .filter(tx => normalizeTag(tx.tag) === normalizedOldStr)
            .map(tx => tx.id);

        let count = 0;
        if (idsToUpdate.length > 0) {
            const result = await prisma.transaction.updateMany({
                where: { id: { in: idsToUpdate } },
                data: {
                    tag: newTag,
                    icon: newIcon
                }
            });
            count = result.count;
        }

        return NextResponse.json({ success: true, count });
    } catch (err) {
        console.error("PUT Error:", err);
        return NextResponse.json({ error: 'Error del servidor al actualizar categoría' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const oldTag = searchParams.get('oldTag');

    if (!userId || !oldTag) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    try {
        const normalizedOldStr = normalizeTag(oldTag);
        const userTxs = await prisma.transaction.findMany({ where: { userId } });
        const idsToUpdate = userTxs
            .filter(tx => normalizeTag(tx.tag) === normalizedOldStr)
            .map(tx => tx.id);

        let count = 0;
        if (idsToUpdate.length > 0) {
            // Soft delete: move transactions to "OTROS" category
            const result = await prisma.transaction.updateMany({
                where: { id: { in: idsToUpdate } },
                data: {
                    tag: 'OTROS',
                    icon: '❓'
                }
            });
            count = result.count;
        }

        return NextResponse.json({ success: true, count });
    } catch (err) {
        console.error("DELETE Error:", err);
        return NextResponse.json({ error: 'Error del servidor al borrar categoría' }, { status: 500 });
    }
}
