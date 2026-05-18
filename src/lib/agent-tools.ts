/**
 * ERP Agent Tools — every function an AI agent can call against the database.
 * Read-only tools are safe to auto-execute.
 * Write tools are flagged requiresConfirmation = true.
 */
import prisma from "@/lib/prisma";

const ORG_ID = "org-akhtar";

export interface AgentTool {
    name: string;
    description: string;           // shown to the AI
    parameters: Record<string, unknown>; // JSON Schema
    requiresConfirmation?: boolean;
    execute: (input: Record<string, unknown>) => Promise<unknown>;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const ALL_TOOLS: AgentTool[] = [
    {
        name: "search_party",
        description: "Search for a customer or supplier by name. Returns id, name, balance, goldBalance, type, mobile.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string", description: "Full or partial name to search" },
            },
            required: ["name"],
        },
        execute: async ({ name }) => {
            return prisma.party.findMany({
                where: { orgId: ORG_ID, name: { contains: String(name), mode: "insensitive" } },
                select: { id: true, name: true, balance: true, goldBalance: true, type: true, mobile: true },
                take: 5,
            });
        },
    },

    {
        name: "get_party_ledger",
        description: "Get recent transaction history (ledger) for a specific party by their id.",
        parameters: {
            type: "object",
            properties: {
                partyId: { type: "string", description: "The party's id from search_party" },
                limit: { type: "number", description: "Max rows to return, default 10" },
            },
            required: ["partyId"],
        },
        execute: async ({ partyId, limit = 10 }) => {
            return prisma.ledgerEntry.findMany({
                where: { orgId: ORG_ID, partyId: String(partyId) },
                orderBy: { date: "desc" },
                take: Number(limit),
                select: { type: true, amount: true, balance: true, narration: true, date: true },
            });
        },
    },

    {
        name: "get_invoices",
        description: "Get invoices filtered by status or party name. Status: DRAFT, FINALIZED, CANCELLED.",
        parameters: {
            type: "object",
            properties: {
                partyName: { type: "string", description: "Filter by party name (optional)" },
                status: { type: "string", enum: ["DRAFT", "FINALIZED", "CANCELLED"], description: "Invoice status filter (optional)" },
                type: { type: "string", enum: ["SALE", "PURCHASE"], description: "Transaction type (optional)" },
                limit: { type: "number", description: "Max results, default 10" },
            },
        },
        execute: async ({ partyName, status, type: txType, limit = 10 }) => {
            return prisma.invoice.findMany({
                where: {
                    orgId: ORG_ID,
                    ...(status ? { status: status as "DRAFT" | "FINALIZED" | "CANCELLED" } : {}),
                    ...(txType ? { transactionType: txType as "SALE" | "PURCHASE" } : {}),
                    ...(partyName ? { partyName: { contains: String(partyName), mode: "insensitive" } } : {}),
                },
                orderBy: { date: "desc" },
                take: Number(limit),
                select: {
                    orderNumber: true, date: true, status: true, transactionType: true,
                    partyName: true, totalAmount: true, balance: true,
                },
            });
        },
    },

    {
        name: "get_overdue_payments",
        description: "Get all overdue or pending payments. Returns party name, amount due, due date, days overdue.",
        parameters: { type: "object", properties: {} },
        execute: async () => {
            const now = new Date();
            const rows = await prisma.payment.findMany({
                where: {
                    orgId: ORG_ID,
                    status: { in: ["OVERDUE", "PENDING"] },
                    dueDate: { lt: now },
                    remainingAmount: { gt: 0 },
                },
                include: { party: { select: { name: true, mobile: true } } },
                orderBy: { remainingAmount: "desc" },
                take: 20,
            });
            return rows.map((r) => ({
                partyName: r.party.name,
                mobile: r.party.mobile,
                remaining: Number(r.remainingAmount),
                dueDate: r.dueDate,
                daysOverdue: Math.floor((now.getTime() - r.dueDate.getTime()) / 86400000),
            }));
        },
    },

    {
        name: "get_metal_rates",
        description: "Get current metal rates (gold, silver, etc.) in PKR per gram.",
        parameters: { type: "object", properties: {} },
        execute: async () => {
            return prisma.metalRate.findMany({
                where: { orgId: ORG_ID },
                select: { metal: true, ratePerGram: true, lastUpdated: true },
            });
        },
    },

    {
        name: "get_sales_summary",
        description: "Get sales totals for today, this week, or this month.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["today", "week", "month"], description: "Time period" },
            },
            required: ["period"],
        },
        execute: async ({ period }) => {
            const now = new Date();
            const start = new Date(now);
            if (period === "today") { start.setHours(0, 0, 0, 0); }
            else if (period === "week") { start.setDate(start.getDate() - 7); }
            else { start.setDate(1); start.setHours(0, 0, 0, 0); }

            const [sales, purchases] = await Promise.all([
                prisma.invoice.aggregate({
                    where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: start } },
                    _sum: { totalAmount: true }, _count: true,
                }),
                prisma.invoice.aggregate({
                    where: { orgId: ORG_ID, transactionType: "PURCHASE", status: "FINALIZED", date: { gte: start } },
                    _sum: { totalAmount: true }, _count: true,
                }),
            ]);
            return {
                period,
                sales: { count: sales._count, total: Number(sales._sum.totalAmount ?? 0) },
                purchases: { count: purchases._count, total: Number(purchases._sum.totalAmount ?? 0) },
            };
        },
    },

    {
        name: "search_inventory",
        description: "Search available inventory items by keyword, category name, or metal type name.",
        parameters: {
            type: "object",
            properties: {
                keyword: { type: "string", description: "Search term for product name or description" },
                status: { type: "string", enum: ["AVAILABLE", "SOLD", "RESERVED"], description: "Stock status (default AVAILABLE)" },
                limit: { type: "number", description: "Max results, default 10" },
            },
        },
        execute: async ({ keyword, status = "AVAILABLE", limit = 10 }) => {
            const where: Record<string, unknown> = {
                orgId: ORG_ID,
                status: status,
                deletedAt: null,
            };
            if (keyword) {
                where.product = {
                    OR: [
                        { name: { contains: String(keyword), mode: "insensitive" } },
                        { description: { contains: String(keyword), mode: "insensitive" } },
                        { designCode: { contains: String(keyword), mode: "insensitive" } },
                    ],
                };
            }
            return prisma.inventoryItem.findMany({
                where,
                include: {
                    product: {
                        select: {
                            name: true, designCode: true,
                            category: { select: { name: true } },
                            metalType: { select: { name: true, purity: true } },
                        },
                    },
                },
                take: Number(limit),
                orderBy: { importedAt: "desc" },
            });
        },
    },

    {
        name: "get_customer_orders",
        description: "Get customer orders filtered by status. Status: PENDING, COMPLETED, CANCELLED.",
        parameters: {
            type: "object",
            properties: {
                status: { type: "string", enum: ["PENDING", "COMPLETED", "CANCELLED"] },
                limit: { type: "number", description: "Max results, default 10" },
            },
        },
        execute: async ({ status = "PENDING", limit = 10 }) => {
            return prisma.customerOrder.findMany({
                where: { orgId: ORG_ID, status: status as "PENDING" | "COMPLETED" | "CANCELLED" },
                include: {
                    party: { select: { name: true } },
                    items: { select: { description: true, quantity: true, weight: true, totalAmount: true } },
                },
                orderBy: { date: "desc" },
                take: Number(limit),
            });
        },
    },

    // ── Write tools (require confirmation) ─────────────────────────────────────

    {
        name: "update_metal_rate",
        description: "Update the rate per gram for a metal (e.g. gold). Use this when asked to set or update a gold/silver rate.",
        requiresConfirmation: true,
        parameters: {
            type: "object",
            properties: {
                metal: { type: "string", description: "Metal name, e.g. 'Gold 24K', 'Silver'" },
                ratePerGram: { type: "number", description: "New rate in PKR per gram" },
            },
            required: ["metal", "ratePerGram"],
        },
        execute: async ({ metal, ratePerGram }) => {
            const rate = await prisma.metalRate.updateMany({
                where: { orgId: ORG_ID, metal: { contains: String(metal), mode: "insensitive" } },
                data: { ratePerGram: Number(ratePerGram), lastUpdated: new Date() },
            });
            if (rate.count === 0) {
                await prisma.metalRate.create({
                    data: { orgId: ORG_ID, metal: String(metal), ratePerGram: Number(ratePerGram) },
                });
            }
            return { updated: true, metal, ratePerGram };
        },
    },
];

export const READ_TOOLS = ALL_TOOLS.filter((t) => !t.requiresConfirmation);
export const ALL_TOOL_NAMES = ALL_TOOLS.map((t) => t.name);

export function getToolsByName(names: string[]): AgentTool[] {
    return ALL_TOOLS.filter((t) => names.includes(t.name));
}

export function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    const tool = ALL_TOOLS.find((t) => t.name === name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.execute(input);
}
