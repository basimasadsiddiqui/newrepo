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

/** Traditional Tola/Masha/Ratti breakdown (Pakka Tola = 12.150g, Masha = Tola/12, Ratti = Masha/8) */
export function gramsToTolaMashaRatti(grams: number): { tola: number; masha: number; ratti: number } {
    const totalTola = new Decimal(grams).div(PAKKA_TOLA_GRAMS);
    const tola = totalTola.floor();
    const totalMasha = totalTola.minus(tola).times(12);
    const masha = totalMasha.floor();
    const ratti = totalMasha.minus(masha).times(8).toDecimalPlaces(2);
    return { tola: tola.toNumber(), masha: masha.toNumber(), ratti: ratti.toNumber() };
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
export type LabourBasis = "Per Tola" | "Per Tola Pakka" | "Per Gram" | "Per Piece" | "Lump Sum" | "Fixed";

/** Supported basis types for Kaat calculation.
 *  "Lump Sum" = a fixed gram/milligram cut deducted directly from the entered weight. */
export type KaatBasis = "Ratti Kaat" | "Direct Weight" | "Pasa" | "Purity %" | "Lump Sum";

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

    if (basis === "Per Tola Pakka") {
        const tolas = new Decimal(adjustedGoldWeight).div(PAKKA_TOLA_GRAMS);
        const result = tolas.times(rate);
        return result.toDecimalPlaces(4).toNumber();
    }

    // Per Tola (default, Kacha Tola 11.664g)
    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(rate);
    return result.toDecimalPlaces(4).toNumber();
}

// ─── Gold Amount ───────────────────────────────────────────────

export function calcGoldAmount(adjustedGoldWeight: number, goldRatePerGram: number): number {
    const result = new Decimal(adjustedGoldWeight).times(goldRatePerGram);
    return result.toDecimalPlaces(4).toNumber();
}

/** Convert gold rate per Kacha Tola (11.664 g) → per gram */
export function goldRateToPerGram(ratePerTola: number): number {
    return new Decimal(ratePerTola).div(GRAMS_PER_TOLA).toDecimalPlaces(4).toNumber();
}

/** Convert gold rate per Pakka Tola (12.150 g) → per gram */
export function goldRateToPerGramPakka(ratePerTola: number): number {
    return new Decimal(ratePerTola).div(PAKKA_TOLA_GRAMS).toDecimalPlaces(4).toNumber();
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
    // Never allow a negative line total (client: "Don't allow minus entry")
    return Decimal.max(result, 0).toDecimalPlaces(4).toNumber();
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
        const pureWeight = calcAdjustedGoldWeight(params.estimatedGoldWeight, params.carat);

        if (params.kaatBasis === "Ratti Kaat") {
            // Wt × (96 − ratti) / 96
            adjustedGoldWeight = new Decimal(params.estimatedGoldWeight)
                .dividedBy(96)
                .times(new Decimal(96).minus(params.kaatRate))
                .toDecimalPlaces(4)
                .toNumber();
            kaatWeight = new Decimal(params.estimatedGoldWeight).minus(adjustedGoldWeight).toDecimalPlaces(4).toNumber();
        } else if (params.kaatBasis === "Direct Weight") {
            kaatWeight = params.kaatRate;
            adjustedGoldWeight = new Decimal(pureWeight).minus(kaatWeight).toDecimalPlaces(4).toNumber();
        } else if (params.kaatBasis === "Lump Sum") {
            // Fixed gram/milligram cut deducted directly from the entered weight
            kaatWeight = params.kaatRate;
            adjustedGoldWeight = new Decimal(params.estimatedGoldWeight).minus(kaatWeight).toDecimalPlaces(4).toNumber();
        } else if (params.kaatBasis === "Purity %") {
            // Wt × purity (decimal)  e.g. 60 × 0.875 = 52.500
            adjustedGoldWeight = new Decimal(params.estimatedGoldWeight)
                .times(new Decimal(params.kaatRate))
                .toDecimalPlaces(4)
                .toNumber();
            kaatWeight = new Decimal(params.estimatedGoldWeight).minus(adjustedGoldWeight).toDecimalPlaces(4).toNumber();
        } else {
            // "Pasa" or any unknown → carat-based, no ratti deduction
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

    // Gold Amount = rate × the gold weight the user entered (not the kaat/purity-adjusted Pure Wt)
    const goldAmount = calcGoldAmount(params.estimatedGoldWeight, params.goldRatePerGram);

    const polishAmount = calcPolishAmount(
        params.polishBasis,
        adjustedGoldWeight,
        params.polishRate,
        params.carat,
        goldAmount
    );
    // Labour is always on gross weight (estimatedGoldWeight), not net
    const labourAmount = calcLabourAmount(params.labourBasis, params.estimatedGoldWeight, params.labourRate, params.pieces);

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

/**
 * Per-invoice split of value into the GOLD portion (pure 24k weight, in grams)
 * and the CASH portion (stones + beads + diamonds + labour + polish, in rupees).
 * Used by the gold-based party ledger / statement.
 */
export function calcInvoiceGoldBreakdown(items: Array<{
    adjustedGoldWeight?: number;
    estimatedGoldWeight?: number;
    stoneAmount?: number;
    beadsAmount?: number;
    diamondAmount?: number;
    labourAmount?: number;
    polishAmount?: number;
}>): { pureGoldWeight: number; stoneLabourAmount: number } {
    let pure = new Decimal(0);
    let cash = new Decimal(0);
    for (const it of items) {
        pure = pure.plus(it.adjustedGoldWeight ?? it.estimatedGoldWeight ?? 0);
        cash = cash
            .plus(it.stoneAmount ?? 0)
            .plus(it.beadsAmount ?? 0)
            .plus(it.diamondAmount ?? 0)
            .plus(it.labourAmount ?? 0)
            .plus(it.polishAmount ?? 0);
    }
    return {
        pureGoldWeight: pure.toDecimalPlaces(4).toNumber(),
        stoneLabourAmount: cash.toDecimalPlaces(4).toNumber(),
    };
}

// ─── Invoice Summary Calculation ───────────────────────────────

export function calculateInvoiceSummary(params: {
    items: Array<{ totalAmount: number; estimatedGoldWeight: number }>;
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
    /** Sum of the line-item totals only — before charges/discount. */
    itemsSubtotal: number;
    /** Grand total = itemsSubtotal + otherCharges − discount. */
    totalAmount: number;
    customerGoldValue: number;
    pasaDeduction: number;
    balance: number;
} {
    // Total Gold Weight = sum of the gold weight the user entered per item (not Pure Wt)
    const totalGoldWeight = params.items.reduce(
        (sum, item) => new Decimal(sum).plus(item.estimatedGoldWeight).toNumber(),
        0
    );

    const itemsSubtotal = params.items.reduce(
        (sum, item) => new Decimal(sum).plus(item.totalAmount).toNumber(),
        0
    );

    // Client (#15/#16): Other Charges and Discount must move the Total Amount,
    // on SALE *and* PURCHASE invoices. Callers pass these already resolved to
    // rupees (a gold-gram entry is converted at the gold rate before it gets here).
    const totalAmount = new Decimal(itemsSubtotal)
        .plus(params.otherCharges)
        .minus(params.discount)
        .toDecimalPlaces(4)
        .toNumber();

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

    // Balance is unchanged in value: charges/discount are now folded into
    // totalAmount instead of being added here a second time.
    const balance = new Decimal(totalAmount)
        .minus(params.cashReceived)
        .minus(params.goldReceived)
        .minus(customerGoldValue)
        .minus(pasaDeduction)
        .toDecimalPlaces(4)
        .toNumber();

    return {
        totalGoldWeight,
        itemsSubtotal,
        totalAmount,
        customerGoldValue,
        pasaDeduction,
        balance,
    };
}
