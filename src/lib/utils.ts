export const formatCurrency = (val: number, sym: string) => {
    // Truncate to 2 decimals as requested (8.526 -> 8.52)
    // Using a small epsilon to avoid floating point issues like 1.0000000001
    const truncated = Math.floor((val + 0.00000001) * 100) / 100;
    return `${sym}${truncated.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};

export const getCategoryIcon = (tag: string) => {
    // Only a generic fallback. User choices are stored in the DB.
    return '💳';
};
