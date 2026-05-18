/**
 * Agentic loop — runs multi-step tool calling against the active AI provider.
 * Supports Anthropic, OpenAI-compatible (OpenAI/DeepSeek/Mistral/GitHub), and Google Gemini.
 * Automatically handles provider-specific message formats.
 */
import { getActiveProviderKey, PROVIDERS } from "@/lib/ai-key-manager";
import { detectQuotaError } from "@/lib/quota-error";

function tokenLimit(model: string, count: number): { max_tokens?: number; max_completion_tokens?: number } {
    return /^(gpt-5|o1|o3)/i.test(model) ? { max_completion_tokens: count } : { max_tokens: count };
}
import type { ProviderId } from "@/lib/ai-key-manager";
import { executeTool } from "@/lib/agent-tools";
import type { AgentTool } from "@/lib/agent-tools";

export interface AgentHistoryMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ToolCallRecord {
    tool: string;
    input: Record<string, unknown>;
    result: unknown;
    isWrite: boolean;
}

export interface AgentRunResult {
    response: string;
    toolCalls: ToolCallRecord[];
    provider: string;
    pendingConfirmation?: {
        tool: string;
        input: Record<string, unknown>;
        description: string;
    };
}

const MAX_ITERATIONS = 6;

// ── Build JSON Schema for tools per provider format ───────────────────────────

function toAnthropicTools(tools: AgentTool[]) {
    return tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
    }));
}

function toOpenAITools(tools: AgentTool[]) {
    return tools.map((t) => ({
        type: "function" as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));
}

function toGeminiFunctions(tools: AgentTool[]) {
    return tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
    }));
}

// ── Anthropic agentic loop ────────────────────────────────────────────────────

async function runAnthropic(
    apiKey: string,
    model: string,
    systemPrompt: string,
    history: AgentHistoryMessage[],
    tools: AgentTool[],
): Promise<AgentRunResult> {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    type AntMsg = { role: "user" | "assistant"; content: string | object[] };
    const messages: AntMsg[] = history.map((m) => ({ role: m.role, content: m.content }));
    const toolCalls: ToolCallRecord[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const res = await client.messages.create({
            model,
            max_tokens: 1024,
            system: systemPrompt,
            tools: toAnthropicTools(tools) as Parameters<typeof client.messages.create>[0]["tools"],
            messages: messages as Parameters<typeof client.messages.create>[0]["messages"],
        });

        if (res.stop_reason === "end_turn") {
            const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
            return { response: text, toolCalls, provider: PROVIDERS.anthropic.name };
        }

        if (res.stop_reason === "tool_use") {
            const assistantContent = res.content;
            messages.push({ role: "assistant", content: assistantContent });

            const toolResults: object[] = [];
            for (const block of assistantContent) {
                if (block.type !== "tool_use") continue;
                const tb = block as { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
                const tool = tools.find((t) => t.name === tb.name);

                if (tool?.requiresConfirmation) {
                    return {
                        response: `I need to ${tb.name.replace(/_/g, " ")} with these details: ${JSON.stringify(tb.input)}. Please confirm.`,
                        toolCalls,
                        provider: PROVIDERS.anthropic.name,
                        pendingConfirmation: { tool: tb.name, input: tb.input, description: tool.description },
                    };
                }

                const result = await executeTool(tb.name, tb.input);
                toolCalls.push({ tool: tb.name, input: tb.input, result, isWrite: false });
                toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: JSON.stringify(result) });
            }
            messages.push({ role: "user", content: toolResults });
        }
    }
    return { response: "I reached my thinking limit. Please try a simpler query.", toolCalls, provider: PROVIDERS.anthropic.name };
}

// ── OpenAI-compatible agentic loop ────────────────────────────────────────────

async function runOpenAICompat(
    apiKey: string,
    model: string,
    baseURL: string | undefined,
    providerName: string,
    systemPrompt: string,
    history: AgentHistoryMessage[],
    tools: AgentTool[],
): Promise<AgentRunResult> {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

    type OAIMsg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string; tool_calls?: unknown[] };
    const messages: OAIMsg[] = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];
    const toolCalls: ToolCallRecord[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const res = await client.chat.completions.create({
            model,
            ...tokenLimit(model, 1024),
            tools: toOpenAITools(tools),
            tool_choice: "auto",
            messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
        });

        const choice = res.choices[0];
        const msg = choice.message;

        if (!msg.tool_calls || msg.tool_calls.length === 0) {
            return { response: msg.content ?? "", toolCalls, provider: providerName };
        }

        messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });

        for (const tc of msg.tool_calls) {
            const fn = (tc as { id: string; type: string; function: { name: string; arguments: string } }).function;
            let input: Record<string, unknown> = {};
            try { input = JSON.parse(fn.arguments); } catch { /* ignore */ }

            const tool = tools.find((t) => t.name === fn.name);
            if (tool?.requiresConfirmation) {
                return {
                    response: `I need to ${fn.name.replace(/_/g, " ")} with these details: ${JSON.stringify(input)}. Please confirm.`,
                    toolCalls,
                    provider: providerName,
                    pendingConfirmation: { tool: fn.name, input, description: tool.description },
                };
            }

            const result = await executeTool(fn.name, input);
            toolCalls.push({ tool: fn.name, input, result, isWrite: false });
            messages.push({ role: "tool", content: JSON.stringify(result), tool_call_id: tc.id, name: fn.name });
        }
    }
    return { response: "I reached my thinking limit. Please try a simpler query.", toolCalls, provider: providerName };
}

// ── Google Gemini agentic loop ────────────────────────────────────────────────

async function runGoogle(
    apiKey: string,
    model: string,
    systemPrompt: string,
    history: AgentHistoryMessage[],
    tools: AgentTool[],
): Promise<AgentRunResult> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ functionDeclarations: toGeminiFunctions(tools) as any }],
        generationConfig: { maxOutputTokens: 1024 },
    });

    const geminiHistory = history.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
    }));

    const chat = gemini.startChat({ history: geminiHistory });
    const toolCalls: ToolCallRecord[] = [];
    let lastMessage = history[history.length - 1]?.content ?? "";

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const res = await chat.sendMessage(lastMessage);
        const parts = res.response.candidates?.[0]?.content?.parts ?? [];

        const fnCalls = parts.filter((p) => "functionCall" in p);
        if (fnCalls.length === 0) {
            return { response: res.response.text(), toolCalls, provider: PROVIDERS.google.name };
        }

        const fnResponses: object[] = [];
        for (const part of fnCalls) {
            const fc = (part as { functionCall: { name: string; args: Record<string, unknown> } }).functionCall;
            const tool = tools.find((t) => t.name === fc.name);
            if (tool?.requiresConfirmation) {
                return {
                    response: `I need to ${fc.name.replace(/_/g, " ")} with: ${JSON.stringify(fc.args)}. Please confirm.`,
                    toolCalls,
                    provider: PROVIDERS.google.name,
                    pendingConfirmation: { tool: fc.name, input: fc.args, description: tool.description },
                };
            }
            const result = await executeTool(fc.name, fc.args);
            toolCalls.push({ tool: fc.name, input: fc.args, result, isWrite: false });
            fnResponses.push({ functionResponse: { name: fc.name, response: { result } } });
        }
        lastMessage = fnResponses as unknown as string;
    }
    return { response: "Thinking limit reached. Try a simpler query.", toolCalls, provider: PROVIDERS.google.name };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runAgent(
    userMessage: string,
    history: AgentHistoryMessage[],
    tools: AgentTool[],
    systemPrompt: string,
): Promise<AgentRunResult> {
    const active = await getActiveProviderKey();
    if (!active) throw new Error("No AI provider configured. Add a key in Automations → Settings.");

    const { provider, apiKey } = active;
    const fullHistory: AgentHistoryMessage[] = [
        ...history,
        { role: "user", content: userMessage },
    ];

    try {
        if (provider.id === "anthropic") {
            return await runAnthropic(apiKey, provider.chatModel, systemPrompt, fullHistory, tools);
        }
        if (provider.id === "google") {
            return await runGoogle(apiKey, provider.chatModel, systemPrompt, fullHistory, tools);
        }
        return await runOpenAICompat(apiKey, provider.chatModel, provider.baseURL, provider.name, systemPrompt, fullHistory, tools);
    } catch (err) {
        const qErr = detectQuotaError(err, provider.name);
        if (qErr) throw qErr;
        throw err;
    }
}

// ── Confirm and execute a pending write action ────────────────────────────────

export async function executeConfirmedAction(
    tool: string,
    input: Record<string, unknown>,
): Promise<unknown> {
    return executeTool(tool, input);
}
