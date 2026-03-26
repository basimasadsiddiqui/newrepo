import { NextRequest, NextResponse } from "next/server";
import { getGalleryItems } from "@/lib/data/gallery";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("limit") || "12");
        const search = searchParams.get("search") || "";
        const metal = searchParams.get("metal") || undefined;
        const category = searchParams.get("category") || undefined;
        const status = searchParams.get("status") || undefined;

        // TODO: Get Org ID from session or specialized header/domain logic
        // For public gallery, we might want a default or look it up.
        // For now, let's use the one we know exists or allow it via query param for testing?
        const orgId = searchParams.get("orgId") || "org-akhtar";

        const result = await getGalleryItems({
            page,
            pageSize,
            search,
            metal,
            category,
            status,
            orgId // Pass it through
        });

        return NextResponse.json({
            success: true,
            data: result.items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            goldRateUsed: result.goldRateUsed,
            debug: {
                orgIdUsed: orgId
            }
        });

    } catch (error) {
        console.error("Gallery API Error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch gallery" }, { status: 500 });
    }
}
