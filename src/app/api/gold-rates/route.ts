/**
 * API: /api/gold-rates
 * GET  — latest gold rate (or history with ?days=7)
 * POST — set today's gold rate
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ORG_ID = "org-akhtar";

export async function GET(req: NextRequest) {
    try {
        const days = parseInt(req.nextUrl.searchParams.get("days") || "1", 10);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const rates = await prisma.goldRate.findMany({
            where: { orgId: ORG_ID, date: { gte: since } },
            orderBy: { date: "desc" },
            select: { id: true, date: true, rate: true, carat: true },
        });

        return NextResponse.json({
            success: true,
            data: rates.map((r) => ({
                ...r,
                date: r.date.toISOString(),
                rate: r.rate.toString(),
            })),
        });
    } catch (error) {
        console.error("GET /api/gold-rates error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch gold rates" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { rate, carat } = body;

        if (!rate || rate <= 0) {
            return NextResponse.json(
                { success: false, error: "Valid rate is required" },
                { status: 400 }
            );
        }

        const goldRate = await prisma.goldRate.create({
            data: {
                orgId: ORG_ID,
                rate,
                carat: carat || 24,
                date: new Date(),
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    ...goldRate,
                    date: goldRate.date.toISOString(),
                    rate: goldRate.rate.toString(),
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/gold-rates error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create gold rate" },
            { status: 500 }
        );
    }
}
