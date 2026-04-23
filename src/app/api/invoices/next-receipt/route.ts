/**
 * GET /api/invoices/next-receipt?type=SALE|PURCHASE|BULK
 *
 * Returns the next auto-generated receipt number for the given type.
 * Uses an atomic counter in the InvoiceCounter table.
 *
 * Format: SAL-0001 / PUR-0001 / BLK-0001
 *
 * Note: The counter is incremented on every GET call, so clicking "New Invoice"
 * multiple times without saving will leave gaps — this is acceptable behaviour.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const PREFIX: Record<string, string> = {
    SALE: "SAL",
    PURCHASE: "PUR",
    BULK: "BLK",
};

export async function GET(req: NextRequest) {
    const type = (req.nextUrl.searchParams.get("type") || "SALE").toUpperCase();
    const prefix = PREFIX[type] ?? "INV";

    try {
        // Atomic increment — use raw SQL for FOR UPDATE skip lock
        const result = await prisma.$queryRaw<{ current: number }[]>`
            UPDATE "InvoiceCounter"
            SET "current" = "current" + 1
            WHERE "key" = ${type}
            RETURNING "current"
        `;

        let current = result[0]?.current;

        if (current === undefined) {
            // First time — insert and start at 1
            await prisma.$executeRaw`
                INSERT INTO "InvoiceCounter" ("key", "current")
                VALUES (${type}, 1)
                ON CONFLICT ("key") DO UPDATE SET "current" = "InvoiceCounter"."current" + 1
            `;
            const r2 = await prisma.$queryRaw<{ current: number }[]>`
                SELECT "current" FROM "InvoiceCounter" WHERE "key" = ${type}
            `;
            current = r2[0]?.current ?? 1;
        }

        const receiptNo = `${prefix}-${String(current).padStart(4, "0")}`;

        return NextResponse.json({ success: true, receiptNo });
    } catch (error) {
        console.error("GET /api/invoices/next-receipt error:", error);
        return NextResponse.json({ success: false, error: "Failed to generate receipt number" }, { status: 500 });
    }
}
