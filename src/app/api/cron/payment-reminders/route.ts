import { NextResponse } from "next/server";
import prisma from "@core/database";
import { PaymentStatus } from "@prisma/client";

// In production, this route should be secured (e.g., verifying a Vercel Cron Secret)
// export const maxDuration = 60; // For Vercel, allow longer execution if processing many records

export async function GET(req: Request) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch payments that are not fully paid
        const activePayments = await prisma.payment.findMany({
            where: {
                status: {
                    in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE]
                }
            },
            include: { party: true }
        });

        const remindersSent = [];

        for (const payment of activePayments) {
            const dueDate = new Date(payment.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            // Calculate difference in days
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let reminderType = null;

            if (diffDays === 3) {
                reminderType = "BEFORE_DUE_3_DAYS";
            } else if (diffDays === 0) {
                reminderType = "ON_DUE_DATE";
            } else if (diffDays === -3) {
                reminderType = "OVERDUE_3_DAYS";
            }

            if (reminderType) {
                // Check if this specific reminder type was already sent today for this payment
                // to prevent duplicate emails if cron runs multiple times
                const alreadySent = await prisma.paymentReminder.findFirst({
                    where: {
                        paymentId: payment.id,
                        type: reminderType,
                        sentAt: { gte: today }
                    }
                });

                if (!alreadySent) {
                    // Logic to actually send email/SMS would go here
                    // e.g., await sendEmail(payment.party.email, `Invoice Due Reminder: ...`);

                    // Log the reminder
                    const reminder = await prisma.paymentReminder.create({
                        data: {
                            paymentId: payment.id,
                            type: reminderType,
                            channel: "SYSTEM_LOG", // Future: "EMAIL", "SMS", "WHATSAPP"
                        }
                    });

                    remindersSent.push({
                        paymentId: payment.id,
                        party: payment.party.name,
                        type: reminderType,
                        amountRemaining: payment.remainingAmount.toString()
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed $activePayments.length} active payments. Sent $remindersSent.length} new reminders.`,
            remindersSent
        });

    } catch (error: any) {
        console.error("Cron /api/cron/payment-reminders error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
