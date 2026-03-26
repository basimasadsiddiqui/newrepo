import { NextResponse } from "next/server";
import { metalRateService } from "@/lib/services/metalRateService";

export const dynamic = 'force-dynamic'; // Always fetch live data from DB

export async function GET() {
    try {
        const orgId = "org-default-001"; // Replace with dynamic orgId when multi-tenant is active
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
