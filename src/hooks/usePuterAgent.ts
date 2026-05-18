"use client";

import { useCallback } from "react";

// ── Puter global ──────────────────────────────────────────────────────────────

declare global {
    interface Window {
        puter?: {
            ai: {
                txt2speech: (text: string, opts?: object | string) => Promise<HTMLAudioElement>;
                chat: (
                    input: string | PuterMessage[],
                    optsOrUrl?: string | PuterChatOptions,
                    opts?: PuterChatOptions
                ) => Promise<PuterChatResponse>;
            };
        };
    }
}

interface PuterMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface PuterChatOptions {
    model?: string;
    stream?: boolean;
    temperature?: number;
}

type PuterChatResponse =
    | string
    | { message?: { content?: string | Array<{ type?: string; text?: string }> | null } }
    | { content?: string | Array<{ type?: string; text?: string }> };

// ── Load Puter.js CDN once ────────────────────────────────────────────────────

let puterScriptPromise: Promise<void> | null = null;

function loadPuterScript(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.puter) return Promise.resolve();
    if (puterScriptPromise) return puterScriptPromise;
    puterScriptPromise = new Promise((resolve, reject) => {
        if (document.querySelector('script[src*="puter.com"]')) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://js.puter.com/v2/";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Puter.js"));
        document.head.appendChild(s);
    });
    return puterScriptPromise;
}

// ── Normalise Puter response — handles all model formats ─────────────────────

function extractText(res: PuterChatResponse): string {
    if (typeof res === "string") return res;

    // OpenAI-style: { message: { content: "..." } }
    const msgContent = (res as { message?: { content?: unknown } }).message?.content;
    if (msgContent !== undefined && msgContent !== null) {
        if (typeof msgContent === "string") return msgContent;
        if (Array.isArray(msgContent)) {
            return msgContent
                .filter((b) => !b.type || b.type === "text")
                .map((b) => b.text ?? (typeof b === "string" ? b : ""))
                .join("");
        }
    }

    // Claude direct: { content: [...] }
    const directContent = (res as { content?: unknown }).content;
    if (directContent) {
        if (typeof directContent === "string") return directContent;
        if (Array.isArray(directContent)) {
            return (directContent as Array<{ type?: string; text?: string }>)
                .filter((b) => !b.type || b.type === "text")
                .map((b) => b.text ?? "")
                .join("");
        }
    }

    return String(res ?? "");
}

// ── Intent detection — what data does this message need? ─────────────────────

function detectTools(msg: string): string[] {
    const m = msg.toLowerCase();
    const tools: string[] = [];

    if (/ramesh|ahmed|khan|kumar|ali|party|customer|supplier|balan|hisaab|khata|ledger|account/.test(m))
        tools.push("search_party");
    if (/ledger|transaction|history|hisaab|khata|payment history|pura hisaab/.test(m))
        tools.push("get_party_ledger");
    if (/overdue|pending payment|baqaya|due|unpaid|outstanding/.test(m))
        tools.push("get_overdue_payments");
    if (/invoice|bill|sale|purchase|order list/.test(m))
        tools.push("get_invoices");
    if (/stock|inventory|item|product|available|maal|cheez/.test(m))
        tools.push("search_inventory");
    if (/gold rate|silver rate|metal rate|sona rate|chandi rate|rate today/.test(m))
        tools.push("get_metal_rates");
    if (/sales|today sale|aaj ki|farokht|revenue|total/.test(m))
        tools.push("get_sales_summary");
    if (/order|custom order|karigar|pending order/.test(m))
        tools.push("get_customer_orders");

    return tools.length > 0 ? tools : ["get_metal_rates", "get_overdue_payments"];
}

/** Extract likely party name from Urdu/English message */
function extractPartyName(msg: string): string | null {
    const cleaned = msg
        .replace(/(ka|ki|ke|kuch|kahan|hai|hain|dikhao|batao|check|karo|pura|hisaab|balance|ledger|account|show|me|the|of|for|party|customer|supplier|search|find|ek|aik|yeh|woh|unka|uska|dono)/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    const words = cleaned.split(" ").filter((w) => w.length > 2 && !/^\d+$/.test(w));
    return words.length > 0 ? words.slice(0, 2).join(" ") : null;
}

// ── Fetch data from server (DB stays server-side) ─────────────────────────────

async function fetchTool(tool: string, input: Record<string, unknown>): Promise<unknown> {
    try {
        const r = await fetch("/api/automations/tool-exec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tool, input }),
        });
        const d = await r.json();
        return d.success ? d.result : { error: d.error };
    } catch {
        return { error: "Tool fetch failed" };
    }
}

function formatResult(data: unknown): string {
    if (!data) return "No data found.";
    if (Array.isArray(data)) {
        if (data.length === 0) return "No records found.";
        return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data, null, 2);
}

// ── Main context-stuffing agent ───────────────────────────────────────────────

export interface PuterAgentResult {
    response: string;
    toolCalls: Array<{ tool: string; input: Record<string, unknown>; result: unknown; isWrite: boolean }>;
    provider: string;
}

export function usePuterAgent(model = "gpt-5-nano") {
    const run = useCallback(
        async (
            message: string,
            history: Array<{ role: "user" | "assistant"; content: string }>,
            agentId: string
        ): Promise<PuterAgentResult> => {
            await loadPuterScript();
            if (!window.puter) throw new Error("Puter.js failed to load");

            const toolCalls: PuterAgentResult["toolCalls"] = [];
            const neededTools = detectTools(message);
            const partyName = extractPartyName(message);

            // ── Step 1: Fetch relevant data ───────────────────────────────────
            const dataContext: string[] = [];

            for (const tool of neededTools) {
                let input: Record<string, unknown> = {};
                let result: unknown;

                if (tool === "search_party") {
                    if (!partyName) continue;
                    input = { name: partyName };
                    result = await fetchTool(tool, input);
                    toolCalls.push({ tool, input, result, isWrite: false });

                    const parties = Array.isArray(result) ? result : [];
                    if (parties.length > 0) {
                        dataContext.push(`PARTY DATA for "${partyName}":\n${formatResult(result)}`);

                        // Auto-fetch ledger if user asked for history
                        if (neededTools.includes("get_party_ledger") && parties[0]?.id) {
                            const ledgerInput = { partyId: parties[0].id, limit: 15 };
                            const ledger = await fetchTool("get_party_ledger", ledgerInput);
                            toolCalls.push({ tool: "get_party_ledger", input: ledgerInput, result: ledger, isWrite: false });
                            dataContext.push(`LEDGER for ${parties[0].name}:\n${formatResult(ledger)}`);
                        }
                    } else {
                        dataContext.push(`No party found matching "${partyName}".`);
                    }
                    continue;
                }

                if (tool === "get_party_ledger") continue; // handled above with search_party

                if (tool === "get_sales_summary") {
                    input = { period: "today" };
                } else if (tool === "get_customer_orders") {
                    input = { status: "PENDING", limit: 10 };
                } else if (tool === "get_invoices") {
                    input = { limit: 10, status: "FINALIZED" };
                } else if (tool === "search_inventory") {
                    const keyword = partyName ?? "";
                    input = { keyword, status: "AVAILABLE", limit: 10 };
                }

                result = await fetchTool(tool, input);
                toolCalls.push({ tool, input, result, isWrite: false });
                dataContext.push(`${tool.toUpperCase().replace(/_/g, " ")}:\n${formatResult(result)}`);
            }

            // ── Step 2: Single Puter call with all data in context ────────────
            const agentPersonas: Record<string, string> = {
                business: "a helpful ERP assistant for Akhtar Jewellers",
                sales: "the Sales Agent for Akhtar Jewellers",
                collections: "the Collections Agent for Akhtar Jewellers focused on payments",
            };

            const systemPrompt = `You are ${agentPersonas[agentId] ?? agentPersonas.business}, a Pakistani jewellery shop.

IMPORTANT RULES:
- Respond in the SAME language the user wrote in. Urdu for Urdu, English for English.
- If user writes Roman Urdu (like "hisaab dikhao"), reply in Roman Urdu or Urdu script.
- Use PKR for money, grams for weight.
- Present data clearly — use bullet points or a simple table.
- If data is present below, USE IT to answer. Do not say "let me search" — the search is already done.
- If no data is found, say so clearly.

LIVE ERP DATA FETCHED FOR THIS QUERY:
${dataContext.length > 0 ? dataContext.join("\n\n") : "No specific data fetched — answer from context."}`;

            const messages: PuterMessage[] = [
                { role: "system", content: systemPrompt },
                ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                { role: "user", content: message },
            ];

            const res = await window.puter.ai.chat(messages, { model });
            const response = extractText(res) || "Data fetch complete — see tool results.";

            return { response, toolCalls, provider: `Puter.js (${model})` };
        },
        [model]
    );

    return { run };
}

// ── Simple chat (for VoiceAssistant, digest, reminders etc.) ─────────────────

export async function puterChat(
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string,
    model = "gpt-5-nano"
): Promise<string> {
    await loadPuterScript();
    if (!window.puter) throw new Error("Puter.js failed to load");

    // Guard: some models error on empty content — use a fallback placeholder
    const userContent = message.trim() || "Please respond based on the system prompt.";

    const messages: PuterMessage[] = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userContent },
    ];

    const res = await window.puter.ai.chat(messages, { model });
    return extractText(res);
}

// ── Image analysis (uses Puter's dedicated image API) ─────────────────────────

export async function puterImageAnalysis(
    imageDataUri: string,   // full data URI: "data:image/jpeg;base64,..."
    prompt: string,
    model = "gpt-5-nano"
): Promise<string> {
    await loadPuterScript();
    if (!window.puter) throw new Error("Puter.js failed to load");

    // Puter image API: puter.ai.chat(textPrompt, imageUrl, options)
    const res = await window.puter.ai.chat(prompt, imageDataUri, { model });
    return extractText(res);
}
