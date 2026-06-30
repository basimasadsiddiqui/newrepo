/**
 * Unit Tests – Stone amount (truncation)
 * Run with: npx tsx src/__tests__/stone.test.ts
 */
import { stoneRowAmount } from "../shared/utils/stone";

let passed = 0, failed = 0;
function assert(cond: boolean, name: string) {
    if (cond) { passed++; console.log(`  ✓ ${name}`); }
    else { failed++; console.error(`  ✗ ${name}`); }
}

console.log("\n💎 stoneRowAmount (truncates, never rounds up)");

// Client case: 10.29 g, Per Carat @ 15 → 51.45 ct × 15 = 771.75 → 771 (NOT 772)
assert(stoneRowAmount({ value: 10.29, unit: "g", rateBasis: "Per Carat", rate: 15, pieces: 1 }) === 771,
    "10.29 g Per Carat @15 → 771 (floored from 771.75)");

// Per Gram: 20.158 g × 15 = 302.37 → 302
assert(stoneRowAmount({ value: 20.158, unit: "g", rateBasis: "Per Gram", rate: 15, pieces: 1 }) === 302,
    "20.158 g Per Gram @15 → 302");

// Per Cent: 0.20 ct × 100 × 1500 = 30,000
assert(stoneRowAmount({ value: 0.20, unit: "ct", rateBasis: "Per Cent", rate: 1500, pieces: 1 }) === 30000,
    "0.20 ct Per Cent @1500 → 30,000");

// Per Carat with ct unit: 5 ct × 15 = 75
assert(stoneRowAmount({ value: 5, unit: "ct", rateBasis: "Per Carat", rate: 15, pieces: 1 }) === 75,
    "5 ct Per Carat @15 → 75");

// Per Piece: 3 × 100 = 300
assert(stoneRowAmount({ value: 0, unit: "g", rateBasis: "Per Piece", rate: 100, pieces: 3 }) === 300,
    "3 pcs Per Piece @100 → 300");

// Lumpsum: flat rate, floored
assert(stoneRowAmount({ value: 0, unit: "g", rateBasis: "Lumpsum", rate: 999.9, pieces: 1 }) === 999,
    "Lumpsum 999.9 → 999");

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error("\n❌ Some tests failed!"); process.exit(1); }
else console.log("\n✅ All tests passed!");
