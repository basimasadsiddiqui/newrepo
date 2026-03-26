import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OrderStatus, LedgerType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const order = await prisma.customerOrder.findUnique({
            where: { id },
            include: {
                party: true,
                karigar: true,
                items: {
                    include: {
                        category: true,
                        metalType: true,
                    },
                },
            },
        });

        if (!order) {
            return NextResponse.json(
                { success: false, error: "Order not found" },
                { status: 404 }
            );
        }

        const formattedOrder = {
            ...order,
            totalAmount: Number(order.totalAmount),
            customerDisplayName: order.party?.name || (order.customCustomerName || "--"),
            customerContact: order.party?.mobile || "--",
            items: order.items.map((item: any) => ({
                ...item,
                weight: Number(item.weight),
                rate: Number(item.rate),
                totalAmount: Number(item.totalAmount),
            })),
            party: order.party ? {
                ...order.party,
                balance: Number(order.party.balance),
            } : null,
            karigar: order.karigar
                ? {
                    ...order.karigar,
                    balance: Number(order.karigar.balance),
                }
                : null,
            karigarDisplayName: order.karigar ? order.karigar.name : (order.customKarigarName || "--"),
        };

        return NextResponse.json({
            success: true,
            data: formattedOrder,
        });
    } catch (error) {
        console.error("GET /api/customer-orders/[id] error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch customer order" },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const {
            karigarId,
            partyId,
            customCustomerName,
            customKarigarName,
            dueDate,
            notes,
            status,
            items,
        } = body;

        const orgId = "org-akhtar"; // Keeping simple for now, ideally extracted from auth or context

        // Fetch current order to see if status changed
        const existingOrder = await prisma.customerOrder.findUnique({
            where: { id }
        });

        if (!existingOrder) {
            return NextResponse.json(
                { success: false, error: "Order not found" },
                { status: 404 }
            );
        }

        // Calculate total amount if items are provided, otherwise keep existing
        let newTotalAmount = Number(existingOrder.totalAmount);
        if (items && items.length > 0) {
            newTotalAmount = items.reduce(
                (sum: number, item: any) => sum + (Number(item.totalAmount) || 0),
                0
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update the order and items
            let updatedOrder;

            const baseUpdateData: any = {
                ...(karigarId !== undefined && { karigarId: karigarId || null }),
                ...(customKarigarName !== undefined && { customKarigarName: !karigarId ? customKarigarName : null }),
                ...(partyId !== undefined && { partyId: partyId || null }),
                ...(customCustomerName !== undefined && { customCustomerName: !partyId ? customCustomerName : null }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(notes !== undefined && { notes }),
                ...(status !== undefined && { status }),
                ...(items && items.length > 0 && { totalAmount: newTotalAmount })
            };

            if (items && items.length > 0) {
                // To replace items entirely: we delete existing and recreate
                await tx.customerOrderItem.deleteMany({
                    where: { orderId: id }
                });

                updatedOrder = await tx.customerOrder.update({
                    where: { id },
                    data: {
                        ...baseUpdateData,
                        items: {
                            create: items.map((item: any) => ({
                                description: item.description,
                                tagNo: item.tagNo,
                                categoryId: item.categoryId || null,
                                metalTypeId: item.metalTypeId || null,
                                quantity: Number(item.quantity) || 1,
                                weight: Number(item.weight) || 0,
                                rate: Number(item.rate) || 0,
                                totalAmount: Number(item.totalAmount) || 0,
                                notes: item.notes,
                            })),
                        },
                    },
                    include: {
                        party: true,
                        karigar: true,
                        items: true,
                    },
                });
            } else {
                updatedOrder = await tx.customerOrder.update({
                    where: { id },
                    data: baseUpdateData,
                    include: {
                        party: true,
                        karigar: true,
                        items: true,
                    },
                });
            }

            // 2. Handle Status Ledger Integration logic ONLY if there is a linked Party profile
            if (status !== existingOrder.status && existingOrder.partyId) {
                const currentBalance = await tx.party.findUnique({
                    where: { id: existingOrder.partyId },
                    select: { balance: true }
                });
                let newBalance = Number(currentBalance?.balance || 0);

                if (status === "COMPLETED") {
                    // Generate DEBIT entry (Customer owes us because order is completed)
                    newBalance += newTotalAmount; // Debit increases positive balance
                    await tx.party.update({
                        where: { id: existingOrder.partyId },
                        data: { balance: newBalance }
                    });

                    await tx.ledgerEntry.create({
                        data: {
                            orgId: existingOrder.orgId,
                            partyId: existingOrder.partyId,
                            type: LedgerType.DEBIT,
                            amount: newTotalAmount,
                            balance: newBalance,
                            narration: `Order Completed - #${existingOrder.orderNumber}`,
                            date: new Date()
                        }
                    });
                } else if (existingOrder.status === "COMPLETED" && (status === "CANCELLED" || status === "PENDING")) {
                    // Revert previously created DEBIT entry by creating a CREDIT entry
                    const revertAmount = Number(existingOrder.totalAmount);
                    newBalance -= revertAmount; // Credit decreases positive balance
                    await tx.party.update({
                        where: { id: existingOrder.partyId },
                        data: { balance: newBalance }
                    });

                    await tx.ledgerEntry.create({
                        data: {
                            orgId: existingOrder.orgId,
                            partyId: existingOrder.partyId,
                            type: LedgerType.CREDIT,
                            amount: revertAmount,
                            balance: newBalance,
                            narration: `Order Status Reverted from Completed - #${existingOrder.orderNumber}`,
                            date: new Date()
                        }
                    });
                }

                // Also update the retrieved order party balance for immediate response if affected
                if (updatedOrder.party) {
                    updatedOrder.party.balance = newBalance as any;
                }
            }

            return updatedOrder;
        });

        // Convert decimals for response
        const formattedResult = {
            ...result,
            totalAmount: Number(result.totalAmount),
            customerDisplayName: result.party?.name || (result.customCustomerName || "--"),
            karigarDisplayName: result.karigar?.name || (result.customKarigarName || "--"),
            items: result.items.map((item: any) => ({
                ...item,
                weight: Number(item.weight),
                rate: Number(item.rate),
                totalAmount: Number(item.totalAmount),
            })),
            party: result.party ? {
                ...result.party,
                balance: Number(result.party.balance),
            } : null,
        };

        return NextResponse.json(
            { success: true, data: formattedResult },
            { status: 200 }
        );
    } catch (error) {
        console.error("PUT /api/customer-orders/[id] error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update customer order", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
