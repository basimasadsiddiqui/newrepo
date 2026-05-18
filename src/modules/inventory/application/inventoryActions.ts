"use server";

import prisma from "@core/database";
import { Prisma } from "@prisma/client";
import { serializeDecimal } from "@shared/utils";

// ─── Dashboard Stats ──────────────────────────────────────────────────────

export async function getDashboardStats(orgId: string) {
    try {
        const availableAggregate = await prisma.inventoryItem.aggregate({
            where: { orgId, status: "AVAILABLE" },
            _sum: { grossWeight: true, netWeight: true, stoneWeight: true },
            _count: { id: true },
        });

        const lowStockCount = await prisma.inventoryItem.count({
            where: { orgId, status: "AVAILABLE", product: {} },
        });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const soldToday = await prisma.inventoryItem.count({
            where: { orgId, status: "SOLD", soldAt: { gte: todayStart } },
        });

        return {
            success: true,
            data: {
                totalItems: availableAggregate._count.id,
                totalGrossWeight: availableAggregate._sum.grossWeight?.toString() ?? "0",
                totalNetWeight: availableAggregate._sum.netWeight?.toString() ?? "0",
                totalStoneWeight: availableAggregate._sum.stoneWeight?.toString() ?? "0",
                soldToday,
            },
        };
    } catch (error) {
        console.error("getDashboardStats error:", error);
        return { success: false, error: "Failed to fetch stats" };
    }
}

// ─── Stock Filter ─────────────────────────────────────────────────────────

export type StockFilter = {
    search?: string;
    status?: string;
    metalPurity?: string;
    categoryId?: string;
    dateRange?: { from: Date; to: Date };
};

// ─── Stock List ───────────────────────────────────────────────────────────

export async function getStockList(
    orgId: string,
    page = 1,
    limit = 20,
    filters: StockFilter = {}
) {
    try {
        const skip = (page - 1) * limit;

        const where: Prisma.InventoryItemWhereInput = {
            orgId,
            status: filters.status ? (filters.status as any) : "AVAILABLE",
        };

        if (filters.search) {
            where.OR = [
                { sku: { contains: filters.search, mode: "insensitive" } },
                { product: { name: { contains: filters.search, mode: "insensitive" } } },
            ];
        }

        if (filters.metalPurity) {
            where.metalType = { purity: filters.metalPurity };
        }

        if (filters.categoryId) {
            where.product = { categoryId: filters.categoryId };
        }

        const [items, total] = await Promise.all([
            prisma.inventoryItem.findMany({
                where,
                select: {
                    id: true,
                    sku: true,
                    grossWeight: true,
                    netWeight: true,
                    stoneWeight: true,
                    status: true,
                    product: {
                        select: {
                            id: true,
                            name: true,
                            imageUrl: true,
                            makingCharges: true,
                            category: { select: { name: true } },
                        },
                    },
                    metalType: { select: { purity: true } },
                    supplier: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip,
            }),
            prisma.inventoryItem.count({ where }),
        ]);

        const serializedItems = serializeDecimal(items);

        return {
            success: true,
            data: serializedItems,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error("getStockList error:", error);
        return { success: false, error: "Failed to fetch stock list" };
    }
}

// ─── Single Item & Update ─────────────────────────────────────────────────

export async function getInventoryItem(id: string) {
    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { id },
            include: {
                product: { include: { category: true, metalType: true } },
                metalType: true,
                supplier: true,
            },
        });

        if (!item) return { success: false, error: "Item not found" };

        return { success: true, data: serializeDecimal(item) };
    } catch (error) {
        console.error("getInventoryItem error:", error);
        return { success: false, error: "Failed to fetch item" };
    }
}

export async function updateInventoryItem(id: string, data: any) {
    try {
        const updated = await prisma.inventoryItem.update({
            where: { id },
            data: {
                grossWeight: data.grossWeight,
                netWeight: data.netWeight,
                stoneWeight: data.stoneWeight,
                status: data.status,
                quantity: data.quantity,
            },
        });

        return { success: true, data: updated };
    } catch (error) {
        console.error("updateInventoryItem error:", error);
        return { success: false, error: "Failed to update item" };
    }
}
