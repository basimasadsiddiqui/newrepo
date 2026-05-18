import { NextRequest, NextResponse } from "next/server";
import prisma from "@core/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const requestedOrgId =
            req.nextUrl.searchParams.get("branchId") ||
            req.nextUrl.searchParams.get("orgId");
        const requestedStockItemId = req.nextUrl.searchParams.get("stockItemId");

        const baseQuery = {
            include: {
                product: {
                    include: {
                        category: true,
                        metalType: true,
                    },
                },
                metalType: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        } as const;

        const primaryWhere: any = {
            ...(requestedOrgId ? { orgId: requestedOrgId } : { orgId: "org-akhtar" }),
        };

        if (requestedStockItemId) {
            primaryWhere.id = requestedStockItemId;
        } else {
            primaryWhere.status = "AVAILABLE";
        }

        let stockItems = await prisma.inventoryItem.findMany({
            ...baseQuery,
            where: primaryWhere,
        });

        // Backward-compatible fallback for older seeded org IDs.
        if (!requestedOrgId && stockItems.length === 0) {
            stockItems = await prisma.inventoryItem.findMany({
                ...baseQuery,
                where: {
                    orgId: "org-default-001",
                    status: "AVAILABLE",
                    ...(requestedStockItemId ? { id: requestedStockItemId } : {}),
                },
            });
        }

        // Convert Decimal types to numbers/strings for JSON serialization
        const formattedStock = stockItems.map(item => ({
            ...item,
            grossWeight: Number(item.grossWeight),
            netWeight: Number(item.netWeight),
            stoneWeight: Number(item.stoneWeight),
            otherWeight: Number(item.otherWeight),
            retailPrice: Number(item.retailPrice),
            wholesalePrice: Number(item.wholesalePrice),
            makingCharges: item.makingCharges ? Number(item.makingCharges) : null,
            wastagePercent: item.wastagePercent ? Number(item.wastagePercent) : null,
            metalType: item.metalType ? {
                ...item.metalType,
                purityValue: Number(item.metalType.purityValue)
            } : null,
            product: {
                ...item.product,
                makingCharges: Number(item.product.makingCharges),
                wastagePercent: Number(item.product.wastagePercent),
                metalType: item.product.metalType ? {
                    ...item.product.metalType,
                    purityValue: Number(item.product.metalType.purityValue)
                } : null
            }
        }));

        return NextResponse.json({
            success: true,
            data: formattedStock,
        });
    } catch (error) {
        console.error("GET /api/stock error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch stock items" },
            { status: 500 }
        );
    }
}
