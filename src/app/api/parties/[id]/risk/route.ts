import { NextResponse } from "next/server";
import { paymentService } from "@modules/payment/application/paymentService";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const partyId = id;
        if (!partyId) return NextResponse.json({ error: "Party ID required" }, { status: 400 });

        const data = await paymentService.getPartyRiskScore(partyId);

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch risk profile";
        console.error(`GET /api/parties/[id]/risk error:`, error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
