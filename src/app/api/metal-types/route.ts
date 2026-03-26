import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ORG_ID = "org-akhtar";

export async function GET(req: NextRequest) {
    try {
        const orgId = req.nextUrl.searchParams.get("orgId") || ORG_ID;
        const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";

        const metalTypes = await prisma.metalType.findMany({
            where: includeInactive ? { orgId } : { orgId, isActive: true },
            orderBy: [{ name: "asc" }, { purity: "asc" }],
        });

        return NextResponse.json({
            success: true,
            data: metalTypes.map((metalType) => ({
                ...metalType,
                purityValue: Number(metalType.purityValue),
            })),
        });
    } catch (error) {
        console.error("GET /api/metal-types error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch metal types" },
            { status: 500 }
        );
    }
}
