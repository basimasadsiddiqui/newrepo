/**
 * API: /api/categories
 * GET   — list all active categories
 * POST  — create a new category
 * PATCH — rename an existing category (by id)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@core/database";

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

/**
 * Rename a category. Categories are referenced by id everywhere, so a rename is
 * safe — no rows need to be re-pointed. (Client #8: fix a mis-spelled category.)
 */
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name } = body;

        if (!id || typeof id !== "string") {
            return NextResponse.json(
                { success: false, error: "Category id is required" },
                { status: 400 }
            );
        }

        if (!name || !name.trim()) {
            return NextResponse.json(
                { success: false, error: "Category name is required" },
                { status: 400 }
            );
        }

        const trimmedName = name.trim();

        // Scope to this org so an id from another org can't be renamed
        const existing = await prisma.category.findFirst({
            where: { id, orgId: ORG_ID },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            );
        }

        // Category has @@unique([orgId, name]) — reject a colliding rename up front
        const duplicate = await prisma.category.findFirst({
            where: {
                orgId: ORG_ID,
                name: { equals: trimmedName, mode: "insensitive" },
                id: { not: id },
            },
            select: { id: true },
        });

        if (duplicate) {
            return NextResponse.json(
                { success: false, error: "A category with that name already exists" },
                { status: 409 }
            );
        }

        const category = await prisma.category.update({
            where: { id },
            data: { name: trimmedName },
        });

        return NextResponse.json({
            success: true,
            data: { id: category.id, name: category.name },
        });
    } catch (error) {
        console.error("PATCH /api/categories error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update category" },
            { status: 500 }
        );
    }
}
