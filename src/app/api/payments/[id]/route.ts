import { NextResponse } from "next/server";
import { paymentService } from "@/lib/services/paymentService";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const paymentId = id;
        if (!paymentId) return NextResponse.json({ error: "Payment ID required" }, { status: 400 });

        const data = await paymentService.getPaymentDetails(paymentId);

        if (!data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error(`GET /api/payments/$paymentId} error:`, error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
