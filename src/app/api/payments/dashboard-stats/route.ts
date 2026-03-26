import { NextResponse } from "next/server";
import { paymentService } from "@/lib/services/paymentService";

export async function GET(req: Request) {
    try {
        const orgId = "org-default-001"; // TODO: Extract from session

        const data = await paymentService.getDashboardStats(orgId);

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("GET /api/payments/dashboard-stats error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
