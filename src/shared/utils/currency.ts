/**
 * ============================================================================
 * Currency helpers
 * ============================================================================
 * The app stores all monetary values in PKR (base currency). On purchase
 * invoices the user may enter amounts in a foreign currency (e.g. AED); those
 * are converted to PKR at the persistence boundary using the Conv. Rate
 * (PKR per 1 unit of foreign currency).
 *
 *   pkr     = foreignAmount × convRate     (toBaseCurrency)
 *   foreign = pkrAmount     ÷ convRate     (fromBaseCurrency)
 *
 * Display only ever swaps the symbol + (optionally) converts the number; it
 * never changes what is stored.
 * ============================================================================
 */

/** Symbol shown in front of an amount for each supported currency code. */
const CURRENCY_SYMBOLS: Record<string, string> = {
    PKR: "Rs.",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
};

/** Returns the display symbol for a currency code (falls back to the code itself). */
export function getCurrencySymbol(currency?: string | null): string {
    if (!currency) return CURRENCY_SYMBOLS.PKR;
    return CURRENCY_SYMBOLS[currency] ?? currency;
}

/** Convert a foreign-currency amount to the PKR base. convRate = PKR per 1 foreign unit. */
export function toBaseCurrency(foreignAmount: number, convRate: number): number {
    const rate = Number(convRate);
    if (!rate || rate <= 0) return foreignAmount;
    return foreignAmount * rate;
}

/** Convert a PKR base amount back to the selected foreign currency for display/editing. */
export function fromBaseCurrency(pkrAmount: number, convRate: number): number {
    const rate = Number(convRate);
    if (!rate || rate <= 0) return pkrAmount;
    return pkrAmount / rate;
}

/** Monetary header fields on an invoice payload (entered in foreign, stored in PKR). */
const MONEY_HEADER_FIELDS = ["goldRate", "polishRate", "labourRate", "otherCharges", "discount", "cashReceived"] as const;
/** Monetary per-line-item fields. NOTE: goldReceived/kaatRate/pasaRate/*Weight are NOT money. */
const MONEY_ITEM_FIELDS = ["stoneRate", "stoneAmount", "beadsAmount", "diamondAmount", "goldAmount", "labourAmount", "polishAmount", "totalAmount"] as const;

/**
 * Mutates an invoice request body in place, converting every monetary field from
 * the entered foreign currency to the PKR base (× Conv.Rate). No-op when the
 * currency is PKR or the rate is missing/≤0. Weight and percent fields are left
 * untouched. Used at the API persistence boundary so all downstream logic is PKR.
 */
export function convertInvoiceBodyToPkr(body: Record<string, unknown>): void {
    const currency = typeof body.currency === "string" ? body.currency : "PKR";
    const rate = Number(body.currencyRate);
    if (currency === "PKR" || !rate || rate <= 0 || rate === 1) return;

    for (const f of MONEY_HEADER_FIELDS) {
        if (typeof body[f] === "number") body[f] = (body[f] as number) * rate;
    }
    if (Array.isArray(body.items)) {
        for (const item of body.items as Array<Record<string, unknown>>) {
            for (const f of MONEY_ITEM_FIELDS) {
                if (typeof item[f] === "number") item[f] = (item[f] as number) * rate;
            }
        }
    }
}

/**
 * Format an amount (already in the *display* currency) with its symbol.
 * e.g. formatMoney(100, "AED") -> "د.إ 100.00"
 */
export function formatMoney(amount: number, currency?: string | null): string {
    const formatted = new Intl.NumberFormat("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
    return `${getCurrencySymbol(currency)} ${formatted}`;
}
