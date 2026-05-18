import { NextResponse } from "next/server";
import { paymentService } from "@modules/payment/application/paymentService";
import { PaymentCategory, PaymentStatus } from "@prisma/client";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const orgId = "org-default-001"; // TODO: Extract from session

        const category = url.searchParams.get("category") as PaymentCategory;
        const page = parseInt(url.searchParams.get("page") || "1");
        const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
        const statusParam = url.searchParams.get("status");
        const status = (statusParam && statusParam !== "ALL") ? (statusParam as PaymentStatus) : undefined;
        const search = url.searchParams.get("search") || undefined;

        if (!category) {
            return NextResponse.json({ error: "Category is required (RECEIVABLE or PAYABLE)" }, { status: 400 });
        }

        const data = await paymentService.getPayments({
            orgId,
            category,
            page,
            pageSize,
            status,
            search
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("GET /api/payments error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const orgId = "org-default-001"; // TODO: Extract from session

        const { partyId, invoiceId, category, totalAmount, dueDate, invoiceDate } = body;

        if (!partyId || !category || !totalAmount || !dueDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const payment = await paymentService.createPayment({
            orgId,
            partyId,
            invoiceId,
            category,
            totalAmount: Number(totalAmount),
            dueDate: new Date(dueDate),
            invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date()
        });

        return NextResponse.json({ success: true, data: payment });
    } catch (error: any) {
        console.error("POST /api/payments error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
