/**
 * ============================================================================
 * Unit Tests – Calculation Engine
 * ============================================================================
 *
 * Run with: npx tsx src/__tests__/calculationEngine.test.ts
 * ============================================================================
 */

import {
    karatToRatti,
    rattiToKarat,
    calcAdjustedGoldWeight,
    calcEstimatedGrossWeight,
    calcGoldAmount,
    goldRateToPerGram,
    calcOldGoldValue,
    calcPasaDeduction,
    calcPasaAdjustedWeight,
    calcPolishAmount,
    calcLabourAmount,
    calcLineTotal,
    calculateLineItem,
    calculateInvoiceSummary,
} from "../modules/invoice/application/calculationEngine";

const GRAMS_PER_TOLA = 11.664;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${testName}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${testName}`);
    }
}

function assertClose(actual: number, expected: number, tolerance: number, testName: string) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        passed++;
        console.log(`  ✓ ${testName} (${actual})`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${testName} — expected ~${expected}, got ${actual} (diff: ${diff})`);
    }
}

// ─── Karat / Ratti Conversion ──────────────────────────────────

console.log("\n📐 Karat ↔ Ratti Conversion");

assert(karatToRatti(24) === 0, "24K = 0 Ratti (pure gold)");
assert(karatToRatti(22) === 8, "22K = 8 Ratti impurity");
assert(karatToRatti(21) === 12, "21K = 12 Ratti impurity");
assert(karatToRatti(18) === 24, "18K = 24 Ratti impurity");

assert(rattiToKarat(0) === 24, "0 Ratti = 24K (pure)");
assert(rattiToKarat(8) === 22, "8 Ratti = 22K");
assert(rattiToKarat(12) === 21, "12 Ratti = 21K");

// ─── Adjusted Gold Weight ──────────────────────────────────────

console.log("\n⚖️ Adjusted Gold Weight");

assertClose(calcAdjustedGoldWeight(11.664, 24), 11.664, 0.001, "24K: no adjustment");
assertClose(calcAdjustedGoldWeight(11.664, 22), 10.692, 0.001, "22K: reduced by 22/24");
assertClose(calcAdjustedGoldWeight(11.664, 21), 10.206, 0.001, "21K: reduced by 21/24");

// ─── Gross Weight ──────────────────────────────────────────────

console.log("\n📦 Gross Weight");

assertClose(calcEstimatedGrossWeight(10, 2, 1, 0.5), 13.5, 0.001, "10g + 2g + 1g + 0.5g = 13.5g");
assertClose(calcEstimatedGrossWeight(10, 0, 0, 0), 10, 0.001, "10g with no extras = 10g");

// ─── Gold Amount ───────────────────────────────────────────────

console.log("\n💰 Gold Amount");

const testRate = 487583;
const perGram = goldRateToPerGram(testRate);
assertClose(perGram, testRate / GRAMS_PER_TOLA, 0.01, "Gold rate per gram conversion");
assertClose(calcGoldAmount(11.664, perGram), 487583, 5, "1 tola 24K = rate per tola");

// ─── calcPolishAmount & calcLabourAmount ─────────────────────────────────────────────

console.log("\n🔧 calcPolishAmount & calcLabourAmount (Polish/Labour)");

// Per Tola (Labour)
assertClose(calcLabourAmount("Per Tola", 11.664, 1200), 1200, 0.01, "Per Tola: 1 tola × 1200");
assertClose(calcLabourAmount("Per Tola", 23.328, 1200), 2400, 0.01, "Per Tola: 2 tolas × 1200");

// Pasa (percentage - Polish only)
assertClose(calcPolishAmount("Pasa", 11.664, 2, 24, 100000), 2000, 0.01, "Pasa: 2% of 100,000");
assertClose(calcPolishAmount("Pasa", 11.664, 5, 24, 487583), 24379.15, 0.01, "Pasa: 5% of 487,583");

// Ratti Cut: rattiValue = (24-carat)×4, result = rattiValue × rate × tolas (Polish only)
assertClose(calcPolishAmount("Ratti Cut", 11.664, 100, 22, 100000), 800, 0.01, "Ratti Cut: 22K, 1t, r100 → 800");
assertClose(calcPolishAmount("Ratti Cut", 23.328, 50, 21, 200000), 1200, 0.01, "Ratti Cut: 21K, 2t, r50 → 1200");

// ─── Old Gold Value ────────────────────────────────────────────

console.log("\n🪙 Old Gold Value");

assertClose(calcOldGoldValue(11.664, 24, perGram), 487583, 5, "1 tola 24K old gold = full rate");
assertClose(calcOldGoldValue(0, 24, perGram), 0, 0.01, "0g old gold = 0");

// ─── Pasa Deduction ────────────────────────────────────────────

console.log("\n📉 Pasa Deduction");

// Pasa is measured in ratti out of 96 (1 tola = 96 ratti), so the deduction is:
//   PasaDeduction = goldWeight × (pasaRate / 96) × goldRatePerGram
// Example: 10g, pasa 0.6, 5000 PKR/g = 10 × 0.6/96 × 5000 = 312.5
assertClose(calcPasaDeduction(10, 0.6, 5000), 312.5, 0.01, "10g × 0.6/96 × 5000 = 312.5");
assertClose(calcPasaDeduction(10, 0, 5000), 0, 0.01, "0 pasa rate = 0");

// Consistency: the PKR deduction must equal the value of the gold weight that the
// pasa adjustment removes (calcPasaDeduction and calcPasaAdjustedWeight must agree).
{
    const w = 10, pasa = 0.6, rate = 5000;
    const removedWeightValue = (w - calcPasaAdjustedWeight(w, pasa)) * rate;
    assertClose(calcPasaDeduction(w, pasa, rate), removedWeightValue, 0.01, "deduction == removed-weight × rate");
}

// ─── Full Line Item ────────────────────────────────────────────

console.log("\n📊 Full Line Item Calculation");

const lineResult = calculateLineItem({
    estimatedGoldWeight: 11.664,
    carat: 24,
    goldRatePerGram: perGram,
    polishRate: 2,
    polishBasis: "Per Tola",
    labourRate: 1200,
    labourBasis: "Per Tola",
    stoneWeight: 0, beadsWeight: 0, diamondWeight: 0,
    stoneAmount: 0, beadsAmount: 0, diamondAmount: 0,
});

assertClose(lineResult.adjustedGoldWeight, 11.664, 0.001, "Adjusted weight correct");
assertClose(lineResult.goldAmount, 487583, 5, "Gold amount correct");
assertClose(lineResult.polishAmount, 2, 0.01, "Polish amount correct");
assertClose(lineResult.labourAmount, 1200, 0.01, "Labour amount correct");
assert(lineResult.totalAmount > 487583, "Total > gold amount");

// Gold Amount must use the entered weight, not the purity/kaat-adjusted Pure Wt
const partialKaratResult = calculateLineItem({
    estimatedGoldWeight: 100,
    carat: 21,
    goldRatePerGram: 100,
    polishRate: 0,
    polishBasis: "Per Tola",
    labourRate: 0,
    labourBasis: "Per Tola",
    stoneWeight: 0, beadsWeight: 0, diamondWeight: 0,
    stoneAmount: 0, beadsAmount: 0, diamondAmount: 0,
});
assertClose(partialKaratResult.adjustedGoldWeight, 87.5, 0.001, "Pure Wt = 100 × 21/24 = 87.5g (reference only)");
assertClose(partialKaratResult.goldAmount, 10000, 0.01, "Gold amount = rate(100) × entered weight(100) = 10,000, not Pure Wt");

// ─── Lump Sum Kaat (fixed gram/mg cutting) ─────────────────────

console.log("\n✂️  Lump Sum Kaat");

const lumpSum = calculateLineItem({
    transactionType: "PURCHASE",
    estimatedGoldWeight: 100,
    carat: 24,
    goldRatePerGram: 100,
    polishRate: 0, polishBasis: "Per Tola",
    labourRate: 0, labourBasis: "Per Tola",
    kaatBasis: "Lump Sum", kaatRate: 0.5,
    stoneWeight: 0, beadsWeight: 0, diamondWeight: 0,
    stoneAmount: 0, beadsAmount: 0, diamondAmount: 0,
});
assertClose(lumpSum.adjustedGoldWeight, 99.5, 0.001, "Lump Sum: 100 − 0.5g fixed cut = 99.5g net");
assertClose(lumpSum.kaatWeight ?? 0, 0.5, 0.001, "Lump Sum: kaat weight = the fixed 0.5g");
assertClose(lumpSum.goldAmount, 10000, 0.01, "Lump Sum: gold amount still on entered weight (100 × 100)");

// Over-cut is clamped, never negative net weight
const lumpSumOver = calculateLineItem({
    transactionType: "PURCHASE",
    estimatedGoldWeight: 10,
    carat: 24,
    goldRatePerGram: 100,
    polishRate: 0, polishBasis: "Per Tola",
    labourRate: 0, labourBasis: "Per Tola",
    kaatBasis: "Lump Sum", kaatRate: 25,
    stoneWeight: 0, beadsWeight: 0, diamondWeight: 0,
    stoneAmount: 0, beadsAmount: 0, diamondAmount: 0,
});
assertClose(lumpSumOver.adjustedGoldWeight, 0, 0.001, "Lump Sum: over-cut clamps net weight to 0");

// ─── Minus-entry guard ─────────────────────────────────────────

console.log("\n🚫 No-minus guard");

assertClose(calcLineTotal(0, 0, 0, 0, 0, -15000), 0, 0.01, "Negative labour can never drive a line total below 0");

// ─── Invoice Summary ──────────────────────────────────────────

console.log("\n📋 Invoice Summary");

const summary = calculateInvoiceSummary({
    items: [
        { totalAmount: 50000, estimatedGoldWeight: 5 },
        { totalAmount: 75000, estimatedGoldWeight: 7 },
    ],
    otherCharges: 1000,
    discount: 500,
    cashReceived: 20000,
    goldReceived: 0,
    customerGoldWeight: 3,
    customerGoldCarat: 24,
    goldRatePerGram: perGram,
    pasaPercent: 0,
});

assertClose(summary.totalGoldWeight, 12, 0.001, "Total gold weight = 12g");
assertClose(summary.totalAmount, 125000, 0.01, "Total = 50k + 75k = 125k");
assert(summary.customerGoldValue > 0, "Old gold value > 0");
assert(summary.balance < summary.totalAmount, "Balance < total");

// ─── Results ───────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
    console.error("\n❌ Some tests failed!");
    process.exit(1);
} else {
    console.log("\n✅ All tests passed!");
}
