import { NextResponse } from "next/server";
import { paymentService } from "@/lib/services/paymentService";
import { PaymentMode } from "@prisma/client";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const paymentId = id;
        const body = await req.json();

        if (!paymentId) return NextResponse.json({ error: "Payment ID required" }, { status: 400 });

        const { amount, mode, date, goldWeight, goldRate, notes } = body;

        if (!amount || !mode) {
            return NextResponse.json({ error: "Amount and mode are required" }, { status: 400 });
        }

        // Validate GOLD mode requirements
        if ((mode === PaymentMode.GOLD || mode === PaymentMode.MIXED) && (!goldWeight || !goldRate)) {
            return NextResponse.json({ error: "Gold weight and locked rate are strictly required for GOLD/MIXED modes." }, { status: 400 });
        }

        const data = await paymentService.addTransaction({
            paymentId,
            amount: Number(amount),
            mode,
            date: date ? new Date(date) : new Date(),
            goldWeight: goldWeight ? Number(goldWeight) : undefined,
            goldRate: goldRate ? Number(goldRate) : undefined,
            notes
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error(`POST /api/payments/$paymentId}/transactions error:`, error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
