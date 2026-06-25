/**
 * ============================================================================
 * Unit Tests – Agent Intent Detection (Puter browser agent heuristics)
 * ============================================================================
 *
 * Run with: npx tsx src/__tests__/agent-intent.test.ts
 * ============================================================================
 */

import { detectTools, extractPartyName, extractOrderNumber } from "../lib/agent-intent";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
    if (condition) { passed++; console.log(`  ✓ ${testName}`); }
    else { failed++; console.error(`  ✗ FAIL: ${testName}`); }
}

function assertEq<T>(actual: T, expected: T, testName: string) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { passed++; console.log(`  ✓ ${testName}`); }
    else { failed++; console.error(`  ✗ FAIL: ${testName} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

// ─── extractOrderNumber ────────────────────────────────────────
console.log("\n🔢 extractOrderNumber");
assertEq(extractOrderNumber("invoice 142 ka detail batao"), 142, "'invoice 142' -> 142");
assertEq(extractOrderNumber("bill #57 mein kya tha"), 57, "'bill #57' -> 57");
assertEq(extractOrderNumber("order 9 dikhao"), 9, "'order 9' -> 9");
assertEq(extractOrderNumber("receipt#88"), 88, "'receipt#88' -> 88");
assertEq(extractOrderNumber("Ahmed ka balance"), null, "no number -> null");
assertEq(extractOrderNumber("2 tola ki 22 karat ring"), null, "weights/carat are not invoice numbers");

// ─── detectTools ───────────────────────────────────────────────
console.log("\n🧭 detectTools");
{
    const t = detectTools("invoice 142 ka detail batao");
    assert(t.includes("get_invoice_by_number"), "invoice #N -> get_invoice_by_number");
    assert(!t.includes("get_invoices"), "invoice #N does NOT also trigger the invoice list");
}
assertEq(detectTools("kaarobar aaj kaisa chal raha hai"), ["get_business_overview"], "business overview intent");
assertEq(detectTools("hello there"), ["get_business_overview"], "unknown query -> business overview fallback");
{
    const t = detectTools("Ahmed ka pura hisaab dikhao");
    assert(t.includes("get_party_summary"), "party intent -> get_party_summary");
    assert(t.includes("get_party_ledger"), "'pura hisaab' also pulls the ledger");
}
assert(detectTools("sabse zyada bakaya kiska hai").includes("get_overdue_payments"), "'bakaya' -> get_overdue_payments");
assert(detectTools("gold rate kya hai").includes("get_metal_rates"), "'gold rate' -> get_metal_rates");
assert(!detectTools("gold rate kya hai").includes("get_party_summary"), "'gold rate' is not a party query");
assert(detectTools("gold ring stock mein hai").includes("search_inventory"), "'stock' -> search_inventory");
{
    const t = detectTools("invoice list aur sales total dikhao");
    assert(t.includes("get_invoices"), "invoice list (no #) -> get_invoices");
    assert(t.includes("get_sales_summary"), "'sales total' -> get_sales_summary");
    assert(!t.includes("get_invoice_by_number"), "no number -> no single-invoice lookup");
}
{
    const t = detectTools("Ahmed ka hisaab aur baqaya dono dikhao");
    assert(new Set(t).size === t.length, "result contains no duplicate tools");
}

// ─── extractPartyName (regression: name corruption) ────────────
console.log("\n👤 extractPartyName");
assertEq(extractPartyName("Karim ka balance"), "Karim", "REGRESSION: 'Karim' not mangled to 'rim'");
assertEq(extractPartyName("Mehmood ka hisaab dikhao"), "Mehmood", "REGRESSION: 'Mehmood' not mangled to 'hmood'");
assertEq(extractPartyName("Ahmed Khan ka pura hisaab"), "Ahmed Khan", "two-word name preserved");
assertEq(extractPartyName("Bilal ka khata"), "Bilal", "single name extracted");
assertEq(extractPartyName("balance dikhao"), null, "no name -> null");

// ─── Results ───────────────────────────────────────────────────
console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) { console.error("\n❌ Some tests failed!"); process.exit(1); }
else { console.log("\n✅ All tests passed!"); }
