/**
 * API: /api/parties
 * GET  — list all parties (with optional ?q= search)
 * POST — create a new party
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@core/database";

const ORG_ID = "org-akhtar"; // TODO: from auth session

export async function GET(req: NextRequest) {
    try {
        const q = req.nextUrl.searchParams.get("q") || "";
        const type = req.nextUrl.searchParams.get("type"); // Customer | Supplier | Both

        const where: Record<string, unknown> = { orgId: ORG_ID };

        if (q) {
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { mobile: { contains: q } },
            ];
        }

        if (type) {
            where.type = type;
        }

        const parties = await prisma.party.findMany({
            where,
            orderBy: { name: "asc" },
            take: 50,
            select: {
                id: true,
                name: true,
                mobile: true,
                type: true,
                balance: true,
                address: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: parties.map((p) => ({
                ...p,
                balance: p.balance.toString(),
            })),
        });
    } catch (error) {
        console.error("GET /api/parties error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch parties" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, mobile, address, type } = body;

        if (!name || !name.trim()) {
            return NextResponse.json(
                { success: false, error: "Party name is required" },
                { status: 400 }
            );
        }

        const party = await prisma.party.create({
            data: {
                orgId: ORG_ID,
                name: name.trim(),
                mobile: mobile || null,
                address: address || null,
                type: type || "Both",
            },
        });

        return NextResponse.json({
            success: true,
            data: { ...party, balance: party.balance.toString() },
        }, { status: 201 });
    } catch (error) {
        console.error("POST /api/parties error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create party" },
            { status: 500 }
        );
    }
}
