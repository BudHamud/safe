import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(req: Request) {
    try {
        const { username, password, action } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
        }

        if (action === 'register') {
            const exists = await prisma.user.findUnique({ where: { username } });
            if (exists) {
                return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
            }

            const newUser = await prisma.user.create({
                data: { username, password }
            });
            return NextResponse.json({ id: newUser.id, username: newUser.username, monthlyGoal: newUser.monthlyGoal });
        }

        if (action === 'login') {
            const user = await prisma.user.findUnique({ where: { username } });
            if (!user || user.password !== password) {
                return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
            }
            return NextResponse.json({ id: user.id, username: user.username, monthlyGoal: user.monthlyGoal });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
