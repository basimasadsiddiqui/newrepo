import { NextResponse } from "next/server";
import prisma from "@core/database";
import { getActiveProviderKey, isProviderPuterLLM } from "@/lib/ai-key-manager";
import { aiChat } from "@/lib/ai-providers";

const ORG_ID = "org-akhtar";

async function gatherDigestData() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
        todaySales, monthSales, todayPayments,
        availableItems, lowStock, overduePayments, pendingOrders,
        metalRates,
    ] = await Promise.all([
        prisma.invoice.aggregate({
            where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: today } },
            _sum: { totalAmount: true }, _count: true,
        }),
        prisma.invoice.aggregate({
            where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: monthStart } },
            _sum: { totalAmount: true }, _count: true,
        }),
        prisma.paymentTransaction.aggregate({
            where: { date: { gte: today } },
            _sum: { amount: true }, _count: true,
        }),
        prisma.inventoryItem.count({ where: { orgId: ORG_ID, status: "AVAILABLE", deletedAt: null } }),
        prisma.inventoryItem.count({ where: { orgId: ORG_ID, status: "AVAILABLE", quantity: { lte: 2 }, deletedAt: null } }),
        prisma.payment.count({ where: { orgId: ORG_ID, status: { in: ["OVERDUE", "PENDING"] }, dueDate: { lt: new Date() }, remainingAmount: { gt: 0 } } }),
        prisma.customerOrder.count({ where: { orgId: ORG_ID, status: "PENDING" } }),
        prisma.metalRate.findMany({ where: { orgId: ORG_ID } }),
    ]);

    return {
        date: today.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        todaySales: { count: todaySales._count, total: Number(todaySales._sum.totalAmount ?? 0) },
        monthSales: { count: monthSales._count, total: Number(monthSales._sum.totalAmount ?? 0) },
        todayPayments: { count: todayPayments._count, total: Number(todayPayments._sum.amount ?? 0) },
        inventory: { available: availableItems, lowStock },
        overduePayments,
        pendingOrders,
        metalRates: metalRates.map((r) => ({ metal: r.metal, rate: Number(r.ratePerGram) })),
    };
}

export async function GET() {
    try {
        const [data, active, isPuter] = await Promise.all([
            gatherDigestData(),
            getActiveProviderKey(),
            isProviderPuterLLM(),
        ]);

        // Puter.js mode — return raw data so client calls Puter browser-side
        if (isPuter) {
            return NextResponse.json({
                success: true, data, mode: "puter",
                puterSystemPrompt: "You are a business assistant for Akhtar Jewellers, a Pakistani jewellery shop. Write a warm, professional end-of-day business digest in 10-12 lines. Use PKR for currency. Be encouraging about good numbers, flag concerns. No markdown — plain readable text. Start with: 'Good evening — here is your business summary for today:'",
                puterUserPrompt: `Generate a daily digest from this data: ${JSON.stringify(data, null, 2)}`,
            });
        }

        let digest: string;
        let usedProvider: string | null = null;

        if (active) {
            try {
                const { text, provider } = await aiChat(
                    "You are a business assistant for Akhtar Jewellers, a Pakistani jewellery shop. Write a warm, professional end-of-day business digest in 10-12 lines. Use PKR for currency. Be encouraging about good numbers, flag concerns clearly. No markdown, plain readable text. Start with a greeting like 'Good evening — here is your business summary for today:'",
                    [{ role: "user", content: `Generate a daily digest from this data: ${JSON.stringify(data, null, 2)}` }],
                    600,
                );
                digest = text;
                usedProvider = provider;
            } catch {
                digest = formatOfflineDigest(data);
            }
        } else {
            digest = formatOfflineDigest(data);
        }

        return NextResponse.json({ success: true, digest, data, mode: active ? "online" : "offline", provider: usedProvider });
    } catch (err) {
        console.error("Daily digest error:", err);
        return NextResponse.json({ success: false, error: "Failed to generate digest" }, { status: 500 });
    }
}

function formatOfflineDigest(data: ReturnType<typeof gatherDigestData> extends Promise<infer T> ? T : never): string {
    const lines = [
        `Daily Business Summary — ${data.date}`,
        ``,
        `SALES`,
        `  Today: ${data.todaySales.count} invoice(s) — PKR ${data.todaySales.total.toLocaleString()}`,
        `  This month: ${data.monthSales.count} invoice(s) — PKR ${data.monthSales.total.toLocaleString()}`,
        ``,
        `PAYMENTS COLLECTED TODAY`,
        `  ${data.todayPayments.count} transaction(s) — PKR ${data.todayPayments.total.toLocaleString()}`,
        ``,
        `INVENTORY`,
        `  Available items: ${data.inventory.available}`,
        data.inventory.lowStock > 0 ? `  ⚠ Low stock items (≤2 units): ${data.inventory.lowStock}` : `  Stock levels look good`,
        ``,
        `FOLLOW-UPS NEEDED`,
        `  Overdue payments: ${data.overduePayments}`,
        `  Pending customer orders: ${data.pendingOrders}`,
        ``,
        data.metalRates.length > 0
            ? `METAL RATES\n${data.metalRates.map((r) => `  ${r.metal}: PKR ${r.rate.toLocaleString()}/g`).join("\n")}`
            : "",
    ];
    return lines.filter(Boolean).join("\n");
}
