/**
 * ============================================================================
 * CALCULATION ENGINE – Akhtar Jewellers Invoice Module
 * ============================================================================
 *
 * PURE FUNCTIONS for all jewellery business calculations.
 * Uses decimal.js to avoid floating-point precision errors.
 *
 * KEY CONCEPTS:
 * - 1 Tola = 11.664 grams (standard Pakistani tola)
 * - Karat: purity measure (24 = pure gold)
 * - Ratti: impurity measure = (24 - Karat) × 4
 * - Adjusted Gold Weight: weight normalized to invoice carat purity
 * - Pasa: a deduction percentage applied to the gold rate
 *
 * All functions take plain numbers and return plain numbers.
 * Decimal.js is used INTERNALLY for precision — callers don't need to know.
 * ============================================================================
 */

import Decimal from "decimal.js";

// Configure Decimal.js for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/** 1 Tola = 11.664 grams (Pakistani standard) */
const GRAMS_PER_TOLA = new Decimal("11.664");

// ─── Karat ↔ Ratti Conversion ──────────────────────────────────

/**
 * Convert Karat (purity) to Ratti (impurity).
 * Formula: Ratti = (24 - Karat) × 4
 *
 * @example karatToRatti(22) → 8   (22K gold has 8 ratti impurity)
 * @example karatToRatti(24) → 0   (pure gold, no impurity)
 * @example karatToRatti(18) → 24  (18K gold has 24 ratti impurity)
 */
export function karatToRatti(karat: number): number {
    const result = new Decimal(24).minus(karat).times(4);
    return result.toDecimalPlaces(4).toNumber();
}

/**
 * Convert Ratti (impurity) to Karat (purity).
 * Formula: Karat = 24 - (Ratti ÷ 4)
 *
 * @example rattiToKarat(8) → 22
 * @example rattiToKarat(0) → 24
 * @example rattiToKarat(24) → 18
 */
export function rattiToKarat(ratti: number): number {
    const result = new Decimal(24).minus(new Decimal(ratti).div(4));
    return result.toDecimalPlaces(4).toNumber();
}

/** Supported basis types for Labour calculation */
export type LabourBasis = "Per Tola" | "Per Gram" | "Fixed";

/** Supported basis types for Kaat calculation */
export type KaatBasis = "Ratti Kaat" | "Direct Weight";

// ─── Gold Weight Calculations ──────────────────────────────────

/**
 * Calculate the Adjusted Gold Weight.
 * Normalizes the estimated weight based on the item's carat purity
 * relative to 24K (pure gold).
 *
 * Formula: AdjustedWeight = EstimatedWeight × (Carat / 24)
 *
 * @param estimatedWeight - Raw gold weight in grams
 * @param carat - Karat purity of the gold (1-24)
 * @returns Adjusted gold weight in grams
 *
 * @example calcAdjustedGoldWeight(10, 22) → 9.1667
 * @example calcAdjustedGoldWeight(10, 24) → 10.0000 (pure gold, no change)
 */
export function calcAdjustedGoldWeight(
    estimatedWeight: number,
    carat: number
): number {
    const result = new Decimal(estimatedWeight)
        .times(new Decimal(carat).div(24));
    return result.toDecimalPlaces(4).toNumber();
}

/**
 * Calculate the Estimated Gross Weight.
 * Sum of adjusted gold weight + all stone/bead/diamond weights.
 *
 * @param adjustedGoldWeight - Purity-adjusted gold weight (grams)
 * @param stoneWeight - Weight of stones in grams
 * @param beadsWeight - Weight of beads in grams
 * @param diamondWeight - Weight of diamonds in grams
 * @returns Total gross weight in grams
 */
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

/**
 * Convert grams to tolas.
 * Used internally for Per Tola and Ratti Cut calculations.
 *
 * @param grams - Weight in grams
 * @returns Weight in tolas
 */
export function gramsToTolas(grams: number): number {
    return new Decimal(grams).div(GRAMS_PER_TOLA).toDecimalPlaces(4).toNumber();
}

/**
 * Calculate Polish amount based on adjusted gold weight (Per Tola basis).
 *
 * Formula: Polish = (AdjustedGoldWeight / 11.664) × PolishRatePerTola
 *
 * @param adjustedGoldWeight - Purity-adjusted gold weight in grams
 * @param ratePerTola - Polish rate per tola (PKR)
 * @returns Polish amount in PKR
 *
 * @example calcPolish(11.664, 2.0) → 2.0  (exactly 1 tola × 2.0 rate)
 */
export function calcPolish(
    adjustedGoldWeight: number,
    ratePerTola: number
): number {
    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(ratePerTola);
    return result.toDecimalPlaces(4).toNumber();
}

/**
 * Calculate Labour amount based on adjusted gold weight (Per Tola basis).
 *
 * Formula: Labour = (AdjustedGoldWeight / 11.664) × LabourRatePerTola
 *
 * @param adjustedGoldWeight - Purity-adjusted gold weight in grams
 * @param ratePerTola - Labour rate per tola (PKR)
 * @returns Labour amount in PKR
 */
export function calcLabour(
    adjustedGoldWeight: number,
    ratePerTola: number
): number {
    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(ratePerTola);
    return result.toDecimalPlaces(4).toNumber();
}

/**
 * Calculate Polish or Labour amount using a specific basis.
 *
 * Three basis modes for Polish:
 *  - "Per Tola":  amount = tolas × rate
 *  - "Pasa":      amount = goldAmount × (rate / 100)  (percentage of gold amt)
 *  - "Ratti Cut": amount = rattiValue × rate × tolas
 *                 where rattiValue = (24 - carat) × 4
 *
 * Other modes for Labour:
 *  - "Per Gram": amount = usedWeight × rate (where usedWeight is adjustedGoldWeight)
 *  - "Fixed": amount = rate
 *
 * @param basis - Calculation basis
 * @param adjustedGoldWeight - Purity-adjusted gold weight in grams
 * @param rate - The rate value entered by the user
 * @param carat - Item carat (needed for Ratti Cut)
 * @param goldAmount - Gold amount in PKR (needed for Pasa)
 * @returns Calculated amount in PKR
 */
export function calcPolishAmount(
    basis: PolishLabourBasis,
    adjustedGoldWeight: number,
    rate: number,
    carat: number,
    goldAmount: number
): number {
    if (basis === "Pasa") {
        // Pasa: percentage of gold amount
        const result = new Decimal(goldAmount).times(new Decimal(rate).div(100));
        return result.toDecimalPlaces(4).toNumber();
    }

    if (basis === "Ratti Cut") {
        // Ratti Cut: rattiValue × rate × tolas
        const rattiValue = new Decimal(24).minus(carat).times(4);
        const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
        const result = rattiValue.times(rate).times(tolas);
        return result.toDecimalPlaces(4).toNumber();
    }

    // Per Tola (default): tolas × rate
    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(rate);
    return result.toDecimalPlaces(4).toNumber();
}

/**
 * Calculate Labour amount using a specific basis.
 * 
 * - "Per Tola": amount = tolas × rate
 * - "Per Gram": amount = usedWeight × rate (where usedWeight is adjustedGoldWeight)
 * - "Fixed": amount = rate
 */
export function calcLabourAmount(
    basis: LabourBasis,
    adjustedGoldWeight: number,
    rate: number
): number {
    if (basis === "Fixed") {
        return new Decimal(rate).toDecimalPlaces(4).toNumber();
    }

    if (basis === "Per Gram") {
        const result = new Decimal(adjustedGoldWeight).times(rate);
        return result.toDecimalPlaces(4).toNumber();
    }

    // Per Tola (default): tolas × rate
    const tolas = new Decimal(adjustedGoldWeight).div(GRAMS_PER_TOLA);
    const result = tolas.times(rate);
    return result.toDecimalPlaces(4).toNumber();
}

// ─── Gold Amount ───────────────────────────────────────────────

/**
 * Calculate the gold amount for a line item.
 *
 * Formula: GoldAmount = AdjustedGoldWeight × GoldRatePerGram
 *
 * Note: If gold rate is provided "per tola", convert first:
 *   RatePerGram = RatePerTola / 11.664
 *
 * @param adjustedGoldWeight - Purity-adjusted gold weight in grams
 * @param goldRatePerGram - Current gold rate per gram (PKR)
 * @returns Gold amount in PKR
 */
export function calcGoldAmount(
    adjustedGoldWeight: number,
    goldRatePerGram: number
): number {
    const result = new Decimal(adjustedGoldWeight).times(goldRatePerGram);
    return result.toDecimalPlaces(4).toNumber();
}

/**
 * Convert a per-tola gold rate to per-gram.
 *
 * @param ratePerTola - Gold rate per tola
 * @returns Gold rate per gram
 */
export function goldRateToPerGram(ratePerTola: number): number {
    return new Decimal(ratePerTola).div(GRAMS_PER_TOLA).toDecimalPlaces(4).toNumber();
}

// ─── Customer Old Gold ─────────────────────────────────────────

/**
 * Calculate the value of customer's old gold.
 * Used to deduct from the payable amount.
 *
 * Steps:
 * 1. Adjust old gold weight to pure gold equivalent
 * 2. Multiply by current gold rate
 *
 * @param weight - Customer's old gold weight in grams
 * @param carat - Purity of customer's old gold (1-24)
 * @param currentRatePerGram - Current gold rate per gram (PKR)
 * @returns Value of old gold in PKR
 *
 * @example calcOldGoldValue(10, 22, 5000) → 45,833.33
 */
export function calcOldGoldValue(
    weight: number,
    carat: number,
    currentRatePerGram: number
): number {
    // Adjust to pure gold equivalent
    const pureEquivalent = new Decimal(weight).times(new Decimal(carat).div(24));
    const result = pureEquivalent.times(currentRatePerGram);
    return result.toDecimalPlaces(4).toNumber();
}

// ─── Pasa Rate ─────────────────────────────────────────────────

/**
 * Calculate Pasa deduction based on Pond Pasa formula.
 *
 * Pond Pasa = Pure Gold Weight = Total Weight × (Karat ÷ 24)
 * (this is already the adjustedGoldWeight / totalGoldWeight passed in)
 *
 * Formula: PasaDeduction = PondPasaWeight × PasaRate × GoldRatePerGram
 *
 * PasaRate is a direct multiplier (e.g. 0.6), NOT a percentage.
 *
 * @param pondPasaWeight - Pure gold equivalent weight in grams
 * @param pasaRate - Pasa rate as a direct multiplier (e.g. 0.6)
 * @param goldRatePerGram - Current gold rate per gram (PKR)
 * @returns Pasa deduction amount in PKR
 */
export function calcPasaDeduction(
    pondPasaWeight: number,
    pasaRate: number,
    goldRatePerGram: number
): number {
    const result = new Decimal(pondPasaWeight)
        .times(new Decimal(pasaRate))
        .times(new Decimal(goldRatePerGram));
    return result.toDecimalPlaces(5).toNumber();
}

// ─── Line Item Total ───────────────────────────────────────────

/**
 * Calculate the total amount for a single line item.
 * Simply sums all component amounts.
 *
 * @returns Total line item amount in PKR
 */
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

/**
 * Perform ALL calculations for a single line item.
 * This is the main function called when any item field changes.
 *
 * @param params - All raw input values for the line item
 * @returns Fully calculated line item values
 */
export function calculateLineItem(params: {
    transactionType?: "SALE" | "PURCHASE"; // Defaults to SALE for backward compatibility
    estimatedGoldWeight: number;
    carat: number;
    goldRatePerGram: number;
    polishRate: number;
    polishBasis: PolishLabourBasis;
    labourRate: number;
    labourBasis: LabourBasis; // Update to the new union
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
        // --- PURCHASE LOGIC ---
        // Kaat is deducted from the pure weight
        let pureWeight = calcAdjustedGoldWeight(params.estimatedGoldWeight, params.carat);

        if (params.kaatBasis === "Direct Weight") {
            kaatWeight = params.kaatRate;
        } else if (params.kaatBasis === "Ratti Kaat") {
            // Ratti Kaat Formula provided by user:
            // 1 Ratti = 0.1215 grams
            // Kaat Weight (grams) = Ratti × 0.1215
            kaatWeight = new Decimal(params.kaatRate).times(0.1215).toDecimalPlaces(4).toNumber();
        }

        adjustedGoldWeight = new Decimal(pureWeight).minus(kaatWeight).toDecimalPlaces(4).toNumber();
        // Ensure it doesn't drop below 0
        if (adjustedGoldWeight < 0) adjustedGoldWeight = 0;
    } else {
        // --- SALE LOGIC (Preserved Exactly) ---
        adjustedGoldWeight = calcAdjustedGoldWeight(
            params.estimatedGoldWeight,
            params.carat
        );
    }

    const estimatedGrossWeight = calcEstimatedGrossWeight(
        isPurchase ? params.estimatedGoldWeight : adjustedGoldWeight, // For purchase, gross is physical scale weight
        params.stoneWeight,
        params.beadsWeight,
        params.diamondWeight
    );

    const goldAmount = calcGoldAmount(adjustedGoldWeight, params.goldRatePerGram);

    // Use basis-aware calculation for polish and labour
    const polishAmount = calcPolishAmount(
        params.polishBasis,
        adjustedGoldWeight,
        params.polishRate,
        params.carat,
        goldAmount
    );
    const labourAmount = calcLabourAmount(
        params.labourBasis,
        adjustedGoldWeight,
        params.labourRate
    );

    const totalAmount = calcLineTotal(
        goldAmount,
        params.stoneAmount,
        params.beadsAmount,
        params.diamondAmount,
        isPurchase ? 0 : polishAmount, // Disable polish calculation for Purchases (replaced by Kaat)
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

/**
 * Calculate the complete invoice summary.
 * Called whenever any item or summary field changes.
 *
 * Balance formula:
 *   Balance = TotalAmount + OtherCharges - Discount
 *             - CashReceived - GoldReceived
 *             - CustomerOldGoldValue - PasaDeduction
 *
 * @param params - All invoice-level values
 * @returns Complete summary with balance
 */
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
    // Sum all line item gold weights
    const totalGoldWeight = params.items.reduce(
        (sum, item) =>
            new Decimal(sum).plus(item.adjustedGoldWeight).toNumber(),
        0
    );

    // Sum all line item amounts
    const totalAmount = params.items.reduce(
        (sum, item) =>
            new Decimal(sum).plus(item.totalAmount).toNumber(),
        0
    );

    // Calculate old gold value
    const customerGoldValue = calcOldGoldValue(
        params.customerGoldWeight,
        params.customerGoldCarat,
        params.goldRatePerGram
    );

    // Calculate pasa deduction on total pure gold weight based on Pond Pasa formula
    const pasaDeduction = calcPasaDeduction(totalGoldWeight, params.pasaPercent, params.goldRatePerGram);

    // Calculate balance
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
