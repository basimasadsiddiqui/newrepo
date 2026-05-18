import prisma from "@core/database";
import { PaymentCategory, PaymentStatus } from "@prisma/client";

/**
 * InvoiceRepository — all Prisma queries for the invoice module.
 * API route handlers delegate to this layer; they contain no DB logic directly.
 */
export const InvoiceRepository = {
    async findMany(orgId: string, page: number, pageSize: number, status?: string) {
        const where: Record<string, unknown> = { orgId };
        if (status) where.status = status;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { items: { orderBy: { sortOrder: "asc" } } },
            }),
            prisma.invoice.count({ where }),
        ]);

        return { invoices, total };
    },

    async findById(id: string) {
        return prisma.invoice.findUnique({
            where: { id },
            include: { items: { orderBy: { sortOrder: "asc" } } },
        });
    },

    async getNextReceiptNumber(orgId: string): Promise<number> {
        const lastInvoice = await prisma.invoice.findFirst({
            where: { orgId },
            orderBy: { orderNumber: "desc" },
            select: { orderNumber: true },
        });
        return (lastInvoice?.orderNumber ?? 0) + 1;
    },

    async create(orgId: string, data: any, items: any[]) {
        return prisma.invoice.create({
            data: {
                orgId,
                ...data,
                items: { create: items },
            },
            include: { items: true },
        });
    },

    async update(id: string, data: any) {
        return prisma.invoice.update({
            where: { id },
            data,
            include: { items: { orderBy: { sortOrder: "asc" } } },
        });
    },

    async delete(id: string) {
        return prisma.invoice.delete({ where: { id } });
    },

    async finalize(id: string) {
        return prisma.invoice.update({
            where: { id },
            data: { status: "FINALIZED" },
        });
    },

    async createPaymentForInvoice(
        orgId: string,
        partyId: string,
        invoiceId: string,
        invoiceDate: Date,
        dueDate: Date,
        totalAmount: number,
        balance: number,
        transactionType: string
    ) {
        const numBalance = Number(balance);
        const numTotal = Number(totalAmount);
        if (numBalance <= 0 || !partyId) return null;

        return prisma.payment.create({
            data: {
                orgId,
                partyId,
                invoiceId,
                category:
                    transactionType === "SALE"
                        ? PaymentCategory.RECEIVABLE
                        : PaymentCategory.PAYABLE,
                totalAmount: numTotal,
                paidAmount: numTotal - numBalance,
                remainingAmount: numBalance,
                invoiceDate,
                dueDate,
                status:
                    numTotal - numBalance > 0
                        ? PaymentStatus.PARTIAL
                        : PaymentStatus.PENDING,
            },
        });
    },
};
