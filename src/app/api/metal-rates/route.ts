import { NextResponse } from "next/server";
import { metalRateService } from "@modules/metals/application/metalRateService";
import { resolveOrgId } from "@core/auth";

export const dynamic = 'force-dynamic'; // Always fetch live data from DB

export async function GET() {
    try {
        const orgId = await resolveOrgId();
        const rates = await metalRateService.getAllRates(orgId);

        return NextResponse.json({
            success: true,
            data: rates
        });
    } catch (error) {
        console.error("GET /api/metal-rates error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch metal rates" },
            { status: 500 }
        );
    }
}
