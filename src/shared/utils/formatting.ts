/**
 * Format a number as Pakistani Rupee (PKR).
 * e.g. 123456.78 -> "123,456.78"
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a number as Pakistani Rupee (PKR) with no decimal places.
 * e.g. 123456.78 -> "123,457"
 */
export function formatCurrencyWhole(amount: number): string {
    return new Intl.NumberFormat("en-PK", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format a weight value (e.g. grams).
 * e.g. 12.3456 -> "12.346"
 */
export function formatWeight(weight: number): string {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
    }).format(weight);
}

/**
 * Format a Date object or ISO string to a human-readable date.
 * e.g. "2024-03-15" -> "15 Mar 2024"
 */
export function formatDate(dateInput: Date | string): string {
    if (!dateInput) return "N/A";
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}
