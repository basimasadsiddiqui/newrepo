import { NextRequest, NextResponse } from "next/server";
import prisma from "@core/database";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const orgId = url.searchParams.get("orgId") || "org-akhtar";
        const status = url.searchParams.get("status") as OrderStatus | null;
        const search = url.searchParams.get("search"); // Customer name search

        const whereClause: any = { orgId };

        if (status) {
            whereClause.status = status;
        }

        if (search) {
            whereClause.OR = [
                {
                    party: {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    customCustomerName: {
                        contains: search,
                        mode: "insensitive"
                    }
                }
            ];
        }

        const orders = await prisma.customerOrder.findMany({
            where: whereClause,
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
            orderBy: {
                date: "desc",
            },
        });

        // Convert Decimal to number for JSON response
        const formattedOrders = orders.map((order: any) => ({
            ...order,
            totalAmount: Number(order.totalAmount),
            customerDisplayName: order.party ? order.party.name : (order.customCustomerName || "--"),
            customerContact: order.party ? order.party.mobile : "--",
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
        }));

        return NextResponse.json({
            success: true,
            data: formattedOrders,
        });
    } catch (error) {
        console.error("GET /api/customer-orders error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch customer orders" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            orgId = "org-akhtar",
            partyId,
            customCustomerName,
            karigarId,
            customKarigarName,
            dueDate,
            notes,
            items,
        } = body;

        if (!partyId && !customCustomerName) {
            return NextResponse.json(
                { success: false, error: "Either a registered Customer or a custom Name is required" },
                { status: 400 }
            );
        }

        if (!items || items.length === 0) {
            return NextResponse.json(
                { success: false, error: "At least one item is required" },
                { status: 400 }
            );
        }

        // Calculate total amount
        const totalAmount = items.reduce(
            (sum: number, item: any) => sum + (Number(item.totalAmount) || 0),
            0
        );

        const newOrder = await prisma.customerOrder.create({
            data: {
                orgId,
                partyId: partyId || null,
                customCustomerName: !partyId ? customCustomerName : null,
                karigarId: karigarId || null,
                customKarigarName: !karigarId ? customKarigarName : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                notes,
                totalAmount,
                status: "PENDING",
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
                items: {
                    include: {
                        category: true,
                        metalType: true,
                    },
                },
            },
        });

        // Convert decimals for response
        const formattedOrder = {
            ...newOrder,
            totalAmount: Number(newOrder.totalAmount),
            customerDisplayName: newOrder.party ? newOrder.party.name : (newOrder.customCustomerName || "--"),
            karigarDisplayName: newOrder.karigar ? newOrder.karigar.name : (newOrder.customKarigarName || "--"),
            items: newOrder.items.map((item: any) => ({
                ...item,
                weight: Number(item.weight),
                rate: Number(item.rate),
                totalAmount: Number(item.totalAmount),
            })),
        };

        return NextResponse.json(
            { success: true, data: formattedOrder },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/customer-orders error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create customer order" },
            { status: 500 }
        );
    }
}
