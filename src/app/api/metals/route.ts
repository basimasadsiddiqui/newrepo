/**
 * API: /api/metals
 * Manages the org's list of base metal names (Gold, Silver, Palladium, …).
 * Stored in Organization.settings.metals — independent of carat/purity, which
 * is entered separately on each line item.
 *
 * GET    — list metals (seeds defaults if none stored)
 * POST   — add a metal name        { name }
 * DELETE — remove a metal name      ?name=
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@core/database";

const ORG_ID = "org-akhtar";
const DEFAULT_METALS = ["Gold", "Silver", "Palladium", "Platinum", "Copper"];

interface OrgSettings {
    metals?: unknown;
    [key: string]: unknown;
}

async function loadMetals(): Promise<string[]> {
    const org = await prisma.organization.findUnique({
        where: { id: ORG_ID },
        select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as OrgSettings;
    const stored = Array.isArray(settings.metals)
        ? settings.metals.filter((m): m is string => typeof m === "string" && m.trim().length > 0)
        : [];
    return stored.length > 0 ? stored : DEFAULT_METALS;
}

async function saveMetals(metals: string[]): Promise<void> {
    const org = await prisma.organization.findUnique({
        where: { id: ORG_ID },
        select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as OrgSettings;
    settings.metals = metals;
    await prisma.organization.update({
        where: { id: ORG_ID },
        data: { settings: settings as object },
    });
}

export async function GET() {
    try {
        return NextResponse.json({ success: true, metals: await loadMetals() });
    } catch (err) {
        console.error("GET /api/metals error:", err);
        return NextResponse.json({ success: false, error: "Failed to load metals" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name } = (await req.json()) as { name?: string };
        const clean = String(name ?? "").trim();
        if (!clean) {
            return NextResponse.json({ success: false, error: "Metal name is required" }, { status: 400 });
        }
        const metals = await loadMetals();
        if (!metals.some((m) => m.toLowerCase() === clean.toLowerCase())) {
            metals.push(clean);
            await saveMetals(metals);
        }
        return NextResponse.json({ success: true, metals });
    } catch (err) {
        console.error("POST /api/metals error:", err);
        return NextResponse.json({ success: false, error: "Failed to add metal" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const name = req.nextUrl.searchParams.get("name");
        const clean = String(name ?? "").trim();
        if (!clean) {
            return NextResponse.json({ success: false, error: "name query param required" }, { status: 400 });
        }
        const metals = (await loadMetals()).filter((m) => m.toLowerCase() !== clean.toLowerCase());
        await saveMetals(metals);
        return NextResponse.json({ success: true, metals });
    } catch (err) {
        console.error("DELETE /api/metals error:", err);
        return NextResponse.json({ success: false, error: "Failed to remove metal" }, { status: 500 });
    }
}
