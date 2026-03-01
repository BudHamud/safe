import * as XLSX from 'xlsx';
import { Transaction } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];



// ─── Date helpers ─────────────────────────────────────────────────────────────

export const parseDate = (raw: string): Date => {
    if (!raw) return new Date(0);
    const cleaned = raw.toLowerCase().trim();
    if (cleaned === 'hoy') return new Date();
    if (cleaned === 'ayer') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
    }

    // Try parsing slash or dash formats
    if (raw.includes('/') || (raw.includes('-') && raw.length <= 10)) {
        const parts = raw.split(/[/-]/).map(Number);
        // Detect YYYY/MM/DD or YYYY-MM-DD (first segment > 31 → must be a year)
        if (parts[0] > 31) {
            const [year, month, day] = parts;
            return new Date(year, month - 1, day);
        }
        // DD/MM/YYYY or DD/MM/YY
        const [day, month, year] = parts;
        const safeYear = year < 100 ? 2000 + year : (year || new Date().getFullYear());
        return new Date(safeYear, month - 1, day);
    }

    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? new Date(0) : dt;
};

export const formatDate = (raw: string): string => {
    const d = parseDate(raw);
    if (d.getTime() === 0) return raw;
    return [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear(),
    ].join('/');
};

// ─── Icon lookup ──────────────────────────────────────────────────────────────

export const getTxIcon = (tx: Transaction): string => {
    // If user set an emoji, use it.
    if (tx.icon && tx.icon.length < 5) return tx.icon;
    // Otherwise, basic fallback.
    return '💳';
};

// ─── Export ───────────────────────────────────────────────────────────────────

const sanitize = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const buildExportFilename = (
    search: string,
    showFilters: boolean,
    filterMonth: number | 'all',
    filterYear: number | 'all',
): string => {
    const searchPart = search.trim() ? sanitize(search.trim()) : '';
    const monthPart = showFilters && filterMonth !== 'all' ? sanitize(MONTHS[filterMonth as number]) : '';
    const yearPart = showFilters && filterYear !== 'all' ? String(filterYear) : '';
    const periodPart = [monthPart, yearPart].filter(Boolean).join('_');
    const parts = [searchPart, periodPart].filter(Boolean);
    return parts.length > 0 ? `${parts.join('_')}.xlsx` : 'historial_movimientos.xlsx';
};

export const exportToExcel = (rows: Transaction[], filename: string, sym: string) => {
    const data = rows.map(t => ({
        Fecha: formatDate(t.date),
        Categoria: t.tag,
        Monto: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
        Descripcion: t.desc,
        Detalles: t.details ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, filename);
};

// ─── Import ───────────────────────────────────────────────────────────────────

/** Resolves an Excel column by trying multiple possible header names. */
const pickField = (row: Record<string, unknown>, candidates: string[]): string => {
    const keys = Object.keys(row);
    const normalize = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const key = keys.find(k => candidates.includes(normalize(k)));
    return key ? String(row[key]) : '';
};

export interface ImportedRow {
    desc: string; amount: number; tag: string;
    type: 'income' | 'expense'; date: string; details: string;
}

export const parseExcelRow = (row: Record<string, unknown>, fallbackYear: string, lastDate: string): { row: ImportedRow | null; resolvedDate: string } => {
    const rawMonto = pickField(row, ['monto', 'amount', 'valor', 'precio']);
    const rawDesc = pickField(row, ['descripcion', 'desc', 'concepto', 'titulo']);
    const rawCat = pickField(row, ['categoria', 'tag', 'clase']);
    const rawFecha = pickField(row, ['fecha', 'date', 'dia']);
    const rawDetails = pickField(row, ['detalles', 'details', 'notas']);

    let date = rawFecha.trim();
    if (date.match(/^\d{1,2}[/\-]\d{1,2}$/)) date = `${date}/${fallbackYear}`;
    const resolvedDate = date || lastDate;

    const amtStr = rawMonto.replace(',', '.').replace(/[^0-9.\-+]/g, '');
    const amount = amtStr ? parseFloat(amtStr.replace('+', '')) : 0;

    // Guard: skip empty rows
    if (amount === 0 && !rawDesc && !rawCat) return { row: null, resolvedDate };

    const type: 'income' | 'expense' = amtStr.includes('+') ? 'income' : 'expense';

    return {
        row: {
            desc: rawDesc || 'Importado',
            amount: Math.abs(amount),
            tag: rawCat || 'custom',
            type,
            date: resolvedDate,
            details: rawDetails || '',
        },
        resolvedDate,
    };
};
