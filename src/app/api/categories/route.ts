/**
 * API: /api/categories
 * GET  — list all active categories
 * POST — create a new category
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ORG_ID = "org-akhtar";

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            where: { orgId: ORG_ID, isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
        });

        return NextResponse.json({ success: true, data: categories });
    } catch (error) {
        console.error("GET /api/categories error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name } = body;

        if (!name || !name.trim()) {
            return NextResponse.json(
                { success: false, error: "Category name is required" },
                { status: 400 }
            );
        }

        const category = await prisma.category.create({
            data: { orgId: ORG_ID, name: name.trim() },
        });

        return NextResponse.json(
            { success: true, data: { id: category.id, name: category.name } },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/categories error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create category" },
            { status: 500 }
        );
    }
}
