import { NextResponse } from "next/server";
import prisma from "@core/database";

const ORG_ID = "org-akhtar";

export async function GET() {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        const sixtyDaysAgo = new Date(today); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const [
            topParties, salesByCategory, slowMoving, todaySales, yesterdaySales,
            weekSales, monthSales, lastMonthSales, totalReceivable,
        ] = await Promise.all([
            // Top customers by total purchase
            prisma.invoice.groupBy({
                by: ["partyId", "partyName"],
                where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: monthStart } },
                _sum: { totalAmount: true },
                _count: true,
                orderBy: { _sum: { totalAmount: "desc" } },
                take: 5,
            }),

            // Sales by category (using InvoiceItem → category)
            prisma.invoiceItem.groupBy({
                by: ["categoryId"],
                where: { invoice: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: monthStart } } },
                _sum: { totalAmount: true },
                _count: true,
                orderBy: { _sum: { totalAmount: "desc" } },
                take: 5,
            }),

            // Slow moving items (AVAILABLE but not sold in 60 days)
            prisma.inventoryItem.count({
                where: {
                    orgId: ORG_ID, status: "AVAILABLE", deletedAt: null,
                    importedAt: { lt: sixtyDaysAgo },
                },
            }),

            // Sales trend
            prisma.invoice.aggregate({
                where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: today } },
                _sum: { totalAmount: true }, _count: true,
            }),
            prisma.invoice.aggregate({
                where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: yesterday, lt: today } },
                _sum: { totalAmount: true }, _count: true,
            }),
            prisma.invoice.aggregate({
                where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: weekAgo } },
                _sum: { totalAmount: true }, _count: true,
            }),
            prisma.invoice.aggregate({
                where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: monthStart } },
                _sum: { totalAmount: true }, _count: true,
            }),
            prisma.invoice.aggregate({
                where: { orgId: ORG_ID, transactionType: "SALE", status: "FINALIZED", date: { gte: lastMonthStart, lt: monthStart } },
                _sum: { totalAmount: true }, _count: true,
            }),

            // Total receivable
            prisma.payment.aggregate({
                where: { orgId: ORG_ID, status: { in: ["OVERDUE", "PENDING"] }, remainingAmount: { gt: 0 } },
                _sum: { remainingAmount: true },
            }),
        ]);

        // Enrich category names
        const categoryIds = salesByCategory.map((s) => s.categoryId).filter(Boolean) as string[];
        const categoryMap = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
        }).then((cats) => Object.fromEntries(cats.map((c) => [c.id, c.name])));

        const monthTotal = Number(monthSales._sum.totalAmount ?? 0);
        const lastMonthTotal = Number(lastMonthSales._sum.totalAmount ?? 0);
        const monthTrend = lastMonthTotal > 0
            ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100)
            : null;

        return NextResponse.json({
            success: true,
            topCustomers: topParties.map((p) => ({
                name: p.partyName ?? "Unknown",
                total: Number(p._sum.totalAmount ?? 0),
                invoices: p._count,
            })),
            topCategories: salesByCategory.map((s) => ({
                name: s.categoryId ? categoryMap[s.categoryId] ?? "Unknown" : "Uncategorized",
                total: Number(s._sum.totalAmount ?? 0),
                count: s._count,
            })),
            slowMovingItems: slowMoving,
            salesTrend: {
                today: Number(todaySales._sum.totalAmount ?? 0),
                todayCount: todaySales._count,
                yesterday: Number(yesterdaySales._sum.totalAmount ?? 0),
                yesterdayCount: yesterdaySales._count,
                thisWeek: Number(weekSales._sum.totalAmount ?? 0),
                thisMonth: monthTotal,
                lastMonth: lastMonthTotal,
                monthOverMonthPercent: monthTrend,
            },
            totalReceivable: Number(totalReceivable._sum.remainingAmount ?? 0),
        });
    } catch (err) {
        console.error("Insights error:", err);
        return NextResponse.json({ success: false, error: "Failed to load insights" }, { status: 500 });
    }
}
