/**
 * API: /api/product-tags
 * GET  — search the product catalog by name for autocomplete suggestions
 * POST — assign the next unique tag caption for a product name (creates the
 *        catalog entry on first use)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@core/database";

const ORG_ID = "org-akhtar";

// Uses the last "real" word of the name (skipping short tokens like karat
// markers, e.g. "21K") so "Gold Bangles 21K" → "BAN", "Diamond Ring" → "RIN".
function generatePrefix(name: string): string {
    const words = name.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "")).filter(Boolean);
    for (let i = words.length - 1; i >= 0; i--) {
        if (words[i].length >= 3) return words[i].slice(0, 3).toUpperCase();
    }
    const joined = words.join("").toUpperCase();
    return (joined + "XXX").slice(0, 3);
}

export async function GET(req: NextRequest) {
    try {
        const q = req.nextUrl.searchParams.get("q")?.trim() || "";

        const products = await prisma.productCatalog.findMany({
            where: {
                orgId: ORG_ID,
                ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
            },
            orderBy: { name: "asc" },
            take: 10,
            select: { name: true, prefix: true },
        });

        return NextResponse.json({ success: true, data: products });
    } catch (error) {
        console.error("GET /api/product-tags error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch product tags" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const name = (body?.name as string)?.trim();

        if (!name) {
            return NextResponse.json(
                { success: false, error: "Product name is required" },
                { status: 400 }
            );
        }

        let product = await prisma.productCatalog.findFirst({
            where: { orgId: ORG_ID, name: { equals: name, mode: "insensitive" } },
        });

        if (!product) {
            product = await prisma.productCatalog.create({
                data: { orgId: ORG_ID, name, prefix: generatePrefix(name) },
            });
        }

        const sequence = await prisma.tagSequence.upsert({
            where: { orgId_prefix: { orgId: ORG_ID, prefix: product.prefix } },
            update: { lastSeq: { increment: 1 } },
            create: { orgId: ORG_ID, prefix: product.prefix, lastSeq: 1 },
        });

        return NextResponse.json({
            success: true,
            data: { tagCaption: `${product.prefix}-${sequence.lastSeq}`, name: product.name, prefix: product.prefix },
        });
    } catch (error) {
        console.error("POST /api/product-tags error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to assign product tag" },
            { status: 500 }
        );
    }
}
