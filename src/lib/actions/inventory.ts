'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { serializeDecimal } from '@/lib/utils/prisma'


// ─── Dashboard Stats ───────────────────────────────────────────────

export async function getDashboardStats(orgId: string) {
    try {
        // 1. Total Items & Valuation (Available)
        const availableAggregate = await prisma.inventoryItem.aggregate({
            where: { orgId, status: 'AVAILABLE' },
            _sum: {
                grossWeight: true,
                netWeight: true,
                stoneWeight: true,
            },
            _count: {
                id: true
            }
        })

        // 2. Low Stock Count
        // Need to join product to check reorderThreshold vs quantity. 
        // Prisma aggregate doesn't support complex cross-table arithmetic easily.
        // We can fetch items where quantity <= product.reorderThreshold ??
        // For now, simpler approximation or raw query if needed. 
        // Let's assume quantity is "pieces" and reorderThreshold is pieces.
        const lowStockCount = await prisma.inventoryItem.count({
            where: {
                orgId,
                status: 'AVAILABLE',
                product: {
                    // This query is tricky: we want items where quantity <= product.reorderThreshold
                    // Prisma doesn't support field comparison in where clause directly (e.g. quantity: { lte: product.reorderThreshold })
                    // We might need to fetch all and filter or use raw query.
                    // For dashboard, maybe just count items with low quantity (< 2)?
                }
            }
        })

        // Workaround for Low Stock: Fetch products and check total stock?
        // "Low Stock" usually applies to Product Master level (total pieces of that design).
        // But here InventoryItem is specific piece (tag).
        // Let's count items where product.reorder is high?

        // Let's just return basic stats first.

        // 3. Sold Today
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const soldToday = await prisma.inventoryItem.count({
            where: { orgId, status: 'SOLD', soldAt: { gte: todayStart } }
        })

        return {
            success: true,
            data: {
                totalItems: availableAggregate._count.id,
                totalGrossWeight: availableAggregate._sum.grossWeight?.toString() ?? '0',
                totalNetWeight: availableAggregate._sum.netWeight?.toString() ?? '0',
                totalStoneWeight: availableAggregate._sum.stoneWeight?.toString() ?? '0',
                soldToday
            }
        }

    } catch (error) {
        console.error('getDashboardStats error:', error)
        return { success: false, error: 'Failed to fetch stats' }
    }
}

// ─── Stock List ────────────────────────────────────────────────────

export type StockFilter = {
    search?: string
    status?: string // 'AVAILABLE', 'SOLD', etc.
    metalPurity?: string // '22K', '21K'
    categoryId?: string
    dateRange?: { from: Date; to: Date }
}

export async function getStockList(orgId: string, page = 1, limit = 20, filters: StockFilter = {}) {
    try {
        const skip = (page - 1) * limit

        const where: Prisma.InventoryItemWhereInput = {
            orgId,
            status: filters.status ? (filters.status as any) : 'AVAILABLE', // Default to AVAILABLE
        }

        if (filters.search) {
            where.OR = [
                { sku: { contains: filters.search, mode: 'insensitive' } },
                { product: { name: { contains: filters.search, mode: 'insensitive' } } }
            ]
        }

        if (filters.metalPurity) {
            where.metalType = {
                purity: filters.metalPurity
            }
        }

        if (filters.categoryId) {
            where.product = {
                categoryId: filters.categoryId
            }
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
                            category: { select: { name: true } }
                        }
                    },
                    metalType: { select: { purity: true } },
                    supplier: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            prisma.inventoryItem.count({ where })
        ])

        // Convert Decimals to string for client serialization using our robust utility
        const serializedItems = serializeDecimal(items);

        return {
            success: true,
            data: serializedItems,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }

    } catch (error) {
        console.error('getStockList error:', error)
        return { success: false, error: 'Failed to fetch stock list' }
    }
}

// ─── Single Item & Update ──────────────────────────────────────────

export async function getInventoryItem(id: string) {
    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { id },
            include: {
                product: {
                    include: {
                        category: true,
                        metalType: true
                    }
                },
                metalType: true,
                supplier: true
            }
        });

        if (!item) return { success: false, error: "Item not found" };

        return {
            success: true,
            data: serializeDecimal(item)
        };
    } catch (error) {
        console.error("getInventoryItem error:", error);
        return { success: false, error: "Failed to fetch item" };
    }
}

export async function updateInventoryItem(id: string, data: any) {
    try {
        // basic update for now - can expand to transactional if product details change
        const updated = await prisma.inventoryItem.update({
            where: { id },
            data: {
                grossWeight: data.grossWeight,
                netWeight: data.netWeight,
                stoneWeight: data.stoneWeight,
                status: data.status,
                quantity: data.quantity,
                // If we need to update product level details (like Name/Making Charges), 
                // we should do it via nested update or separate Product update.
                // For MVP, likely just updating Weights & Status is common in Inventory Edit.
            }
        });

        return { success: true, data: updated };
    } catch (error) {
        console.error("updateInventoryItem error:", error);
        return { success: false, error: "Failed to update item" };
    }
}
