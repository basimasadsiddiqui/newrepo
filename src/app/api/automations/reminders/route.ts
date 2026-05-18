import { NextResponse } from "next/server";
import prisma from "@core/database";
import { getActiveProviderKey, isProviderPuterLLM } from "@/lib/ai-key-manager";
import { aiChat } from "@/lib/ai-providers";

const ORG_ID = "org-akhtar";

export async function GET() {
    try {
        const now = new Date();
        const parties = await prisma.payment.findMany({
            where: {
                orgId: ORG_ID,
                status: { in: ["OVERDUE", "PENDING"] },
                dueDate: { lt: now },
                remainingAmount: { gt: 0 },
            },
            include: { party: { select: { name: true, mobile: true } } },
            orderBy: { remainingAmount: "desc" },
            take: 20,
        });

        const formatted = parties.map((p) => {
            const daysOverdue = Math.floor((now.getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: p.id,
                partyName: p.party.name,
                mobile: p.party.mobile,
                amount: Number(p.remainingAmount),
                dueDate: p.dueDate,
                daysOverdue,
            };
        });

        return NextResponse.json({ success: true, parties: formatted });
    } catch (err) {
        console.error("Reminders GET error:", err);
        return NextResponse.json({ success: false, error: "Failed to load parties" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { partyName, amount, daysOverdue, mobile } = await req.json();
        const [active, isPuter] = await Promise.all([getActiveProviderKey(), isProviderPuterLLM()]);

        const waBase = mobile
            ? `https://wa.me/92${mobile.replace(/^0/, "").replace(/\D/g, "")}`
            : null;

        // Puter.js mode — return prompts so client generates with Puter browser-side
        if (isPuter) {
            return NextResponse.json({
                success: true, mode: "puter",
                partyName, amount, daysOverdue, mobile,
                puterSystemPrompt: "You write polite, friendly WhatsApp payment reminder messages for Akhtar Jewellers, a Pakistani jewellery shop. Keep messages short (3-4 lines), warm, and professional. Use PKR. Write in English with an optional Urdu line. No markdown, plain text only.",
                puterUserPrompt: `Write a WhatsApp reminder for: Customer: ${partyName}, Amount due: PKR ${amount.toLocaleString()}, Days overdue: ${daysOverdue}. The message is from Akhtar Jewellers.`,
                templateMessage: generateTemplateMessage(partyName, amount, daysOverdue),
                waBase,
            });
        }

        let message: string;
        let usedProvider: string | null = null;

        if (active) {
            try {
                const { text, provider } = await aiChat(
                    "You write polite, friendly WhatsApp payment reminder messages for Akhtar Jewellers, a Pakistani jewellery shop. Keep messages short (3-4 lines), warm, and professional. Use PKR. Write in English (you can add a line in Urdu if appropriate). Do not use markdown, just plain text.",
                    [{ role: "user", content: `Write a WhatsApp reminder for: Customer: ${partyName}, Amount due: PKR ${amount.toLocaleString()}, Days overdue: ${daysOverdue}. The message is from Akhtar Jewellers.` }],
                    200,
                );
                message = text;
                usedProvider = provider;
            } catch {
                message = generateTemplateMessage(partyName, amount, daysOverdue);
            }
        } else {
            message = generateTemplateMessage(partyName, amount, daysOverdue);
        }

        const waLink = waBase ? `${waBase}?text=${encodeURIComponent(message)}` : null;
        return NextResponse.json({ success: true, message, waLink, mode: active ? "online" : "offline", provider: usedProvider });
    } catch (err) {
        console.error("Reminders POST error:", err);
        return NextResponse.json({ success: false, error: "Failed to generate message" }, { status: 500 });
    }
}

function generateTemplateMessage(name: string, amount: number, daysOverdue: number): string {
    const urgency = daysOverdue > 30 ? "kindly" : "gently";
    return `Assalamu Alaikum ${name} ji,

We ${urgency} remind you that an amount of PKR ${amount.toLocaleString()} is due to Akhtar Jewellers (${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue).

Kindly settle the payment at your earliest convenience. Thank you for your continued trust and business.

— Akhtar Jewellers`;
}
