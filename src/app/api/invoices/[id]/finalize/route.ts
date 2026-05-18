/**
 * API: /api/invoices/[id]/finalize
 * POST — Finalize invoice + create ledger entry + deduct inventory
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@core/database";

const ORG_ID = "org-akhtar";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteParams) {
    try {
        const { id } = await context.params;
        const body = await req.json().catch(() => null) as {
            items?: Array<{ sortOrder?: number; metalTypeId?: string | null }>;
        } | null;
        const requestedMetalTypeBySortOrder = new Map<number, string>();

        if (Array.isArray(body?.items)) {
            for (const lineItem of body.items) {
                if (
                    typeof lineItem.sortOrder === "number" &&
                    lineItem.metalTypeId &&
                    lineItem.metalTypeId.trim()
                ) {
                    requestedMetalTypeBySortOrder.set(lineItem.sortOrder, lineItem.metalTypeId.trim());
                }
            }
        }

        const invoice = await prisma.invoice.findFirst({
            where: { id, orgId: ORG_ID },
            include: { items: true },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: "Invoice not found" },
                { status: 404 }
            );
        }

        if (invoice.status === "FINALIZED") {
            return NextResponse.json(
                { success: false, error: "Invoice is already finalized" },
                { status: 400 }
            );
        }

        if (invoice.status === "CANCELLED") {
            return NextResponse.json(
                { success: false, error: "Cannot finalize a cancelled invoice" },
                { status: 400 }
            );
        }

        if (invoice.items.length === 0) {
            return NextResponse.json(
                { success: false, error: "Cannot finalize an invoice with no items" },
                { status: 400 }
            );
        }

        console.log(`Finalizing invoice ${id} with ${invoice.items.length} items.`);

        // Finalize in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update invoice status
            const finalized = await tx.invoice.update({
                where: { id },
                data: { status: "FINALIZED" },
            });

            // 2. Create ledger entry if party exists
            if (invoice.partyId) {
                const isSale = invoice.transactionType === "SALE";
                const amount = invoice.balance;

                // Sale: party owes us (DEBIT), Purchase: we owe party (CREDIT)
                const ledgerType = isSale ? "DEBIT" : "CREDIT";
                const narration = isSale
                    ? `Sale Invoice #${invoice.orderNumber}`
                    : `Purchase Invoice #${invoice.orderNumber}`;

                // Get current party balance
                const party = await tx.party.findUnique({ where: { id: invoice.partyId } });
                if (party) {
                    const currentBalance = Number(party.balance);
                    const invoiceAmount = Number(amount);
                    const newBalance = isSale
                        ? currentBalance + invoiceAmount
                        : currentBalance - invoiceAmount;

                    await tx.ledgerEntry.create({
                        data: {
                            orgId: invoice.orgId,
                            partyId: invoice.partyId,
                            invoiceId: id,
                            type: ledgerType,
                            amount: Math.abs(invoiceAmount),
                            balance: newBalance,
                            narration,
                        },
                    });

                    // Update party balance
                    await tx.party.update({
                        where: { id: invoice.partyId },
                        data: { balance: newBalance },
                    });
                }
            }

            // 3. Inventory adjustments by transaction type.
            for (const item of invoice.items) {
                if (invoice.transactionType === "SALE") {
                    // Sale: linked stock item leaves inventory.
                    if (!item.inventoryItemId) continue;

                    const inventoryItem = await tx.inventoryItem.findUnique({
                        where: { id: item.inventoryItemId },
                    });

                    if (!inventoryItem) {
                        console.warn(`Inventory item ${item.inventoryItemId} not found for invoice item ${item.id}`);
                        continue;
                    }

                    await tx.inventoryItem.update({
                        where: { id: item.inventoryItemId },
                        data: {
                            status: "SOLD",
                            soldAt: new Date(),
                            saleId: id,
                        },
                    });

                    await tx.stockMovement.create({
                        data: {
                            orgId: invoice.orgId,
                            inventoryItemId: item.inventoryItemId,
                            type: "SALE",
                            quantityChange: -1,
                            weightChange:
                                Number(item.adjustedGoldWeight) > 0
                                    ? Number(item.adjustedGoldWeight) * -1
                                    : Number(item.estimatedGoldWeight) * -1,
                            referenceId: id,
                            remarks: `Invoice #${invoice.orderNumber}`,
                        },
                    });
                    continue;
                }

                // Purchase: add invoice item into stock and link it back.
                let categoryId = item.categoryId || null;
                if (!categoryId) {
                    const fallbackCategory = await tx.category.findFirst({
                        where: { orgId: invoice.orgId },
                        orderBy: { createdAt: "asc" },
                    });
                    if (!fallbackCategory) {
                        throw new Error("No category found. Add at least one category before finalizing purchase.");
                    }
                    categoryId = fallbackCategory.id;
                }

                const normalizedCarat = Math.max(1, Math.min(24, Math.round(Number(item.carat) || 24)));
                const purityLabel = `${normalizedCarat}K`;
                const requestedMetalTypeId = requestedMetalTypeBySortOrder.get(item.sortOrder);

                let metalType = requestedMetalTypeId
                    ? await tx.metalType.findFirst({
                        where: { id: requestedMetalTypeId, orgId: invoice.orgId },
                    })
                    : null;

                if (metalType && !metalType.isActive) {
                    metalType = await tx.metalType.update({
                        where: { id: metalType.id },
                        data: { isActive: true },
                    });
                }

                if (!metalType) {
                    metalType = await tx.metalType.findFirst({
                    where: { orgId: invoice.orgId, purity: purityLabel, isActive: true },
                });
                }

                // If matching purity exists but is inactive, reactivate and reuse it.
                if (!metalType) {
                    const inactiveMatch = await tx.metalType.findFirst({
                        where: { orgId: invoice.orgId, purity: purityLabel },
                        orderBy: { createdAt: "asc" },
                    });
                    if (inactiveMatch) {
                        metalType = inactiveMatch.isActive
                            ? inactiveMatch
                            : await tx.metalType.update({
                                where: { id: inactiveMatch.id },
                                data: { isActive: true },
                            });
                    }
                }

                if (!metalType) {
                    metalType = await tx.metalType.findFirst({
                        where: { orgId: invoice.orgId, name: { contains: "Gold", mode: "insensitive" }, isActive: true },
                        orderBy: { createdAt: "asc" },
                    });
                }
                if (!metalType) {
                    metalType = await tx.metalType.findFirst({
                        where: { orgId: invoice.orgId, isActive: true },
                        orderBy: { createdAt: "asc" },
                    });
                }

                // Last-resort fallback: reuse any metal type (even inactive) or create one.
                if (!metalType) {
                    const anyMetalType = await tx.metalType.findFirst({
                        where: { orgId: invoice.orgId },
                        orderBy: { createdAt: "asc" },
                    });
                    if (anyMetalType) {
                        metalType = anyMetalType.isActive
                            ? anyMetalType
                            : await tx.metalType.update({
                                where: { id: anyMetalType.id },
                                data: { isActive: true },
                            });
                    }
                }
                if (!metalType) {
                    const purityValue = Number(((normalizedCarat / 24) * 100).toFixed(4));
                    metalType = await tx.metalType.create({
                        data: {
                            orgId: invoice.orgId,
                            name: "Gold",
                            purity: purityLabel,
                            purityValue,
                            isActive: true,
                        },
                    });
                }

                const productName =
                    item.description?.trim() || `Purchased Item ${invoice.orderNumber}-${item.sortOrder + 1}`;

                let product = await tx.product.findFirst({
                    where: {
                        orgId: invoice.orgId,
                        name: productName,
                        categoryId,
                        metalTypeId: metalType.id,
                    },
                });

                if (!product) {
                    product = await tx.product.create({
                        data: {
                            orgId: invoice.orgId,
                            name: productName,
                            categoryId,
                            metalTypeId: metalType.id,
                            designCode: `INV-${invoice.orderNumber}-${item.sortOrder + 1}`,
                            imageUrl: item.imageUrl || null,
                        },
                    });
                } else if (!product.imageUrl && item.imageUrl) {
                    product = await tx.product.update({
                        where: { id: product.id },
                        data: { imageUrl: item.imageUrl },
                    });
                }

                const baseSku = `INV-${invoice.orderNumber}-${item.sortOrder + 1}`;
                let sku = baseSku;
                let skuSuffix = 1;
                while (await tx.inventoryItem.findFirst({ where: { orgId: invoice.orgId, sku } })) {
                    sku = `${baseSku}-${skuSuffix++}`;
                }

                const netWeight = Number(item.estimatedGoldWeight) || Number(item.adjustedGoldWeight) || 0;
                const stoneWeight = Number(item.stoneWeight) || 0;
                const beadsWeight = Number(item.beadsWeight) || 0;
                const diamondWeight = Number(item.diamondWeight) || 0;
                const grossWeight =
                    Number(item.estimatedGrossWeight) || netWeight + stoneWeight + beadsWeight + diamondWeight;
                const quantity = Math.max(1, Number(item.pieces) || 1);

                const createdInventory = await tx.inventoryItem.create({
                    data: {
                        orgId: invoice.orgId,
                        productId: product.id,
                        metalTypeId: metalType.id,
                        supplierId: invoice.partyId || null,
                        sku,
                        grossWeight,
                        netWeight,
                        stoneWeight,
                        otherWeight: beadsWeight + diamondWeight,
                        quantity,
                        status: "AVAILABLE",
                        location: "Invoice Purchase",
                        designCode: product.designCode || null,
                    },
                });

                await tx.stockMovement.create({
                    data: {
                        orgId: invoice.orgId,
                        inventoryItemId: createdInventory.id,
                        type: "PURCHASE",
                        quantityChange: quantity,
                        weightChange: netWeight,
                        referenceId: id,
                        remarks: `Invoice #${invoice.orderNumber}`,
                    },
                });

                await tx.invoiceItem.update({
                    where: { id: item.id },
                    data: { inventoryItemId: createdInventory.id },
                });
            }

            // 4. Create audit log
            await tx.auditLog.create({
                data: {
                    orgId: invoice.orgId,
                    invoiceId: id,
                    action: "FINALIZE",
                    entityType: "Invoice",
                    entityId: id,
                    changes: { status: { old: "DRAFT", new: "FINALIZED" } },
                },
            });

            return finalized;
        });

        console.log("Finalization successful");
        return NextResponse.json({
            success: true,
            data: result,
            message: "Invoice finalized, ledger updated, inventory adjusted",
        });
    } catch (error) {
        console.error("POST /api/invoices/[id]/finalize error:", error);
        // Better error logging
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to finalize invoice" },
            { status: 500 }
        );
    }
}
