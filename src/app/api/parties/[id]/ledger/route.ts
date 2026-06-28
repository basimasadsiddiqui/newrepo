/**
 * API: /api/parties/[id]/ledger
 * GET  — party statement: cash + gold balances and every ledger entry
 * POST — record a gold-return / supplier gold claim (gold-only adjustment)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@core/database";

const ORG_ID = "org-akhtar"; // TODO: multitenancy

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;

        const party = await prisma.party.findUnique({ where: { id, orgId: ORG_ID } });
        if (!party) {
            return NextResponse.json({ success: false, error: "Party not found" }, { status: 404 });
        }

        const entries = await prisma.ledgerEntry.findMany({
            where: { orgId: ORG_ID, partyId: id },
            orderBy: { date: "asc" },
            include: {
                invoice: {
                    select: {
                        orderNumber: true,
                        transactionType: true,
                        totalPureGoldWeight: true,
                        totalAmount: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                party: {
                    id: party.id,
                    name: party.name,
                    mobile: party.mobile,
                    type: party.type,
                    balance: Number(party.balance),
                    goldBalance: Number(party.goldBalance),
                },
                entries: entries.map((e) => ({
                    id: e.id,
                    date: e.date,
                    type: e.type,
                    amount: Number(e.amount),
                    balance: Number(e.balance),
                    goldWeight: Number(e.goldWeight),
                    goldBalance: Number(e.goldBalance),
                    narration: e.narration,
                    invoiceId: e.invoiceId,
                    orderNumber: e.invoice?.orderNumber ?? null,
                    invoiceTransactionType: e.invoice?.transactionType ?? null,
                })),
            },
        });
    } catch (error) {
        console.error("GET /api/parties/[id]/ledger error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch ledger" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const body = await req.json().catch(() => null) as { goldWeight?: number; narration?: string } | null;
        const goldWeight = Number(body?.goldWeight) || 0;

        if (goldWeight <= 0) {
            return NextResponse.json({ success: false, error: "Gold weight must be greater than 0" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const party = await tx.party.findUnique({ where: { id, orgId: ORG_ID } });
            if (!party) throw new Error("Party not found");

            // Gold returned by/to the supplier reduces the gold we owe them.
            const newGoldBalance = Number(party.goldBalance) - goldWeight;

            const entry = await tx.ledgerEntry.create({
                data: {
                    orgId: ORG_ID,
                    partyId: id,
                    type: "DEBIT",
                    amount: 0,
                    balance: Number(party.balance),
                    goldWeight: -goldWeight,
                    goldBalance: newGoldBalance,
                    narration: body?.narration?.trim() || "Gold return / supplier claim",
                },
            });

            await tx.party.update({
                where: { id },
                data: { goldBalance: newGoldBalance },
            });

            return entry;
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error("POST /api/parties/[id]/ledger error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to record gold return" },
            { status: 500 }
        );
    }
}
