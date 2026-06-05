/**
 * ============================================================================
 * CALCULATION ENGINE – Invoice Module
 * ============================================================================
 * PURE FUNCTIONS for all jewellery business calculations.
 * Uses decimal.js to avoid floating-point precision errors.
 *
 * KEY CONCEPTS:
 * - 1 Tola = 11.664 grams (standard Pakistani tola)
 * - Karat: purity measure (24 = pure gold)
 * - Ratti: impurity measure = (24 - Karat) × 4
 * - Adjusted Gold Weight: weight normalized to invoice carat purity
 * - Pasa: a deduction percentage applied to the gold rate
 * ============================================================================
 */

import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/** 1 Kacha Tola = 11.664 grams — used for gold rate calculations */
const GRAMS_PER_TOLA = new Decimal("11.664");

/** Pakka Tola = 12.150 grams (Pakistani market standard) */
export const PAKKA_TOLA_GRAMS = 12.150;
/** Kacha Tola = 11.664 grams */
export const KACHA_TOLA_GRAMS = 11.664;

export function gramsToPakkaTola(grams: number): number {
    return new Decimal(grams).div(PAKKA_TOLA_GRAMS).toDecimalPlaces(4).toNumber();
}

export function gramsToKachaTola(grams: number): number {
    return new Decimal(grams).div(KACHA_TOLA_GRAMS).toDecimalPlaces(4).toNumber();
}

// ─── Karat ↔ Ratti Conversion ──────────────────────────────────

export function karatToRatti(karat: number): number {
    const result = new Decimal(24).minus(karat).times(4);
    return result.toDecimalPlaces(4).toNumber();
}

export function rattiToKarat(ratti: number): number {
    const result = new Decimal(24).minus(new Decimal(ratti).div(4));
    return result.toDecimalPlaces(4).toNumber();
}

/** Supported basis types for Labour calculation */
export type LabourBasis = "Per Tola" | "Per Gram" | "Per Piece" | "Lump Sum" | "Fixed";

/** Supported basis types for Kaat calculation */
export type KaatBasis = "Ratti Kaat" | "Direct Weight";

// ─── Gold Weight Calculations ──────────────────────────────────

export function calcAdjustedGoldWeight(
    estimatedWeight: number,
    carat: number
): number {
    const result = new Decimal(estimatedWeight).times(new Decimal(carat).div(24));
    return result.toDecimalPlaces(4).toNumber();
}

export function calcEstimatedGrossWeight(
    adjustedGoldWeight: number,
    stoneWeight: number,
    beadsWeight: number,
    diamondWeight: number
): number {
    const result = new Decimal(adjustedGoldWeight)
        .plus(stoneWeight)
        .plus(beadsWeight)
        .plus(diamondWeight);
    return result.toDecimalPlaces(4).toNumber();
}

// ─── Polish & Labour ───────────────────────────────────────────

/** Supported basis types for Polish and Labour calculation */
export type PolishLabourBasis = "Per Tola" | "Pasa" | "Ratti Cut";

export function gramsToTolas(grams: number): number {
    return new Decimal(grams).div(GRAMS_PER_TOLA).toDecimalPlaces(4).toNumber();
}

export function calcPolish(adjustedGoldWeight: number, ratePerTola: number): number {
    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(ratePerTola);
    return result.toDecimalPlaces(4).toNumber();
}

export function calcLabour(adjustedGoldWeight: number, ratePerTola: number): number {
    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(ratePerTola);
    return result.toDecimalPlaces(4).toNumber();
}

export function calcPolishAmount(
    basis: PolishLabourBasis,
    adjustedGoldWeight: number,
    rate: number,
    carat: number,
    goldAmount: number
): number {
    if (basis === "Pasa") {
        const result = new Decimal(goldAmount).times(new Decimal(rate).div(100));
        return result.toDecimalPlaces(4).toNumber();
    }

    if (basis === "Ratti Cut") {
        const rattiValue = new Decimal(24).minus(carat).times(4);
        const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
        const result = rattiValue.times(rate).times(tolas);
        return result.toDecimalPlaces(4).toNumber();
    }

    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(rate);
    return result.toDecimalPlaces(4).toNumber();
}

export function calcLabourAmount(
    basis: LabourBasis,
    adjustedGoldWeight: number,
    rate: number,
    pieces?: number
): number {
    if (basis === "Fixed" || basis === "Lump Sum") {
        return new Decimal(rate).toDecimalPlaces(4).toNumber();
    }

    if (basis === "Per Piece") {
        return new Decimal(rate).times(pieces ?? 1).toDecimalPlaces(4).toNumber();
    }

    if (basis === "Per Gram") {
        const result = new Decimal(adjustedGoldWeight).times(rate);
        return result.toDecimalPlaces(4).toNumber();
    }

    // Per Tola (default)
    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(rate);
    return result.toDecimalPlaces(4).toNumber();
}

// ─── Gold Amount ───────────────────────────────────────────────

export function calcGoldAmount(adjustedGoldWeight: number, goldRatePerGram: number): number {
    const result = new Decimal(adjustedGoldWeight).times(goldRatePerGram);
    return result.toDecimalPlaces(4).toNumber();
}

export function goldRateToPerGram(ratePerTola: number): number {
    return new Decimal(ratePerTola).div(GRAMS_PER_TOLA).toDecimalPlaces(4).toNumber();
}

// ─── Customer Old Gold ─────────────────────────────────────────

export function calcOldGoldValue(
    weight: number,
    carat: number,
    currentRatePerGram: number
): number {
    const pureEquivalent = new Decimal(weight).times(new Decimal(carat).div(24));
    const result = pureEquivalent.times(currentRatePerGram);
    return result.toDecimalPlaces(4).toNumber();
}

// ─── Pasa Rate ─────────────────────────────────────────────────

export function calcPasaDeduction(
    goldWeight: number,
    pasaRate: number,
    goldRatePerGram: number
): number {
    if (pasaRate <= 0) return 0;
    const deduction = new Decimal(goldWeight)
        .times(pasaRate)
        .dividedBy(96)
        .times(goldRatePerGram);
    return deduction.toDecimalPlaces(5).toNumber();
}

export function calcPasaAdjustedWeight(goldWeight: number, pasaRate: number): number {
    if (pasaRate <= 0 || goldWeight <= 0) return goldWeight;
    return new Decimal(goldWeight)
        .dividedBy(96)
        .times(new Decimal(96).minus(pasaRate))
        .toDecimalPlaces(5)
        .toNumber();
}

// ─── Line Item Total ───────────────────────────────────────────

export function calcLineTotal(
    goldAmount: number,
    stoneAmount: number,
    beadsAmount: number,
    diamondAmount: number,
    polishAmount: number,
    labourAmount: number
): number {
    const result = new Decimal(goldAmount)
        .plus(stoneAmount)
        .plus(beadsAmount)
        .plus(diamondAmount)
        .plus(polishAmount)
        .plus(labourAmount);
    return result.toDecimalPlaces(4).toNumber();
}

// ─── Full Line Item Calculation ────────────────────────────────

export function calculateLineItem(params: {
    transactionType?: "SALE" | "PURCHASE";
    estimatedGoldWeight: number;
    carat: number;
    goldRatePerGram: number;
    polishRate: number;
    polishBasis: PolishLabourBasis;
    labourRate: number;
    labourBasis: LabourBasis;
    pieces?: number;
    kaatRate?: number;
    kaatBasis?: KaatBasis;
    stoneWeight: number;
    beadsWeight: number;
    diamondWeight: number;
    stoneAmount: number;
    beadsAmount: number;
    diamondAmount: number;
}): {
    kaatWeight?: number;
    adjustedGoldWeight: number;
    estimatedGrossWeight: number;
    goldAmount: number;
    polishAmount: number;
    labourAmount: number;
    totalAmount: number;
} {
    const isPurchase = params.transactionType === "PURCHASE";

    let adjustedGoldWeight: number;
    let kaatWeight = 0;

    if (isPurchase && params.kaatBasis && params.kaatRate !== undefined) {
        let pureWeight = calcAdjustedGoldWeight(params.estimatedGoldWeight, params.carat);

        if (params.kaatBasis === "Direct Weight") {
            kaatWeight = params.kaatRate;
            adjustedGoldWeight = new Decimal(pureWeight).minus(kaatWeight).toDecimalPlaces(4).toNumber();
        } else if (params.kaatBasis === "Ratti Kaat") {
            adjustedGoldWeight = new Decimal(params.estimatedGoldWeight)
                .dividedBy(96)
                .times(new Decimal(96).minus(params.kaatRate))
                .toDecimalPlaces(4)
                .toNumber();
            kaatWeight = new Decimal(params.estimatedGoldWeight).minus(adjustedGoldWeight).toDecimalPlaces(4).toNumber();
        } else {
            adjustedGoldWeight = pureWeight;
        }

        if (adjustedGoldWeight < 0) adjustedGoldWeight = 0;
    } else {
        adjustedGoldWeight = calcAdjustedGoldWeight(params.estimatedGoldWeight, params.carat);
    }

    const estimatedGrossWeight = calcEstimatedGrossWeight(
        isPurchase ? params.estimatedGoldWeight : adjustedGoldWeight,
        params.stoneWeight,
        params.beadsWeight,
        params.diamondWeight
    );

    const goldAmount = calcGoldAmount(adjustedGoldWeight, params.goldRatePerGram);

    const polishAmount = calcPolishAmount(
        params.polishBasis,
        adjustedGoldWeight,
        params.polishRate,
        params.carat,
        goldAmount
    );
    const labourAmount = calcLabourAmount(params.labourBasis, adjustedGoldWeight, params.labourRate, params.pieces);

    const totalAmount = calcLineTotal(
        goldAmount,
        params.stoneAmount,
        params.beadsAmount,
        params.diamondAmount,
        isPurchase ? 0 : polishAmount,
        labourAmount
    );

    return {
        kaatWeight,
        adjustedGoldWeight,
        estimatedGrossWeight,
        goldAmount,
        polishAmount,
        labourAmount,
        totalAmount,
    };
}

// ─── Invoice Summary Calculation ───────────────────────────────

export function calculateInvoiceSummary(params: {
    items: Array<{ totalAmount: number; adjustedGoldWeight: number }>;
    otherCharges: number;
    discount: number;
    cashReceived: number;
    goldReceived: number;
    customerGoldWeight: number;
    customerGoldCarat: number;
    goldRatePerGram: number;
    pasaPercent: number;
}): {
    totalGoldWeight: number;
    totalAmount: number;
    customerGoldValue: number;
    pasaDeduction: number;
    balance: number;
} {
    const totalGoldWeight = params.items.reduce(
        (sum, item) => new Decimal(sum).plus(item.adjustedGoldWeight).toNumber(),
        0
    );

    const totalAmount = params.items.reduce(
        (sum, item) => new Decimal(sum).plus(item.totalAmount).toNumber(),
        0
    );

    const customerGoldValue = calcOldGoldValue(
        params.customerGoldWeight,
        params.customerGoldCarat,
        params.goldRatePerGram
    );

    const pasaDeduction = calcPasaDeduction(
        totalGoldWeight,
        params.pasaPercent,
        params.goldRatePerGram
    );

    const balance = new Decimal(totalAmount)
        .plus(params.otherCharges)
        .minus(params.discount)
        .minus(params.cashReceived)
        .minus(params.goldReceived)
        .minus(customerGoldValue)
        .minus(pasaDeduction)
        .toDecimalPlaces(4)
        .toNumber();

    return {
        totalGoldWeight,
        totalAmount,
        customerGoldValue,
        pasaDeduction,
        balance,
    };
}
