/**
 * API: /api/invoices
 * GET  — list invoices (with pagination)
 * POST — create a new invoice with line items
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@core/database";
import { PaymentCategory, PaymentStatus } from "@prisma/client";
import { convertInvoiceBodyToPkr } from "@/shared/utils/currency";

const ORG_ID = "org-akhtar";

export async function GET(req: NextRequest) {
    try {
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
        const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") || "20", 10);
        const status = req.nextUrl.searchParams.get("status");

        const where: Record<string, unknown> = { orgId: ORG_ID };
        if (status) where.status = status;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    items: { orderBy: { sortOrder: "asc" } },
                },
            }),
            prisma.invoice.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: invoices.map((inv) => ({
                ...inv,
                totalAmount: inv.totalAmount.toString(),
                balance: inv.balance.toString(),
                date: inv.date.toISOString(),
            })),
            total,
            page,
            pageSize,
        });
    } catch (error) {
        console.error("GET /api/invoices error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch invoices" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        console.log("POST /api/invoices - Starting invoice creation");
        const body = await req.json();
        // Foreign-currency purchases are ENTERED in the selected currency but STORED in PKR.
        // Convert every monetary field to PKR (× Conv.Rate) up-front so the recompute,
        // ledger and payment logic downstream all operate in the PKR base. Weight/percent
        // fields (goldReceived, kaatRate, pasaRate, *Weight, intlOunceRate) are NOT money.
        convertInvoiceBodyToPkr(body);
        console.log("Request body received:", JSON.stringify(body, null, 2));
        const {
            transactionType = "SALE",
            partyId,
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
            kaatBasis,
            kaatRate,
            supplierInvoiceNo,
            currency = "PKR",
            currencyRate = 1,
            intlOunceRate = 0,
            customerGoldWeight = 0,
            customerGoldCarat = 24,
            customerGoldValue = 0,
            pasaRate = 0,
            pasaDeduction = 0,
            totalGoldWeight: _clientTotalGoldWeight,
            totalAmount: _clientTotalAmount,
            otherCharges = 0,
            otherChargesMode = "RS",
            otherChargesWeight = 0,
            discount = 0,
            discountMode = "RS",
            discountWeight = 0,
            cashReceived = 0,
            goldReceived = 0,
            balance: _clientBalance,
            remarks,
            items = [],
            photos = [], // Extract photos
        } = body;

        // IMPORT CALCULATION ENGINE LOGIC HERE
        const {
            calculateLineItem,
            calculateInvoiceSummary,
            goldRateToPerGram,
        } = await import("@modules/invoice/application/calculationEngine");
        console.log("Calculation engine imported successfully");

        const goldRatePerGram = goldRateToPerGram(goldRate || 0);
        console.log("goldRatePerGram calculated:", goldRatePerGram);

        // RECALCULATE ITEMS SERVER-SIDE
        const serverComputedItems = items.map((item: any, index: number) => {
            const itemStoneRate = (item.stoneRate as number) || 0;
            const itemStoneWt = (item.stoneWeight as number) || 0;
            const itemStoneAmt = itemStoneRate > 0 && itemStoneWt > 0
                ? itemStoneRate * itemStoneWt
                : (item.stoneAmount as number) || 0;

            const calc = calculateLineItem({
                transactionType,
                estimatedGoldWeight: item.estimatedGoldWeight || 0,
                carat: item.carat || 24,
                goldRatePerGram,
                polishRate: polishRate || 0,
                polishBasis: polishBasis as any,
                labourRate: labourRate || 0,
                labourBasis: labourBasis as any,
                kaatRate: kaatRate || 0,
                kaatBasis: kaatBasis as any,
                stoneWeight: itemStoneWt,
                beadsWeight: item.beadsWeight || 0,
                diamondWeight: item.diamondWeight || 0,
                stoneAmount: itemStoneAmt,
                beadsAmount: item.beadsAmount || 0,
                diamondAmount: item.diamondAmount || 0,
            });

            // If stoneRate provided, recalculate stoneAmount from rate × weight
            const stoneRate = (item.stoneRate as number) || 0;
            const stoneWt = (item.stoneWeight as number) || 0;
            const effectiveStoneAmount = stoneRate > 0 && stoneWt > 0
                ? stoneRate * stoneWt
                : (item.stoneAmount as number) || 0;

            return {
                sortOrder: index,
                categoryId: (item.categoryId as string) || null,
                description: (item.description as string) || null,
                tagCaption: (item.tagCaption as string) || null,
                huid: (item.huid as string) || null,
                pieces: (item.pieces as number) || 1,
                carat: (item.carat as number) || 24,
                size: (item.size as string) || null,
                isRepairingOrder: (item.isRepairingOrder as boolean) || false,
                isSampleGold: (item.isSampleGold as boolean) || false,
                isBulkPurchase: (item.isBulkPurchase as boolean) || false,
                estimatedGoldWeight: (item.estimatedGoldWeight as number) || 0,
                adjustedGoldWeight: calc.adjustedGoldWeight,
                estimatedGrossWeight: calc.estimatedGrossWeight,
                stoneWeight: stoneWt,
                stoneRate: stoneRate || null,
                beadsWeight: (item.beadsWeight as number) || 0,
                diamondWeight: (item.diamondWeight as number) || 0,
                goldAmount: calc.goldAmount,
                stoneAmount: effectiveStoneAmount,
                beadsAmount: (item.beadsAmount as number) || 0,
                diamondAmount: (item.diamondAmount as number) || 0,
                diamondEntries: item.diamondEntries || null,
                polishAmount: calc.polishAmount,
                labourAmount: calc.labourAmount,
                totalAmount: calc.totalAmount,
                imageUrl: (item.imageUrl as string) || null,
                imageUrls: (item.imageUrls as string[]) || [],
                guaranteedRatti: (item.guaranteedRatti as number) || 0,
                goldReturnClaim: (item.goldReturnClaim as number) || 0,
                inventoryItemId: (item.inventoryItemId as string) || null,
                metalName: (item.metalName as string) || null,
            };
        });

        // Pure 24k gold across the invoice (sum of per-item kaat-adjusted weight)
        const totalPureGoldWeight = serverComputedItems.reduce(
            (sum: number, i: any) => sum + (Number(i.adjustedGoldWeight) || 0),
            0
        );

        // RECALCULATE SUMMARY SERVER-SIDE
        const serverSummary = calculateInvoiceSummary({
            items: serverComputedItems.map((i: any) => ({
                totalAmount: i.totalAmount,
                estimatedGoldWeight: i.estimatedGoldWeight,
            })),
            otherCharges: otherCharges || 0,
            discount: discount || 0,
            cashReceived: cashReceived || 0,
            goldReceived: goldReceived || 0,
            customerGoldWeight: customerGoldWeight || 0,
            customerGoldCarat: customerGoldCarat || 24,
            goldRatePerGram,
            pasaPercent: pasaRate || 0,
        });


        let finalPartyId = partyId;

        // Auto-Save Party Logic: If no ID but Name is provided, find or create
        if (!finalPartyId && partyName && partyName.trim()) {
            console.log("Creating/finding party:", partyName);
            const normalizedName = partyName.trim();
            const normalizedMobile = partyMobile ? partyMobile.trim() : null;

            // Try to find existing party by name (and mobile if provided)
            const existingParty = await prisma.party.findFirst({
                where: {
                    orgId: ORG_ID,
                    name: { equals: normalizedName, mode: "insensitive" },
                    ...(normalizedMobile ? { mobile: normalizedMobile } : {}),
                },
            });

            if (existingParty) {
                finalPartyId = existingParty.id;
                console.log("Found existing party:", existingParty.id);
            } else {
                // Create new party
                console.log("Creating new party");
                const newParty = await prisma.party.create({
                    data: {
                        orgId: ORG_ID,
                        name: normalizedName,
                        mobile: normalizedMobile,
                        type: transactionType === "SALE" ? "Customer" : "Supplier",
                        balance: 0,
                    },
                });
                finalPartyId = newParty.id;
                console.log("Created new party:", newParty.id);
            }
        }

        console.log("Creating invoice with finalPartyId:", finalPartyId);
        const invoice = await prisma.invoice.create({
            data: {
                orgId: ORG_ID,
                transactionType,
                partyId: finalPartyId || null,
                partyName: partyName || null,
                partyMobile: partyMobile || null,
                receiptNo: receiptNo || null,
                date: date ? new Date(date) : new Date(),
                dueDate: dueDate ? new Date(dueDate) : null,
                rateType,
                goldRate: goldRate || null,
                polishBasis: polishBasis || null,
                polishRate: polishRate || null,
                labourBasis: labourBasis || null,
                labourRate: labourRate || null,
                kaatBasis: kaatBasis || null,
                kaatRate: kaatRate || null,
                supplierInvoiceNo: supplierInvoiceNo || null,
                currency: currency || "PKR",
                currencyRate: currencyRate || 1,
                intlOunceRate: intlOunceRate || 0,
                customerGoldWeight: customerGoldWeight || null,
                customerGoldCarat: customerGoldCarat || null,
                customerGoldValue: serverSummary.customerGoldValue || null,
                pasaRate: pasaRate || null,
                pasaDeduction: serverSummary.pasaDeduction || null,
                totalGoldWeight: serverSummary.totalGoldWeight || 0,
                totalPureGoldWeight: totalPureGoldWeight || 0,
                totalAmount: serverSummary.totalAmount || 0,
                otherCharges: otherCharges || 0,
                otherChargesMode: otherChargesMode === "GOLD" ? "GOLD" : "RS",
                otherChargesWeight: otherChargesWeight || 0,
                discount: discount || 0,
                discountMode: discountMode === "GOLD" ? "GOLD" : "RS",
                discountWeight: discountWeight || 0,
                cashReceived: cashReceived || 0,
                goldReceived: goldReceived || 0,
                balance: serverSummary.balance || 0,
                remarks: remarks || null,
                photos: photos || [], // Save photos
                items: {
                    create: serverComputedItems,
                },
            },
            include: { items: true },
        });

        // --- NEW: AUTO PAYMENT LEDGER GENERATION ---
        // If this invoice generated a remaining balance owed, automatically open a Payment
        const numBalance = Number(serverSummary.balance);
        const numTotal = Number(serverSummary.totalAmount);
        if (numBalance > 0 && finalPartyId) {
            await prisma.payment.create({
                data: {
                    orgId: ORG_ID,
                    partyId: finalPartyId,
                    invoiceId: invoice.id,
                    // If Sale -> Customer owes us -> RECEIVABLE. If Purchase -> We owe Supplier -> PAYABLE.
                    category: transactionType === "SALE" ? PaymentCategory.RECEIVABLE : PaymentCategory.PAYABLE,
                    totalAmount: numTotal,
                    paidAmount: numTotal - numBalance, // Handle partial payments made AT time of invoice
                    remainingAmount: numBalance,
                    invoiceDate: invoice.date,
                    dueDate: invoice.dueDate || invoice.date, // Default due date to today if not provided
                    status: (numTotal - numBalance) > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING,
                }
            });
        }

        return NextResponse.json(
            { success: true, data: invoice },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/invoices error:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        return NextResponse.json(
            { success: false, error: "Failed to create invoice" },
            { status: 500 }
        );
    }
}
