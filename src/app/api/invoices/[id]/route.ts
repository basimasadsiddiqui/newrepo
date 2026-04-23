/**
 * API: /api/invoices/[id]
 * GET    — get single invoice with items
 * PUT    — update invoice
 * DELETE — cancel invoice (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ORG_ID = "org-akhtar";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteParams) {
    try {
        const { id } = await context.params;
        const invoice = await prisma.invoice.findFirst({
            where: { id, orgId: ORG_ID },
            include: {
                items: {
                    orderBy: { sortOrder: "asc" },
                    include: { category: { select: { name: true } } },
                },
                party: { select: { id: true, name: true, mobile: true, type: true, balance: true } },
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: "Invoice not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: invoice });
    } catch (error) {
        console.error("GET /api/invoices/[id] error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch invoice" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest, context: RouteParams) {
    try {
        const { id } = await context.params;
        const body = await req.json();

        // Verify invoice exists and belongs to org
        const existing = await prisma.invoice.findFirst({ where: { id, orgId: ORG_ID } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Invoice not found" },
                { status: 404 }
            );
        }

        if (existing.status === "FINALIZED") {
            return NextResponse.json(
                { success: false, error: "Cannot edit a finalized invoice" },
                { status: 400 }
            );
        }



        const toNumber = (value: unknown, fallback = 0): number => {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        };

        const {
            transactionType: rawTransactionType = "SALE",
            partyId: incomingPartyId,
            partyName,
            partyMobile,
            receiptNo,
            date,
            dueDate,
            rateType = "FIXED",
            goldRate = 0,
            polishBasis = "Per Tola",
            polishRate = 0,
            labourBasis = "Per Tola",
            labourRate = 0,
            customerGoldWeight,
            customerGoldCarat,
            partyGoldWeight,
            partyGoldCarat,
            pasaRate = 0,
            otherCharges = 0,
            discount = 0,
            cashReceived = 0,
            goldReceived = 0,
            remarks,
            items = [],
            photos = [],
        } = body as {
            transactionType?: "SALE" | "PURCHASE";
            partyId?: string;
            partyName?: string;
            partyMobile?: string;
            receiptNo?: string;
            date?: string;
            dueDate?: string;
            rateType?: "FIXED" | "UNFIXED";
            goldRate?: number;
            polishBasis?: string;
            polishRate?: number;
            labourBasis?: string;
            labourRate?: number;
            customerGoldWeight?: number;
            customerGoldCarat?: number;
            partyGoldWeight?: number;
            partyGoldCarat?: number;
            pasaRate?: number;
            otherCharges?: number;
            discount?: number;
            cashReceived?: number;
            goldReceived?: number;
            remarks?: string;
            items?: Array<Record<string, unknown>>;
            photos?: unknown[];
        };

        const transactionType = rawTransactionType === "PURCHASE" ? "PURCHASE" : "SALE";
        const safePolishBasis = ((typeof polishBasis === "string" ? polishBasis : "Per Tola") as Exclude<import("@/lib/calculationEngine").PolishLabourBasis, "Per Gram" | "Fixed">);
        const safeLabourBasis = ((typeof labourBasis === "string" ? labourBasis : "Per Tola") as import("@/lib/calculationEngine").LabourBasis);
        const safePhotos = Array.isArray(photos) ? photos.filter((p): p is string => typeof p === "string") : [];
        const safeItems = Array.isArray(items) ? items : [];

        const resolvedCustomerGoldWeight = toNumber(
            customerGoldWeight ?? partyGoldWeight ?? 0,
            0
        );
        const resolvedCustomerGoldCarat = Math.round(
            toNumber(customerGoldCarat ?? partyGoldCarat ?? 24, 24)
        );

        const { calculateLineItem, calculateInvoiceSummary, goldRateToPerGram } = await import("@/lib/calculationEngine");
        const goldRatePerGram = goldRateToPerGram(toNumber(goldRate, 0));

        const serverComputedItems = safeItems.map((item, index) => {
            const calc = calculateLineItem({
                estimatedGoldWeight: toNumber(item.estimatedGoldWeight, 0),
                carat: Math.round(toNumber(item.carat, 24)),
                goldRatePerGram,
                polishRate: toNumber(polishRate, 0),
                polishBasis: safePolishBasis,
                labourRate: toNumber(labourRate, 0),
                labourBasis: safeLabourBasis,
                stoneWeight: toNumber(item.stoneWeight, 0),
                beadsWeight: toNumber(item.beadsWeight, 0),
                diamondWeight: toNumber(item.diamondWeight, 0),
                stoneAmount: toNumber(item.stoneAmount, 0),
                beadsAmount: toNumber(item.beadsAmount, 0),
                diamondAmount: toNumber(item.diamondAmount, 0),
            });

            return {
                sortOrder: index,
                categoryId: (item.categoryId as string) || null,
                description: (item.description as string) || null,
                pieces: Math.max(1, Math.round(toNumber(item.pieces, 1))),
                carat: Math.round(toNumber(item.carat, 24)),
                size: (item.size as string) || null,
                isRepairingOrder: Boolean(item.isRepairingOrder),
                isSampleGold: Boolean(item.isSampleGold),
                isBulkPurchase: Boolean(item.isBulkPurchase),
                estimatedGoldWeight: toNumber(item.estimatedGoldWeight, 0),
                adjustedGoldWeight: calc.adjustedGoldWeight,
                estimatedGrossWeight: calc.estimatedGrossWeight,
                stoneWeight: toNumber(item.stoneWeight, 0),
                beadsWeight: toNumber(item.beadsWeight, 0),
                diamondWeight: toNumber(item.diamondWeight, 0),
                goldAmount: calc.goldAmount,
                stoneAmount: toNumber(item.stoneAmount, 0),
                beadsAmount: toNumber(item.beadsAmount, 0),
                diamondAmount: toNumber(item.diamondAmount, 0),
                polishAmount: calc.polishAmount,
                labourAmount: calc.labourAmount,
                totalAmount: calc.totalAmount,
                imageUrl: (item.imageUrl as string) || null,
                inventoryItemId: (item.inventoryItemId as string) || null,
            };
        });

        const serverSummary = calculateInvoiceSummary({
            items: serverComputedItems.map((i) => ({
                totalAmount: i.totalAmount,
                adjustedGoldWeight: i.adjustedGoldWeight,
            })),
            otherCharges: toNumber(otherCharges, 0),
            discount: toNumber(discount, 0),
            cashReceived: toNumber(cashReceived, 0),
            goldReceived: toNumber(goldReceived, 0),
            customerGoldWeight: resolvedCustomerGoldWeight,
            customerGoldCarat: resolvedCustomerGoldCarat,
            goldRatePerGram,
            pasaPercent: toNumber(pasaRate, 0),
        });

        // Auto-Save Party Logic
        let resolvedPartyId = incomingPartyId;
        if (!resolvedPartyId && partyName && partyName.trim()) {
            const normalizedName = partyName.trim();
            const normalizedMobile = partyMobile ? partyMobile.trim() : null;

            const existingParty = await prisma.party.findFirst({
                where: {
                    orgId: ORG_ID,
                    name: { equals: normalizedName, mode: "insensitive" },
                    ...(normalizedMobile ? { mobile: normalizedMobile } : {}),
                },
            });

            if (existingParty) {
                resolvedPartyId = existingParty.id;
            } else {
                const newParty = await prisma.party.create({
                    data: {
                        orgId: ORG_ID,
                        name: normalizedName,
                        mobile: normalizedMobile,
                        type: transactionType === "SALE" ? "Customer" : "Supplier",
                        balance: 0,
                    },
                });
                resolvedPartyId = newParty.id;
            }
        }

        // Update header + replace items in a transaction
        const updated = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
            await tx.invoice.update({
                where: { id },
                data: {
                    transactionType,
                    partyId: resolvedPartyId || null,
                    partyName: partyName?.trim() || null,
                    partyMobile: partyMobile?.trim() || null,
                    receiptNo: receiptNo?.trim() || null,
                    date: date ? new Date(date) : undefined,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    rateType,
                    goldRate: toNumber(goldRate, 0),
                    polishBasis: safePolishBasis,
                    polishRate: toNumber(polishRate, 0),
                    labourBasis: safeLabourBasis,
                    labourRate: toNumber(labourRate, 0),
                    customerGoldWeight: resolvedCustomerGoldWeight || null,
                    customerGoldCarat: resolvedCustomerGoldCarat || null,
                    customerGoldValue: serverSummary.customerGoldValue || null,
                    pasaRate: toNumber(pasaRate, 0),
                    pasaDeduction: serverSummary.pasaDeduction || null,
                    totalGoldWeight: serverSummary.totalGoldWeight || 0,
                    totalAmount: serverSummary.totalAmount || 0,
                    otherCharges: toNumber(otherCharges, 0),
                    discount: toNumber(discount, 0),
                    cashReceived: toNumber(cashReceived, 0),
                    goldReceived: toNumber(goldReceived, 0),
                    balance: serverSummary.balance || 0,
                    remarks: remarks?.trim() || null,
                    photos: safePhotos,
                },
            });

            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
            if (serverComputedItems.length > 0) {
                await tx.invoiceItem.createMany({
                    data: serverComputedItems.map((item) => ({
                        invoiceId: id,
                        sortOrder: item.sortOrder,
                        categoryId: item.categoryId,
                        description: item.description,
                        pieces: item.pieces,
                        carat: item.carat,
                        size: item.size,
                        isRepairingOrder: item.isRepairingOrder,
                        isSampleGold: item.isSampleGold,
                        isBulkPurchase: item.isBulkPurchase,
                        estimatedGoldWeight: item.estimatedGoldWeight,
                        adjustedGoldWeight: item.adjustedGoldWeight,
                        estimatedGrossWeight: item.estimatedGrossWeight,
                        stoneWeight: item.stoneWeight,
                        beadsWeight: item.beadsWeight,
                        diamondWeight: item.diamondWeight,
                        goldAmount: item.goldAmount,
                        stoneAmount: item.stoneAmount,
                        beadsAmount: item.beadsAmount,
                        diamondAmount: item.diamondAmount,
                        polishAmount: item.polishAmount,
                        labourAmount: item.labourAmount,
                        totalAmount: item.totalAmount,
                        imageUrl: item.imageUrl,
                        inventoryItemId: item.inventoryItemId,
                    })),
                });
            }

            return tx.invoice.findFirst({
                where: { id },
                include: { items: { orderBy: { sortOrder: "asc" } } },
            });
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error("PUT /api/invoices/[id] error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to update invoice" },
            { status: 500 }
        );
    }
}

export async function DELETE(_req: NextRequest, context: RouteParams) {
    try {
        const { id } = await context.params;
        const existing = await prisma.invoice.findFirst({ where: { id, orgId: ORG_ID } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Invoice not found" },
                { status: 404 }
            );
        }

        await prisma.invoice.update({
            where: { id },
            data: { status: "CANCELLED" },
        });

        return NextResponse.json({ success: true, message: "Invoice cancelled" });
    } catch (error) {
        console.error("DELETE /api/invoices/[id] error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to cancel invoice" },
            { status: 500 }
        );
    }
}
