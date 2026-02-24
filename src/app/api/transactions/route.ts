import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(transactions);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const { desc, amount, amountUSD, amountARS, amountILS, amountEUR, tag, type, date, icon, details, userId, goalType, isCancelled, periodicity, paymentMethod, cardDigits } = data;

        if (!userId || !amount) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const tx = await prisma.transaction.create({
            data: {
                desc,
                amount: parseFloat(amount),
                amountUSD: amountUSD ? parseFloat(amountUSD) : null,
                amountARS: amountARS ? parseFloat(amountARS) : null,
                amountILS: amountILS ? parseFloat(amountILS) : null,
                amountEUR: amountEUR ? parseFloat(amountEUR) : null,
                tag,
                type,
                date,
                icon,
                details,
                excludeFromBudget: !!data.excludeFromBudget,
                goalType: data.goalType || "unico",
                isCancelled: !!isCancelled,
                periodicity: periodicity ? parseInt(periodicity) : null,
                paymentMethod: paymentMethod || null,
                cardDigits: cardDigits || null,
                userId
            }
        });

        return NextResponse.json(tx);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    try {
        // Enforce that the transaction belongs to the user
        await prisma.transaction.delete({
            where: {
                id: id,
            }
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor al borrar' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const data = await req.json();
        const { id, desc, amount, amountUSD, amountARS, amountILS, amountEUR, tag, type, date, icon, details, userId, goalType, isCancelled, periodicity, paymentMethod, cardDigits } = data;

        if (!id || !userId) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const tx = await prisma.transaction.update({
            where: { id },
            data: {
                desc,
                amount: parseFloat(amount),
                amountUSD: amountUSD !== undefined ? (amountUSD ? parseFloat(amountUSD) : null) : undefined,
                amountARS: amountARS !== undefined ? (amountARS ? parseFloat(amountARS) : null) : undefined,
                amountILS: amountILS !== undefined ? (amountILS ? parseFloat(amountILS) : null) : undefined,
                amountEUR: amountEUR !== undefined ? (amountEUR ? parseFloat(amountEUR) : null) : undefined,
                tag,
                type,
                date,
                icon,
                details,
                excludeFromBudget: data.excludeFromBudget !== undefined ? !!data.excludeFromBudget : undefined,
                goalType: data.goalType !== undefined ? data.goalType : undefined,
                isCancelled: isCancelled !== undefined ? !!isCancelled : undefined,
                periodicity: periodicity !== undefined ? (periodicity ? parseInt(periodicity) : null) : undefined,
                paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined,
                cardDigits: cardDigits !== undefined ? cardDigits : undefined
            }
        });

        return NextResponse.json(tx);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor al actualizar' }, { status: 500 });
    }
}
