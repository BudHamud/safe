import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

/**
 * Placeholder for Bank Notifications Webhook
 * This endpoint will receive notifications from external bank services
 * and automatically create transaction records.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, amount, desc, tag, type, bankSource } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Logic to parse different bank formats
        // Example: Mercado Pago vs Brubank
        console.log(`Received notification from ${bankSource}: ${amount} ${type}`);

        const { data: transaction } = await supabaseAdmin
            .from('Transaction')
            .insert({
                desc: `[AUTO] ${desc || 'Gasto Bancario'}`,
                amount: parseFloat(amount),
                tag: tag || 'otros',
                type: type || 'expense',
                date: new Date().toISOString().split('T')[0],
                icon: '🏦',
                details: `Notificación automática de ${bankSource || 'Banco Vinculado'}`,
                userId
            }).select().single();

        return NextResponse.json(transaction);
    } catch (error) {
        console.error('Error processing bank notification:', error);
        return NextResponse.json({ error: 'Failed to process notification' }, { status: 500 });
    }
}
