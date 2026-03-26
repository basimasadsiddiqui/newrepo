import prisma from "@/lib/prisma";
import { calculateJewelleryPrice } from "@/lib/pricing";
import { Prisma } from "@prisma/client";

const ORG_ID = "org-akhtar";

export interface GalleryFilterParams {
    page?: number;
    pageSize?: number;
    search?: string;
    metal?: string;
    category?: string;
    status?: string;
}

export async function getGalleryItems(params: GalleryFilterParams & { orgId?: string }) {
    const {
        page = 1,
        pageSize = 12,
        search = "",
        metal,
        category,
        status,
        orgId
    } = params;

    const offset = (page - 1) * pageSize;

    // Default to the hardcoded ID if no orgId provided (fallback for now, but should be passed)
    // In production this should throw or handle gracefully
    const activeOrgId = orgId || ORG_ID;

    const where: Prisma.InventoryItemWhereInput = {
        deletedAt: null,
        orgId: activeOrgId,
        // Ensure we only show available items (quantity > 0) unless status overrides
        quantity: { gt: 0 }
    };

    if (search) {
        where.OR = [
            { sku: { contains: search, mode: "insensitive" } },
            { product: { name: { contains: search, mode: "insensitive" } } },
            { product: { designCode: { contains: search, mode: "insensitive" } } },
            { designCode: { contains: search, mode: "insensitive" } },
        ];
    }

    if (metal) {
        where.product = {
            ...(where.product as any),
            metalType: { is: { name: { equals: metal, mode: "insensitive" } } }
        };
    }

    if (category) {
        where.product = {
            ...(where.product as any),
            category: { is: { name: { equals: category, mode: "insensitive" } } }
        };
    }

    if (status) {
        where.status = status as import("@prisma/client").StockStatus;
    } else {
        // Default to available if no status specified
        where.status = "AVAILABLE";
    }

    // --- DEBUGGING START ---
    console.log(`[Gallery Debug] Fetching for Org: ${activeOrgId}`);

    // 1. Raw Count (No Filters)
    const rawCount = await prisma.inventoryItem.count({ where: { orgId: activeOrgId } });
    console.log(`[Gallery Debug] Raw Inventory Count (Org Only): ${rawCount}`);

    // 2. Filtered Count
    const filteredCount = await prisma.inventoryItem.count({ where });
    console.log(`[Gallery Debug] Filtered Count: ${filteredCount}`);

    // 3. Log Query Filters
    console.log(`[Gallery Debug] Filters Applied:`, JSON.stringify(where, null, 2));

    // 4. Detailed Image Log
    // items.forEach(item => {
    //     console.log(`[Gallery Image Debug] SKU: ${item.sku}, Product: ${item.product.name}, Image: ${item.product.imageUrl}`);
    // });
    // --- DEBUGGING END ---

    // Query DB
    const [items, total] = await Promise.all([
        prisma.inventoryItem.findMany({
            where,
            include: {
                product: {
                    include: {
                        category: true,
                        metalType: true
                    }
                }
            },
            skip: offset,
            take: pageSize,
            orderBy: { createdAt: "desc" }
        }),
        prisma.inventoryItem.count({ where })
    ]);

    // Debug AFTER fetch to see actual data
    items.forEach(item => {
        console.log(`[Gallery Image Debug] SKU: ${item.sku}, Product: ${item.product.name}, Image: ${item.product.imageUrl}`);
    });

    // Fetch Gold Rate
    const todayGoldRate = await prisma.goldRate.findFirst({
        where: { orgId: activeOrgId },
        orderBy: { date: "desc" }
    });

    const currentRate = todayGoldRate ? Number(todayGoldRate.rate) : 210000;

    // Transform
    const galleryItems = items.map(item => {
        const priceData = calculateJewelleryPrice(item, currentRate);

        return {
            id: item.id,
            title: item.product.name,
            sku: item.sku,
            // Use product image or fallback
            image: item.product.imageUrl || "/placeholder.jpg",
            category: item.product.category?.name,
            metalType: item.product.metalType?.name,
            purity: item.product.metalType?.purity,

            grossWeight: Number(item.grossWeight),
            netWeight: Number(item.netWeight),
            makingCharges: priceData.makingCharges,

            price: priceData.finalPrice,
            priceBreakdown: priceData,

            status: item.status,
            quantity: item.quantity,
        };
    });

    return {
        items: galleryItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        goldRateUsed: currentRate
    };
}
