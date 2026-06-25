import { NextRequest, NextResponse } from "next/server";
import { runAgent, executeConfirmedAction } from "@/lib/ai-agent";
import { getToolsByName, ALL_TOOLS } from "@/lib/agent-tools";
import { QuotaError, quotaErrorResponse } from "@modules/ai-automation/application/quotaError";

// ── Agent definitions — each has its own tool set and persona ─────────────────

// Suffix added to every agent prompt to prevent infinite tool loops
const LOOP_GUARD = `

IMPORTANT: After calling 1-2 tools, STOP and give your final answer as plain text.
Do NOT call the same tool twice. Do NOT keep searching if you have enough data.
If a tool returns empty results, say so directly — do not keep trying.
Always end with a complete text response, never leave the user waiting.`;

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
    business: `You are a helpful ERP assistant for Akhtar Jewellers, a Pakistani jewellery shop.
You speak BOTH English and Urdu fluently. Always respond in the SAME language the user wrote in.
If they write in Urdu (Roman Urdu or Nastaliq/Arabic script), reply in Urdu.
If they write in English, reply in English. Mix languages only if the user does.

You have access to live ERP data through tools. Call a tool ONCE if you need data, then give your final answer immediately.
Be concise. Use PKR for currency, grams for weight. Friendly, professional tone.${LOOP_GUARD}`,

    sales: `You are the Sales Agent for Akhtar Jewellers. You help with invoices, customer queries, and inventory lookup.
You speak BOTH English and Urdu fluently. Always respond in the SAME language the user wrote in.

Focus: invoices, customer balances, inventory availability, sales performance.
Call a tool ONCE, then answer immediately. Currency: PKR. Weight: grams.${LOOP_GUARD}`,

    collections: `You are the Collections Agent for Akhtar Jewellers. You help manage outstanding payments and overdue accounts.
You speak BOTH English and Urdu fluently. Always respond in the SAME language the user wrote in.

Focus: overdue payments, party balances, ledger history, metal rate updates.
List overdue parties clearly with amounts and days overdue. Call a tool ONCE then answer.
Currency: PKR. Tone: firm but respectful.${LOOP_GUARD}`,
};

const AGENT_TOOLS: Record<string, string[]> = {
    business: ["search_party", "get_party_ledger", "get_invoices", "get_overdue_payments", "get_metal_rates", "get_sales_summary", "search_inventory", "get_customer_orders"],
    sales: ["search_party", "get_party_ledger", "get_invoices", "search_inventory", "get_sales_summary", "get_customer_orders"],
    collections: ["search_party", "get_party_ledger", "get_overdue_payments", "get_metal_rates", "update_metal_rate"],
};

// ── Run the agent ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const { message, agentId = "business", history = [], confirmAction } = await req.json() as {
            message: string;
            agentId: string;
            history: { role: "user" | "assistant"; content: string }[];
            confirmAction?: { tool: string; input: Record<string, unknown> };
        };

        // Confirmed write action — re-validate server-side. The client is NOT trusted:
        // only tools that genuinely exist AND are flagged requiresConfirmation may run here.
        if (confirmAction) {
            const def = ALL_TOOLS.find((t) => t.name === confirmAction.tool);
            if (!def || !def.requiresConfirmation) {
                return NextResponse.json(
                    { success: false, error: `Tool "${confirmAction.tool}" is not a confirmable action.` },
                    { status: 403 }
                );
            }
            // The tool must also be in the active agent's allowed set.
            const allowed = AGENT_TOOLS[agentId] ?? AGENT_TOOLS.business;
            if (!allowed.includes(confirmAction.tool)) {
                return NextResponse.json(
                    { success: false, error: `Tool "${confirmAction.tool}" is not available to this agent.` },
                    { status: 403 }
                );
            }
            const result = await executeConfirmedAction(confirmAction.tool, confirmAction.input);
            return NextResponse.json({ success: true, response: `Done. ${confirmAction.tool.replace(/_/g, " ")} completed.`, toolCalls: [{ tool: confirmAction.tool, input: confirmAction.input, result, isWrite: true }] });
        }

        if (!message?.trim()) {
            return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
        }

        const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId] ?? AGENT_SYSTEM_PROMPTS.business;
        const toolNames = AGENT_TOOLS[agentId] ?? AGENT_TOOLS.business;
        const tools = getToolsByName(toolNames);

        // Hard 25-second timeout so the UI never hangs indefinitely
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("AGENT_TIMEOUT")), 25000)
        );

        const result = await Promise.race([runAgent(message, history, tools, systemPrompt), timeout]);
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error("Agent error:", err);
        if (err instanceof QuotaError) {
            return NextResponse.json(quotaErrorResponse(err), { status: 402 });
        }
        if (err instanceof Error && err.message === "AGENT_TIMEOUT") {
            return NextResponse.json({
                success: true,
                response: "معذرت، جواب دینے میں بہت وقت لگ رہا ہے۔ براہ کرم دوبارہ پوچھیں۔\n\n(Sorry, taking too long. Please ask again — try a simpler question.)",
                toolCalls: [],
            });
        }
        const msg = err instanceof Error ? err.message : "Agent failed";
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

// GET — return agent definitions for the UI
export async function GET() {
    return NextResponse.json({
        agents: [
            {
                id: "business",
                name: "Business Assistant",
                nameUrdu: "کاروباری معاون",
                description: "General purpose — asks about anything in your ERP",
                descUrdu: "عام مقاصد — اپنے ERP میں کچھ بھی پوچھیں",
                icon: "🏪",
                tools: AGENT_TOOLS.business.length,
                examples: [
                    "Ahmed Khan ka balance kya hai?",
                    "Aaj ki sales batao",
                    "22 karat gold ring stock mein hai?",
                    "Pending orders dikhao",
                ],
            },
            {
                id: "sales",
                name: "Sales Agent",
                nameUrdu: "سیلز ایجنٹ",
                description: "Invoices, customer history, inventory lookup",
                descUrdu: "انوائسز، کسٹمر ہسٹری، انوینٹری",
                icon: "📄",
                tools: AGENT_TOOLS.sales.length,
                examples: [
                    "Last 5 invoices for Ramesh Kumar",
                    "Kon sa item sabse zyada bika is maheene?",
                    "Gold necklace available hai?",
                    "Ramesh ka pura hisab dikhao",
                ],
            },
            {
                id: "collections",
                name: "Collections Agent",
                nameUrdu: "وصولی ایجنٹ",
                description: "Overdue payments, balances, rate updates",
                descUrdu: "واجبات، بقایا رقم، نرخ اپ ڈیٹ",
                icon: "💰",
                tools: AGENT_TOOLS.collections.length,
                examples: [
                    "Sabse zyada bakaya kiska hai?",
                    "30 din se zyada overdue payments",
                    "Sona rate 9500 per gram kar do",
                    "Ahmed aur Ramesh dono ka balance",
                ],
            },
        ],
    });
}
