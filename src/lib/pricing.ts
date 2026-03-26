/**
 * Pricing Utility for Jewellery
 * Calculates final price based on Weight, Purity, Wastage, and Making Charges.
 */

// Interface for the item passed to calculation
// Can be InventoryItem or InvoiceItem structure
export interface PricingItem {
    netWeight: number | string | any; // Decimal or number
    wastagePercent?: number | string | any;
    makingCharges?: number | string | any;
    product?: {
        makingCharges?: number | string | any;
        wastagePercent?: number | string | any;
        metalType?: {
            purityValue?: number | string | any;
        };
    };
}

export interface PriceBreakdown {
    finalPrice: number;
    metalValue: number;
    wastageAmount: number;
    makingCharges: number;
    goldRateUsed: number;
}

/**
 * Calculate Jewellery Price
 * @param item - The item with weights and overrides
 * @param goldRate24kPerTola - The current 24K Gold Rate (per Tola = 11.664g usually, or per 10g?) 
 *                            NOTE: In Pakistan/India, Tola = 11.664g. 
 *                            If the rate input is per 10g, adjust logic.
 *                            Let's assume input is PER TOLA for now as is common in PK.
 */
export function calculateJewelleryPrice(
    item: PricingItem,
    goldRate24kPerTola: number
): PriceBreakdown {

    // 1. Resolve values (Handle Decimal/String/Number)
    const netWeight = Number(item.netWeight);
    const purityVal = Number(item.product?.metalType?.purityValue || 0);

    // Inherit overrides or use product defaults
    const wastagePercent = Number(
        item.wastagePercent ?? item.product?.wastagePercent ?? 0
    );
    const makingCharges = Number(
        item.makingCharges ?? item.product?.makingCharges ?? 0
    );

    // 2. Calculate Gold Rate per Gram
    // 1 Tola = 11.664 Grams
    const GRAMS_IN_TOLA = 11.664;
    const ratePerGram24k = goldRate24kPerTola / GRAMS_IN_TOLA;

    // 3. Calculate Metal Value
    // Formula: NetWeight * (Rate24k/g) * (Purity/100)
    const metalRatePerGram = ratePerGram24k * (purityVal / 100);
    const metalValue = netWeight * metalRatePerGram;

    // 4. Calculate Wastage
    // Wastage is usually % of Metal Value (or Weight?)
    // Requirement: "const wastageValue = metalValue * (wastagePercent / 100)"
    const wastageAmount = metalValue * (wastagePercent / 100);

    // 5. Total
    const total = metalValue + wastageAmount + makingCharges;

    return {
        finalPrice: Math.round(total),
        metalValue: Number(metalValue.toFixed(2)),
        wastageAmount: Number(wastageAmount.toFixed(2)),
        makingCharges: Number(makingCharges.toFixed(2)),
        goldRateUsed: goldRate24kPerTola
    };
}
