/**
 * Unified AI provider abstraction.
 * All automations call aiChat() / aiAnalyzeImage() — the active provider is resolved automatically.
 */
import { getActiveProviderKey, PROVIDERS, ProviderId } from "@/lib/ai-key-manager";
import { detectQuotaError, QuotaError } from "@/lib/quota-error";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

/**
 * GPT-5, o1, and o3 series models require `max_completion_tokens` instead of `max_tokens`.
 * Returns the correct param object to spread into the request.
 */
function tokenLimit(model: string, count: number): { max_tokens?: number; max_completion_tokens?: number } {
    const usesCompletionTokens = /^(gpt-5|o1|o3)/i.test(model);
    return usesCompletionTokens ? { max_completion_tokens: count } : { max_tokens: count };
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function aiChat(
    systemPrompt: string,
    messages: ChatMessage[],
    maxTokens = 500
): Promise<{ text: string; provider: string }> {
    const active = await getActiveProviderKey();
    if (!active) throw new Error("No AI provider configured. Add an API key in Automations → Settings.");

    const { provider, apiKey } = active;
    try {
        const text = await callChat(provider.id, apiKey, provider.chatModel, provider.baseURL, systemPrompt, messages, maxTokens);
        return { text, provider: provider.name };
    } catch (err) {
        const qErr = detectQuotaError(err, provider.name);
        if (qErr) throw qErr;
        throw err;
    }
}

// ── Vision ────────────────────────────────────────────────────────────────────

export async function aiAnalyzeImage(
    imageBase64: string,
    mediaType: string,
    prompt: string
): Promise<{ text: string; provider: string }> {
    const active = await getActiveProviderKey();
    if (!active) throw new Error("No AI provider configured.");

    const { provider, apiKey } = active;

    if (!provider.supportsVision) {
        // Fall back to Anthropic if current provider can't do vision but we have a key
        const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
        if (anthropicKey) {
            const text = await anthropicVision(anthropicKey, imageBase64, mediaType, prompt);
            return { text, provider: PROVIDERS.anthropic.name };
        }
        throw new Error(`${provider.name} does not support image analysis. Add an Anthropic, OpenAI, or Google key for vision.`);
    }

    try {
        const text = await callVision(provider.id, apiKey, provider.visionModel, imageBase64, mediaType, prompt);
        return { text, provider: provider.name };
    } catch (err) {
        const qErr = detectQuotaError(err, provider.name);
        if (qErr) throw qErr;
        throw err;
    }
}

// ── Internal dispatch ─────────────────────────────────────────────────────────

async function callChat(
    providerId: ProviderId,
    apiKey: string,
    model: string,
    baseURL: string | undefined,
    systemPrompt: string,
    messages: ChatMessage[],
    maxTokens: number,
): Promise<string> {
    if (providerId === "anthropic") {
        return anthropicChat(apiKey, model, systemPrompt, messages, maxTokens);
    }
    if (providerId === "google") {
        return googleChat(apiKey, model, systemPrompt, messages, maxTokens);
    }
    // openai / deepseek / mistral — all OpenAI-compatible
    return openaiCompatChat(apiKey, baseURL, model, systemPrompt, messages, maxTokens);
}

async function callVision(
    providerId: ProviderId,
    apiKey: string,
    model: string,
    imageBase64: string,
    mediaType: string,
    prompt: string,
): Promise<string> {
    if (providerId === "anthropic") return anthropicVision(apiKey, imageBase64, mediaType, prompt);
    if (providerId === "google") return googleVision(apiKey, model, imageBase64, mediaType, prompt);
    if (providerId === "openai") return openaiVision(apiKey, model, imageBase64, mediaType, prompt);
    // mistral vision via OpenAI compat
    if (providerId === "mistral") return openaiVision(apiKey, "pixtral-12b-2409", imageBase64, mediaType, prompt, "https://api.mistral.ai/v1");
    throw new Error("Vision not supported for this provider");
}

// ── Anthropic ─────────────────────────────────────────────────────────────────

async function anthropicChat(
    apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[], maxTokens: number
): Promise<string> {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return res.content[0].type === "text" ? res.content[0].text : "";
}

async function anthropicVision(
    apiKey: string, imageBase64: string, mediaType: string, prompt: string
): Promise<string> {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
        model: PROVIDERS.anthropic.visionModel,
        max_tokens: 300,
        messages: [{
            role: "user",
            content: [
                {
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: (mediaType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                        data: imageBase64,
                    },
                },
                { type: "text", text: prompt },
            ],
        }],
    });
    return res.content[0].type === "text" ? res.content[0].text : "";
}

// ── OpenAI-compatible (OpenAI, DeepSeek, Mistral text) ───────────────────────

async function openaiCompatChat(
    apiKey: string,
    baseURL: string | undefined,
    model: string,
    systemPrompt: string,
    messages: ChatMessage[],
    maxTokens: number,
): Promise<string> {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    const res = await client.chat.completions.create({
        model,
        ...tokenLimit(model, maxTokens),
        messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
    });
    return res.choices[0]?.message?.content ?? "";
}

async function openaiVision(
    apiKey: string, model: string, imageBase64: string, mediaType: string, prompt: string,
    baseURL?: string
): Promise<string> {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    const res = await client.chat.completions.create({
        model,
        ...tokenLimit(model, 300),
        messages: [{
            role: "user",
            content: [
                { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
                { type: "text", text: prompt },
            ],
        }],
    });
    return res.choices[0]?.message?.content ?? "";
}

// ── Google Gemini ─────────────────────────────────────────────────────────────

async function googleChat(
    apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[], maxTokens: number
): Promise<string> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: maxTokens },
    });

    // Convert history (all but last message)
    const history = messages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
    }));

    const chat = gemini.startChat({ history });
    const lastMsg = messages[messages.length - 1]?.content ?? "";
    const res = await chat.sendMessage(lastMsg);
    return res.response.text();
}

async function googleVision(
    apiKey: string, model: string, imageBase64: string, mediaType: string, prompt: string
): Promise<string> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({ model, generationConfig: { maxOutputTokens: 300 } });
    const res = await gemini.generateContent([
        { inlineData: { mimeType: mediaType as "image/jpeg" | "image/png" | "image/webp", data: imageBase64 } },
        prompt,
    ]);
    return res.response.text();
}
