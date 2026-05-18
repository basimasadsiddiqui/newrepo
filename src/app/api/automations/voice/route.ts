import { NextRequest, NextResponse } from "next/server";
import { QuotaError, quotaErrorResponse } from "@modules/ai-automation/application/quotaError";
import prisma from "@core/database";
import { getActiveProviderKey } from "@/lib/ai-key-manager";
import { aiChat } from "@/lib/ai-providers";

const ORG_ID = "org-akhtar";

// ── Offline rule-based queries ────────────────────────────────────────────────

function detectIntent(text: string) {
    const t = text.toLowerCase();
    if (/(balance|owe|credit|debit|khata|ledger|party|customer|supplier)/.test(t)) return "party_balance";
    if (/(overdue|pending payment|unpaid|due payment|outstanding)/.test(t)) return "overdue_payments";
    if (/(stock|inventory|available|item|product)/.test(t)) return "inventory";
    if (/(gold rate|metal rate|rate today|current rate|price per gram|rate per gram)/.test(t)) return "metal_rates";
    if (/(sales|sold|revenue|invoice|total today|today sale)/.test(t)) return "sales_summary";
    if (/(order|custom order|karigar|pending order)/.test(t)) return "customer_orders";
    return "help";
}

function extractName(text: string): string {
    return text
        .replace(/(balance|owe|credit|debit|khata|ledger|check|show|what|is|the|of|for|party|customer|supplier|me|please)/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

async function handleOffline(message: string): Promise<string> {
    const intent = detectIntent(message);
    switch (intent) {
        case "party_balance": {
            const name = extractName(message);
            if (name.length > 2) {
                const matches = await prisma.party.findMany({
                    where: { orgId: ORG_ID, name: { contains: name, mode: "insensitive" } },
                    select: { name: true, balance: true, goldBalance: true, type: true },
                    take: 5,
                });
                if (matches.length === 0) return `No party found matching "${name}".`;
                return matches.map((p) =>
                    `${p.name} (${p.type})\n  Cash: PKR ${Number(p.balance).toLocaleString()}\n  Gold: ${Number(p.goldBalance).toFixed(3)} g`
                ).join("\n\n");
            }
            const top = await prisma.party.findMany({
                where: { orgId: ORG_ID, balance: { gt: 0 } },
                orderBy: { balance: "desc" }, take: 8,
                select: { name: true, balance: true },
            });
            if (top.length === 0) return "No outstanding balances found.";
            return "Top outstanding balances:\n" + top.map((p) => `  ${p.name}: PKR ${Number(p.balance).toLocaleString()}`).join("\n");
        }
        case "overdue_payments": {
            const payments = await prisma.payment.findMany({
                where: { orgId: ORG_ID, status: { in: ["OVERDUE", "PENDING"] }, dueDate: { lt: new Date() }, remainingAmount: { gt: 0 } },
                include: { party: { select: { name: true } } },
                orderBy: { remainingAmount: "desc" }, take: 10,
            });
            if (payments.length === 0) return "No overdue payments found.";
            return `${payments.length} overdue payment(s):\n` +
                payments.map((p) => `  ${p.party.name}: PKR ${Number(p.remainingAmount).toLocaleString()} — due ${p.dueDate.toLocaleDateString()}`).join("\n");
        }
        case "inventory": {
            const [available, lowStock] = await Promise.all([
                prisma.inventoryItem.count({ where: { orgId: ORG_ID, status: "AVAILABLE", deletedAt: null } }),
                prisma.inventoryItem.count({ where: { orgId: ORG_ID, status: "AVAILABLE", quantity: { lte: 2 }, deletedAt: null } }),
            ]);
            return `Inventory:\n  Available: ${available}\n  Low stock (≤2 units): ${lowStock}`;
        }
        case "metal_rates": {
            const rates = await prisma.metalRate.findMany({ where: { orgId: ORG_ID } });
            if (rates.length === 0) return "No metal rates set. Please update in Settings.";
            return "Current Rates:\n" + rates.map((r) => `  ${r.metal}: PKR ${Number(r.ratePerGram).toLocaleString()}/g`).join("\n");
        }
        case "sales_summary": {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const sales = await prisma.invoice.aggregate({
                where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: today } },
                _sum: { totalAmount: true }, _count: true,
            });
            return `Today's Sales:\n  Invoices: ${sales._count}\n  Total: PKR ${Number(sales._sum.totalAmount ?? 0).toLocaleString()}`;
        }
        case "customer_orders": {
            const pending = await prisma.customerOrder.findMany({
                where: { orgId: ORG_ID, status: "PENDING" },
                include: { party: { select: { name: true } } },
                orderBy: { date: "desc" }, take: 10,
            });
            if (pending.length === 0) return "No pending customer orders.";
            return `${pending.length} pending order(s):\n` +
                pending.map((o) => `  #${o.orderNumber} — ${o.party?.name ?? o.customCustomerName ?? "Unknown"} — PKR ${Number(o.totalAmount).toLocaleString()}`).join("\n");
        }
        default:
            return "I can help with:\n  • Party balances\n  • Overdue payments\n  • Inventory status\n  • Metal rates\n  • Today's sales\n  • Pending orders";
    }
}

// ── Online: use active AI provider ────────────────────────────────────────────

async function buildContext(message: string) {
    const t = message.toLowerCase();
    const ctx: Record<string, unknown> = {};
    const fetches: Promise<void>[] = [];

    if (/(balance|party|customer|supplier|khata|owe)/.test(t))
        fetches.push(prisma.party.findMany({ where: { orgId: ORG_ID }, select: { name: true, balance: true, goldBalance: true, type: true }, orderBy: { name: "asc" } }).then((d) => { ctx.parties = d; }));
    if (/(payment|overdue|due|unpaid|outstanding)/.test(t))
        fetches.push(prisma.payment.findMany({ where: { orgId: ORG_ID, status: { in: ["OVERDUE", "PENDING"] }, remainingAmount: { gt: 0 } }, include: { party: { select: { name: true } } }, orderBy: { remainingAmount: "desc" }, take: 15 }).then((d) => { ctx.overduePayments = d; }));
    if (/(stock|inventory|item|product|available)/.test(t))
        fetches.push(prisma.inventoryItem.groupBy({ by: ["status"], where: { orgId: ORG_ID, deletedAt: null }, _count: { status: true } }).then((d) => { ctx.inventoryStats = d; }));
    if (/(gold rate|metal rate|rate|price)/.test(t))
        fetches.push(prisma.metalRate.findMany({ where: { orgId: ORG_ID } }).then((d) => { ctx.metalRates = d; }));
    if (/(sales|sold|revenue|invoice)/.test(t)) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        fetches.push(prisma.invoice.aggregate({ where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: today } }, _sum: { totalAmount: true }, _count: true }).then((d) => { ctx.todaySales = d; }));
    }
    if (/(order|karigar|custom)/.test(t))
        fetches.push(prisma.customerOrder.findMany({ where: { orgId: ORG_ID, status: "PENDING" }, include: { party: { select: { name: true } } }, take: 10 }).then((d) => { ctx.pendingOrders = d; }));

    if (fetches.length === 0) {
        fetches.push(Promise.all([
            prisma.inventoryItem.count({ where: { orgId: ORG_ID, status: "AVAILABLE", deletedAt: null } }),
            prisma.payment.count({ where: { orgId: ORG_ID, status: "OVERDUE" } }),
            prisma.metalRate.findMany({ where: { orgId: ORG_ID } }),
        ]).then(([items, overdue, rates]) => { ctx.quickStats = { availableItems: items, overduePayments: overdue, metalRates: rates }; }));
    }

    await Promise.all(fetches);
    return ctx;
}

async function handleOnline(message: string, history: { role: string; content: string }[]): Promise<{ text: string; provider: string }> {
    const context = await buildContext(message);

    const systemPrompt = `You are an AI assistant for Akhtar Jewellers ERP system (Pakistani jewellery shop).
Answer questions concisely based on the database data provided. Use PKR for currency, grams for weight.
Current DB data: ${JSON.stringify(context, null, 2)}
Rules: Be concise (max 5 lines). State clearly if data isn't available. Never make up numbers.`;

    const messages = [
        ...history.slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: message },
    ];

    return aiChat(systemPrompt, messages, 400);
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET() {
    const active = await getActiveProviderKey();
    return NextResponse.json({ online: !!active, provider: active?.provider.name ?? null });
}

export async function POST(req: NextRequest) {
    try {
        const { message, history = [] } = await req.json();
        if (!message?.trim()) return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });

        const active = await getActiveProviderKey();

        if (active) {
            try {
                const { text, provider } = await handleOnline(message, history);
                return NextResponse.json({ success: true, reply: text, mode: "online", provider });
            } catch (err) {
                if (err instanceof QuotaError) {
                    return NextResponse.json(quotaErrorResponse(err), { status: 402 });
                }
                console.warn("AI call failed, falling back to offline:", err);
            }
        }

        const reply = await handleOffline(message);
        return NextResponse.json({ success: true, reply, mode: "offline", provider: null });
    } catch (err) {
        console.error("Voice API error:", err);
        return NextResponse.json({ success: false, error: "Failed to process request" }, { status: 500 });
    }
}
