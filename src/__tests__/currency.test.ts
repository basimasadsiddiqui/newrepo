/**
 * Unit Tests – Currency helpers
 * Run with: npx tsx src/__tests__/currency.test.ts
 */
import { getCurrencySymbol, toBaseCurrency, fromBaseCurrency, formatMoney, convertInvoiceBodyToPkr } from "../shared/utils/currency";

let passed = 0, failed = 0;
function assert(cond: boolean, name: string) {
    if (cond) { passed++; console.log(`  ✓ ${name}`); }
    else { failed++; console.error(`  ✗ ${name}`); }
}
function assertClose(a: number, b: number, eps: number, name: string) {
    assert(Math.abs(a - b) <= eps, `${name} (${a})`);
}

console.log("\n💱 Currency helpers");

assert(getCurrencySymbol("PKR") === "Rs.", "PKR symbol");
assert(getCurrencySymbol("AED") === "د.إ", "AED symbol");
assert(getCurrencySymbol("USD") === "$", "USD symbol");
assert(getCurrencySymbol(undefined) === "Rs.", "undefined -> PKR symbol");
assert(getCurrencySymbol("ZZZ") === "ZZZ", "unknown code falls back to code");

// 100 AED at 76 PKR/AED -> 7,600 PKR
assertClose(toBaseCurrency(100, 76), 7600, 0.001, "toBaseCurrency: 100 AED × 76 = 7,600 PKR");
assertClose(fromBaseCurrency(7600, 76), 100, 0.001, "fromBaseCurrency: 7,600 PKR ÷ 76 = 100 AED");
// rate of 1 or 0 is a no-op (safety)
assertClose(toBaseCurrency(500, 1), 500, 0.001, "rate 1 is identity");
assertClose(toBaseCurrency(500, 0), 500, 0.001, "rate 0 guarded -> identity");
assert(formatMoney(100, "AED") === "د.إ 100.00", "formatMoney AED");

console.log("\n🔁 convertInvoiceBodyToPkr");

// Foreign body × rate → PKR on money fields; weights/percent untouched
{
    const body: Record<string, unknown> = {
        currency: "AED", currencyRate: 76,
        goldRate: 1000, polishRate: 10, labourRate: 50,
        otherCharges: 100, discount: 20, cashReceived: 5,
        goldReceived: 3, kaatRate: 4, pasaRate: 0.6, intlOunceRate: 2400,
        otherChargesWeight: 2, discountWeight: 1,
        items: [{ stoneRate: 8, stoneAmount: 80, beadsAmount: 0, diamondAmount: 10, totalAmount: 1000, stoneWeight: 5, carat: 21 }],
    };
    convertInvoiceBodyToPkr(body);
    assertClose(body.goldRate as number, 76000, 0.01, "goldRate × 76");
    assertClose(body.otherCharges as number, 7600, 0.01, "otherCharges × 76");
    assertClose(body.cashReceived as number, 380, 0.01, "cashReceived × 76");
    assertClose(body.goldReceived as number, 3, 0.01, "goldReceived NOT converted (weight)");
    assertClose(body.kaatRate as number, 4, 0.01, "kaatRate NOT converted");
    assertClose(body.pasaRate as number, 0.6, 0.01, "pasaRate NOT converted (percent)");
    assertClose(body.intlOunceRate as number, 2400, 0.01, "intlOunceRate NOT converted");
    assertClose(body.otherChargesWeight as number, 2, 0.01, "otherChargesWeight NOT converted (grams)");
    const it = (body.items as Array<Record<string, number>>)[0];
    assertClose(it.stoneRate, 608, 0.01, "item stoneRate × 76");
    assertClose(it.totalAmount, 76000, 0.01, "item totalAmount × 76");
    assertClose(it.stoneWeight, 5, 0.01, "item stoneWeight NOT converted");
}

// PKR or rate=1 → no-op
{
    const body: Record<string, unknown> = { currency: "PKR", currencyRate: 1, goldRate: 1000 };
    convertInvoiceBodyToPkr(body);
    assertClose(body.goldRate as number, 1000, 0.01, "PKR body unchanged");
}
{
    const body: Record<string, unknown> = { currency: "AED", currencyRate: 1, goldRate: 1000 };
    convertInvoiceBodyToPkr(body);
    assertClose(body.goldRate as number, 1000, 0.01, "rate 1 → no-op");
}

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error("\n❌ Some tests failed!"); process.exit(1); }
else console.log("\n✅ All tests passed!");
