import { NextRequest, NextResponse } from "next/server";
import { QuotaError, quotaErrorResponse } from "@modules/ai-automation/application/quotaError";
import prisma from "@core/database";
import { getActiveProviderKey } from "@/lib/ai-key-manager";
import { aiAnalyzeImage } from "@/lib/ai-providers";

const ORG_ID = "org-akhtar";

// ── Offline: filter-based inventory search ───────────────────────────────────

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const metalTypeId = searchParams.get("metalTypeId") || undefined;
    const keyword = searchParams.get("keyword") || undefined;

    const [categories, metalTypes] = await Promise.all([
        prisma.category.findMany({ where: { orgId: ORG_ID, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        prisma.metalType.findMany({ where: { orgId: ORG_ID, isActive: true }, select: { id: true, name: true, purity: true }, orderBy: { name: "asc" } }),
    ]);

    if (!categoryId && !metalTypeId && !keyword) {
        return NextResponse.json({ success: true, categories, metalTypes, results: [] });
    }

    const whereProduct: Record<string, unknown> = { orgId: ORG_ID };
    if (categoryId) whereProduct.categoryId = categoryId;
    if (metalTypeId) whereProduct.metalTypeId = metalTypeId;
    if (keyword) {
        whereProduct.OR = [
            { name: { contains: keyword, mode: "insensitive" } },
            { description: { contains: keyword, mode: "insensitive" } },
            { designCode: { contains: keyword, mode: "insensitive" } },
        ];
    }

    const items = await prisma.inventoryItem.findMany({
        where: {
            orgId: ORG_ID,
            status: "AVAILABLE",
            deletedAt: null,
            product: whereProduct,
        },
        include: {
            product: { include: { category: { select: { name: true } }, metalType: { select: { name: true, purity: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    return NextResponse.json({ success: true, categories, metalTypes, results: items });
}

// ── Online: Claude Vision → extract attrs → query ────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { imageBase64, mediaType } = body as { imageBase64: string; mediaType: string };

        if (!imageBase64) {
            return NextResponse.json({ success: false, error: "Image data required" }, { status: 400 });
        }

        const active = await getActiveProviderKey();

        if (!active) {
            return NextResponse.json({
                success: false,
                error: "offline",
                message: "No AI provider configured. Use the filter form below.",
            }, { status: 400 });
        }

        const visionPrompt = `Analyze this jewelry image and respond with JSON only. No explanation, just valid JSON:
{
  "type": "ring|necklace|bracelet|earring|pendant|chain|bangle|set|tikka|jhumka|other",
  "metal": "gold|silver|other",
  "metalColor": "yellow|white|rose|plain",
  "hasStones": true|false,
  "stoneTypes": ["diamond","ruby","emerald","pearl","other"],
  "style": "bridal|casual|traditional|modern",
  "keywords": ["up to 4 short search keywords"]
}`;

        const { text: rawText } = await aiAnalyzeImage(imageBase64, mediaType || "image/jpeg", visionPrompt);
        let attrs: {
            type?: string;
            metal?: string;
            metalColor?: string;
            hasStones?: boolean;
            stoneTypes?: string[];
            keywords?: string[];
        } = {};

        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) attrs = JSON.parse(jsonMatch[0]);
        } catch {
            // Fallback if JSON parse fails
        }

        // Build search from extracted attributes
        const allKeywords = [
            attrs.type,
            attrs.metalColor === "yellow" ? "gold" : attrs.metalColor === "white" ? "white gold" : attrs.metal,
            ...(attrs.stoneTypes ?? []),
            ...(attrs.keywords ?? []),
        ].filter(Boolean) as string[];

        // Find matching categories
        const categories = await prisma.category.findMany({ where: { orgId: ORG_ID, isActive: true } });
        const matchedCategoryIds = categories
            .filter((c) => allKeywords.some((k) => c.name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(c.name.toLowerCase())))
            .map((c) => c.id);

        // Find matching metal types
        const metalTypes = await prisma.metalType.findMany({ where: { orgId: ORG_ID, isActive: true } });
        const matchedMetalTypeIds = metalTypes
            .filter((m) => allKeywords.some((k) => m.name.toLowerCase().includes(k.toLowerCase())))
            .map((m) => m.id);

        // Build OR conditions for product search
        const orConditions: object[] = [];
        if (matchedCategoryIds.length > 0) orConditions.push({ categoryId: { in: matchedCategoryIds } });
        if (matchedMetalTypeIds.length > 0) orConditions.push({ metalTypeId: { in: matchedMetalTypeIds } });
        allKeywords.forEach((k) => {
            orConditions.push({ name: { contains: k, mode: "insensitive" } });
            orConditions.push({ description: { contains: k, mode: "insensitive" } });
        });

        const items = await prisma.inventoryItem.findMany({
            where: {
                orgId: ORG_ID,
                status: "AVAILABLE",
                deletedAt: null,
                product: orConditions.length > 0 ? { OR: orConditions } : undefined,
            },
            include: {
                product: {
                    include: {
                        category: { select: { name: true } },
                        metalType: { select: { name: true, purity: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({
            success: true,
            analysis: attrs,
            detectedKeywords: allKeywords,
            results: items,
        });
    } catch (err) {
        if (err instanceof QuotaError) {
            return NextResponse.json(quotaErrorResponse(err), { status: 402 });
        }
        console.error("Image search error:", err);
        return NextResponse.json({ success: false, error: "Image analysis failed" }, { status: 500 });
    }
}
