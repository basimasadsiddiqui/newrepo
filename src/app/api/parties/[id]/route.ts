/**
 * API: /api/parties/[id]
 * GET    — fetch single party details
 * PUT    — update party details
 * DELETE — delete party (soft delete or hard delete depending on data)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORG_ID = "org-akhtar"; // TODO: multitenancy

type Context = {
    params: Promise<{ id: string }>;
};

// GET /api/parties/[id]
export async function GET(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const party = await prisma.party.findUnique({
            where: { id, orgId: ORG_ID },
        });

        if (!party) {
            return NextResponse.json(
                { success: false, error: "Party not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { ...party, balance: party.balance.toString() },
        });
    } catch (error) {
        console.error("GET /api/parties/[id] error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch party" },
            { status: 500 }
        );
    }
}

// PUT /api/parties/[id]
export async function PUT(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, mobile, address, type } = body;

        const party = await prisma.party.update({
            where: { id, orgId: ORG_ID },
            data: {
                name: name?.trim(),
                mobile,
                address,
                type,
            },
        });

        return NextResponse.json({
            success: true,
            data: { ...party, balance: party.balance.toString() },
        });
    } catch (error) {
        console.error("PUT /api/parties/[id] error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update party" },
            { status: 500 }
        );
    }
}

// DELETE /api/parties/[id]
export async function DELETE(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;

        // Check if used in invoices
        const usedInInvoice = await prisma.invoice.count({
            where: { partyId: id },
        });

        if (usedInInvoice > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cannot delete party with existing invoices.",
                },
                { status: 400 }
            );
        }

        await prisma.party.delete({
            where: { id, orgId: ORG_ID },
        });

        return NextResponse.json({ success: true, message: "Party deleted" });
    } catch (error) {
        console.error("DELETE /api/parties/[id] error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete party" },
            { status: 500 }
        );
    }
}
