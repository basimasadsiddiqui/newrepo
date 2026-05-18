/**
 * Pricing Utility for Jewellery
 * Calculates final price based on Weight, Purity, Wastage, and Making Charges.
 */

export interface PricingItem {
    netWeight: number | string | any;
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
 * Calculate Jewellery Price.
 * @param item - The item with weights and overrides
 * @param goldRate24kPerTola - The current 24K Gold Rate per Tola (11.664g)
 */
export function calculateJewelleryPrice(
    item: PricingItem,
    goldRate24kPerTola: number
): PriceBreakdown {
    const netWeight = Number(item.netWeight);
    const purityVal = Number(item.product?.metalType?.purityValue || 0);

    const wastagePercent = Number(
        item.wastagePercent ?? item.product?.wastagePercent ?? 0
    );
    const makingCharges = Number(
        item.makingCharges ?? item.product?.makingCharges ?? 0
    );

    const GRAMS_IN_TOLA = 11.664;
    const ratePerGram24k = goldRate24kPerTola / GRAMS_IN_TOLA;
    const metalRatePerGram = ratePerGram24k * (purityVal / 100);
    const metalValue = netWeight * metalRatePerGram;
    const wastageAmount = metalValue * (wastagePercent / 100);
    const total = metalValue + wastageAmount + makingCharges;

    return {
        finalPrice: Math.round(total),
        metalValue: Number(metalValue.toFixed(2)),
        wastageAmount: Number(wastageAmount.toFixed(2)),
        makingCharges: Number(makingCharges.toFixed(2)),
        goldRateUsed: goldRate24kPerTola,
    };
}
