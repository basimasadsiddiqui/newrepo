/**
 * Pure intent-detection helpers for the browser-side (Puter.js) agent.
 *
 * Extracted from usePuterAgent so the heuristics carry no React/DOM dependency
 * and can be unit-tested in isolation. The Puter agent has no real tool-calling,
 * so these functions decide which ERP read-tools to pre-fetch and pull the
 * arguments (party name, invoice number) out of free Urdu/English text.
 */

/** Pull an invoice/bill order number out of the message, if one is referenced. */
export function extractOrderNumber(msg: string): number | null {
    const m = msg.match(/(?:invoice|bill|order|receipt)\s*#?\s*(\d+)/i) || msg.match(/#\s*(\d+)/);
    return m ? Number(m[1]) : null;
}

/** Decide which read-tools to pre-fetch for a message. Order is preserved, de-duped. */
export function detectTools(msg: string): string[] {
    const m = msg.toLowerCase();
    const tools: string[] = [];

    const hasInvoiceNumber = extractOrderNumber(msg) !== null;

    // A specific invoice referenced by number → fetch just that invoice.
    if (hasInvoiceNumber && /invoice|bill|order|receipt|#/.test(m))
        tools.push("get_invoice_by_number");

    // General "how's business" snapshot.
    if (/overview|summary|business kais|kaisa chal|kaisi chal|how.?s business|snapshot|kaarobar|karobar|aaj ka din|din kaisa|dukan kais/.test(m))
        tools.push("get_business_overview");

    // Party intent — keyword-driven (NOT a hardcoded name list, which only ever
    // matched ~5 people and silently ignored everyone else). get_party_summary
    // returns balances + recent invoices + outstanding in one shot.
    if (/party|customer|supplier|balan|hisaab|hisab|khata|khaata|ledger|account|baqaya|bakaya|udhaar|udhar|len.?den|position|owe/.test(m))
        tools.push("get_party_summary");
    if (/ledger|transaction|history|payment history|pura hisaab/.test(m))
        tools.push("get_party_ledger");
    if (/overdue|pending payment|baqaya|bakaya|due|unpaid|outstanding/.test(m))
        tools.push("get_overdue_payments");
    // Invoice *list* — only when not already asking for one specific invoice.
    if (!hasInvoiceNumber && /invoice|bill|sale|purchase|order list/.test(m))
        tools.push("get_invoices");
    if (/stock|inventory|item|product|available|maal|cheez/.test(m))
        tools.push("search_inventory");
    if (/gold rate|silver rate|metal rate|sona rate|chandi rate|rate today/.test(m))
        tools.push("get_metal_rates");
    if (/sales|today sale|aaj ki|farokht|revenue|total/.test(m))
        tools.push("get_sales_summary");
    if (/custom order|karigar|pending order/.test(m))
        tools.push("get_customer_orders");

    // De-dup while preserving order.
    const unique = [...new Set(tools)];
    // Default to a business snapshot — the most generally useful answer.
    return unique.length > 0 ? unique : ["get_business_overview"];
}

/** Extract a likely party name from an Urdu/English message. */
export function extractPartyName(msg: string): string | null {
    // Word-boundary anchored so we strip whole stop-words only — an un-anchored
    // regex corrupts real names (e.g. "Karim" -> "rim", "Mehmood" -> "hmood").
    const STOP = [
        "ka", "ki", "ke", "kuch", "kahan", "hai", "hain", "dikhao", "batao", "check",
        "karo", "pura", "puro", "hisaab", "hisab", "khata", "khaata", "balance", "ledger",
        "account", "show", "me", "the", "of", "for", "party", "customer", "supplier",
        "search", "find", "ek", "aik", "yeh", "woh", "unka", "uska", "dono", "kya",
        "baqaya", "bakaya", "udhaar", "udhar",
    ];
    const cleaned = msg
        .replace(new RegExp(`\\b(${STOP.join("|")})\\b`, "gi"), " ")
        .replace(/\s+/g, " ")
        .trim();
    const words = cleaned.split(" ").filter((w) => w.length > 2 && !/^\d+$/.test(w));
    return words.length > 0 ? words.slice(0, 2).join(" ") : null;
}
