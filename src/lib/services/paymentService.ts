import prisma from "@/lib/prisma";
import { PaymentStatus, PaymentMode, LedgerType, PaymentCategory, Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";

export const paymentService = {

    /**
     * Creates a core Payment object
     */
    async createPayment(data: {
        orgId: string;
        partyId: string;
        invoiceId?: string;
        category: PaymentCategory;
        totalAmount: number;
        invoiceDate?: Date;
        dueDate: Date;
    }) {
        return prisma.payment.create({
            data: {
                orgId: data.orgId,
                partyId: data.partyId,
                invoiceId: data.invoiceId,
                category: data.category,
                totalAmount: data.totalAmount,
                paidAmount: 0,
                remainingAmount: data.totalAmount,
                invoiceDate: data.invoiceDate || new Date(),
                dueDate: data.dueDate,
                status: PaymentStatus.PENDING,
            }
        });
    },

    /**
     * Adds a Transaction and Atomically Updates Payment & Ledger
     */
    async addTransaction(data: {
        paymentId: string;
        amount: number; // Value in cash equivalent
        mode: PaymentMode;
        date?: Date;
        goldWeight?: number;
        goldRate?: number;
        notes?: string;
    }) {
        return await prisma.$transaction(async (tx) => {
            // 1. Fetch Payment
            const payment = await tx.payment.findUnique({
                where: { id: data.paymentId },
                include: { party: true }
            });

            if (!payment) throw new Error("Payment not found");
            if (payment.status === PaymentStatus.PAID) throw new Error("Payment is already fully paid");

            const newAmount = new Decimal(data.amount);
            const currentPaid = new Decimal(payment.paidAmount);
            const currentTotal = new Decimal(payment.totalAmount);

            // 2. Calculate New Values
            const updatedPaid = currentPaid.plus(newAmount);
            let updatedRemaining = currentTotal.minus(updatedPaid);

            // Prevent marking negative remaining unless explicitly allowed (for now, cap at 0)
            if (updatedRemaining.lessThan(0)) {
                updatedRemaining = new Decimal(0);
            }

            // 3. Determine New Status
            let newStatus: PaymentStatus = PaymentStatus.PENDING;
            if (updatedRemaining.equals(0)) {
                newStatus = PaymentStatus.PAID;
            } else if (updatedPaid.greaterThan(0)) {
                newStatus = PaymentStatus.PARTIAL;
            }

            // Also check for Overdue
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(payment.dueDate);
            due.setHours(0, 0, 0, 0);

            if (updatedRemaining.greaterThan(0) && today > due) {
                newStatus = PaymentStatus.OVERDUE;
            }

            // 4. Create Transaction
            const transaction = await tx.paymentTransaction.create({
                data: {
                    paymentId: payment.id,
                    amount: data.amount,
                    mode: data.mode,
                    date: data.date || new Date(),
                    goldWeight: data.goldWeight,
                    goldRate: data.goldRate,
                    notes: data.notes
                }
            });

            // 5. Update Payment
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    paidAmount: updatedPaid.toNumber(),
                    remainingAmount: updatedRemaining.toNumber(),
                    status: newStatus,
                    paidDate: newStatus === PaymentStatus.PAID ? new Date() : null
                }
            });

            // 6. Create Ledger Entry for Atomic Tracking
            // If Receivable (Customer paying us): We CREDIT their account (reduces their balance)
            // If Payable (We pay Supplier): We DEBIT their account (reduces our liability to them)
            const ledgerType = payment.category === PaymentCategory.RECEIVABLE ? LedgerType.CREDIT : LedgerType.DEBIT;

            // Optional: Calculate running balance for party. 
            // In a real double-entry, we'd query the latest balance.
            // For now we'll fetch existing, apply change, and save.
            let partyNewBalance = new Decimal(payment.party.balance);
            if (ledgerType === LedgerType.CREDIT) {
                partyNewBalance = partyNewBalance.minus(newAmount);
            } else {
                partyNewBalance = partyNewBalance.plus(newAmount); // Assuming a negative balance logic, but adjust based on your party logic
            }

            // Update Party Balance (Assuming standard: Positive = Customer owes us. Supplier logic might differ slightly)
            await tx.party.update({
                where: { id: payment.partyId },
                data: { balance: partyNewBalance.toNumber() }
            });

            await tx.ledgerEntry.create({
                data: {
                    orgId: payment.orgId,
                    partyId: payment.partyId,
                    invoiceId: payment.invoiceId,
                    paymentTxId: transaction.id,
                    type: ledgerType,
                    amount: data.amount,
                    balance: partyNewBalance.toNumber(),
                    narration: `Payment Transaction: $data.mode} - $data.notes || ''}`,
                    date: data.date || new Date()
                }
            });

            return { transaction, newStatus, remainingAmount: updatedRemaining.toNumber() };
        });
    },

    /**
     * Get Paginated and Filtered Payments
     */
    async getPayments(params: {
        orgId: string;
        category: PaymentCategory;
        page: number;
        pageSize: number;
        status?: PaymentStatus;
        search?: string;
    }) {
        const skip = (params.page - 1) * params.pageSize;

        const where: Prisma.PaymentWhereInput = {
            orgId: params.orgId,
            category: params.category,
        };

        if (params.status) {
            where.status = params.status;
        }

        if (params.search) {
            where.party = {
                name: { contains: params.search, mode: "insensitive" }
            };
        }

        try {
            const [items, total] = await Promise.all([
                prisma.payment.findMany({
                    where,
                    include: {
                        party: { select: { name: true, mobile: true } },
                        invoice: { select: { receiptNo: true } } // Changed to receiptNo
                    },
                    orderBy: [
                        { status: 'asc' }, // usually you'd want Overdue first. We can do custom sorts later.
                        { dueDate: 'asc' }
                    ],
                    skip,
                    take: params.pageSize,
                }),
                prisma.payment.count({ where })
            ]);

            return {
                items,
                total,
                page: params.page,
                totalPages: Math.ceil(total / params.pageSize)
            };
        } catch (error: unknown) {
            console.error("FATAL ERROR in getPayments:", error);
            throw error;
        }
    },

    /**
     * Get Payment Detailed Timeline
     */
    async getPaymentDetails(paymentId: string) {
        return prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                party: true,
                invoice: true,
                transactions: {
                    orderBy: { date: 'asc' }
                },
                reminders: {
                    orderBy: { sentAt: 'asc' }
                }
            }
        });
    },

    /**
     * Dashboard Cash Flow Stats
     */
    async getDashboardStats(orgId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const next7Days = new Date(today);
        next7Days.setDate(next7Days.getDate() + 7);

        // This could be optimized into a groupBy, but for simplicity and safety against Decimal parsing:
        const payments = await prisma.payment.findMany({
            where: {
                orgId,
                status: { not: PaymentStatus.PAID }
            },
            select: {
                category: true,
                remainingAmount: true,
                dueDate: true,
                status: true
            }
        });

        let totalReceivables = new Decimal(0);
        let totalPayables = new Decimal(0);
        let overdueReceivables = new Decimal(0);
        let overduePayables = new Decimal(0);
        let incoming7Days = new Decimal(0);
        let outgoing7Days = new Decimal(0);

        payments.forEach(p => {
            const remaining = new Decimal(p.remainingAmount);
            const due = new Date(p.dueDate);
            due.setHours(0, 0, 0, 0);

            if (p.category === PaymentCategory.RECEIVABLE) {
                totalReceivables = totalReceivables.plus(remaining);
                if (p.status === PaymentStatus.OVERDUE) overdueReceivables = overdueReceivables.plus(remaining);
                if (due >= today && due <= next7Days) incoming7Days = incoming7Days.plus(remaining);
            } else {
                totalPayables = totalPayables.plus(remaining);
                if (p.status === PaymentStatus.OVERDUE) overduePayables = overduePayables.plus(remaining);
                if (due >= today && due <= next7Days) outgoing7Days = outgoing7Days.plus(remaining);
            }
        });

        const netCash = totalReceivables.minus(totalPayables);

        return {
            totalReceivables: totalReceivables.toNumber(),
            totalPayables: totalPayables.toNumber(),
            netCash: netCash.toNumber(),
            overdueReceivables: overdueReceivables.toNumber(),
            overduePayables: overduePayables.toNumber(),
            expectedIncoming7Days: incoming7Days.toNumber(),
            expectedOutgoing7Days: outgoing7Days.toNumber()
        };
    },

    /**
     * Calculate Risk Score for a Party
     */
    async getPartyRiskScore(partyId: string) {
        const payments = await prisma.payment.findMany({
            where: { partyId },
            select: {
                status: true,
                dueDate: true,
                paidDate: true,
                remainingAmount: true
            }
        });

        if (payments.length === 0) {
            return {
                score: 0,
                level: "LOW" as const,
                metrics: {
                    totalPayments: 0,
                    lateRatio: 0,
                    avgDelayDays: 0,
                    totalOutstanding: 0
                }
            };
        }

        let lateCount = 0;
        let totalDelayDays = 0;
        let totalRemaining = new Decimal(0);

        payments.forEach(p => {
            totalRemaining = totalRemaining.plus(p.remainingAmount);

            if (p.status === PaymentStatus.OVERDUE) {
                lateCount++;
                const diffTime = Math.abs(new Date().getTime() - new Date(p.dueDate).getTime());
                totalDelayDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else if (p.status === PaymentStatus.PAID && p.paidDate && new Date(p.paidDate) > new Date(p.dueDate)) {
                lateCount++;
                const diffTime = Math.abs(new Date(p.paidDate).getTime() - new Date(p.dueDate).getTime());
                totalDelayDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        });

        const lateRatio = lateCount / payments.length;
        const avgDelay = lateCount > 0 ? totalDelayDays / lateCount : 0;

        // Arbitrary scoring algorithm: 0-10
        let score = 0;
        if (lateRatio > 0.5) score += 4;
        else if (lateRatio > 0.2) score += 2;

        if (avgDelay > 14) score += 4;
        else if (avgDelay > 5) score += 2;

        // Can add Credit Utilization checking here if we add creditLimit to Party

        let level: "LOW" | "MEDIUM" | "HIGH" = "LOW";
        if (score >= 7) level = "HIGH";
        else if (score >= 4) level = "MEDIUM";

        return {
            score,
            level,
            metrics: {
                totalPayments: payments.length,
                lateRatio,
                avgDelayDays: avgDelay,
                totalOutstanding: totalRemaining.toNumber()
            }
        };
    }
};
