const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany();
    console.log(`Encontradas ${transactions.length} transacciones. Asumiendo monto actual como ILS...`);

    for (const tx of transactions) {
        // Parse year and month from start of date
        const dateStr = tx.date;
        const yearMatch = dateStr.match(/\b(20\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

        // Simular tasas al 1ro del mes
        // O usar tasas en vivo fijas para la prueba
        let usdRate = 3.65; // 1 USD = 3.65 ILS
        let eurRate = 4.0;  // 1 EUR = 4.0 ILS
        let arsRate = 0.0035; // 1 ARS = 0.0035 ILS (approx 1 USD = 1050 ARS => 1050/3.65)

        try {
            // Test fetch current just to populate with realistic numbers
            const resILS = await fetch('https://open.er-api.com/v6/latest/ILS');
            const dataILS = await resILS.json();
            if (dataILS && dataILS.rates) {
                usdRate = 1 / dataILS.rates.USD;
                eurRate = 1 / dataILS.rates.EUR;
            }
        } catch (e) {
            console.log("Error fetching ILS rates, using fallback.");
        }

        try {
            // Fetch USD to ARS current
            const resARS = await fetch('https://dolarapi.com/v1/dolares/blue');
            const dataARS = await resARS.json();
            if (dataARS && dataARS.venta) {
                arsRate = usdRate / dataARS.venta; // ILS per ARS
            }
        } catch (e) {
            console.log("Error fetching ARS rates, using fallback");
        }

        const amountILS = tx.amount;
        // Si el valor cargado era ILS:
        const amountUSD = amountILS / usdRate;
        const amountEUR = amountILS / eurRate;
        const amountARS = amountILS / arsRate;

        await prisma.transaction.update({
            where: { id: tx.id },
            data: {
                amountILS,
                amountUSD,
                amountEUR,
                amountARS
            }
        });
        console.log(`Actualizado ${tx.id} -> ILS:${amountILS.toFixed(2)} | USD:${amountUSD.toFixed(2)} | EUR:${amountEUR.toFixed(2)} | ARS:${amountARS.toFixed(2)}`);
    }

    console.log("Backfill completado.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
