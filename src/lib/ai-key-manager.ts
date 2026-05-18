import prisma from "@/lib/prisma";

const ORG_ID = "org-akhtar";

export type ProviderId = "anthropic" | "openai" | "deepseek" | "google" | "mistral" | "github" | "puter_llm";

export interface ProviderInfo {
    id: ProviderId;
    name: string;
    description: string;
    keyHint: string;       // input placeholder
    keyPrefix?: string;    // for basic format validation
    supportsVision: boolean;
    chatModel: string;
    visionModel: string;
    baseURL?: string;      // OpenAI-compatible custom base URL
    docsUrl: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
    anthropic: {
        id: "anthropic",
        name: "Anthropic Claude",
        description: "Claude Haiku — fast, accurate, vision capable",
        keyHint: "sk-ant-api03-...",
        keyPrefix: "sk-ant-",
        supportsVision: true,
        chatModel: "claude-haiku-4-5-20251001",
        visionModel: "claude-haiku-4-5-20251001",
        docsUrl: "https://console.anthropic.com/settings/keys",
    },
    openai: {
        id: "openai",
        name: "OpenAI (ChatGPT)",
        description: "GPT-4o-mini — reliable, vision capable",
        keyHint: "sk-proj-...",
        keyPrefix: "sk-",
        supportsVision: true,
        chatModel: "gpt-4o-mini",
        visionModel: "gpt-4o-mini",
        docsUrl: "https://platform.openai.com/api-keys",
    },
    deepseek: {
        id: "deepseek",
        name: "DeepSeek",
        description: "DeepSeek-Chat V3 — very cost-effective",
        keyHint: "sk-...",
        keyPrefix: "sk-",
        supportsVision: false,
        chatModel: "deepseek-chat",
        visionModel: "deepseek-chat",
        baseURL: "https://api.deepseek.com",
        docsUrl: "https://platform.deepseek.com/api_keys",
    },
    google: {
        id: "google",
        name: "Google Gemini",
        description: "Gemini 2.0 Flash — fast, vision capable",
        keyHint: "AIzaSy...",
        supportsVision: true,
        chatModel: "gemini-2.0-flash",
        visionModel: "gemini-2.0-flash",
        docsUrl: "https://aistudio.google.com/app/apikey",
    },
    mistral: {
        id: "mistral",
        name: "Mistral AI",
        description: "Mistral Small — European, privacy-focused",
        keyHint: "...",
        supportsVision: false,
        chatModel: "mistral-small-latest",
        visionModel: "mistral-small-latest",
        baseURL: "https://api.mistral.ai/v1",
        docsUrl: "https://console.mistral.ai/api-keys",
    },
    puter_llm: {
        id: "puter_llm",
        name: "Puter.js (Free AI)",
        description: "400+ models, no API key, runs in your browser — GPT-5, Claude, Gemini, DeepSeek & more",
        keyHint: "",           // no key required
        keyPrefix: undefined,
        supportsVision: true,
        chatModel: "gpt-5-nano",
        visionModel: "gpt-5-nano",
        docsUrl: "https://docs.puter.com/ai/chat/",
    },
    github: {
        id: "github",
        name: "GitHub Models",
        description: "OpenAI GPT-4o, Llama 4, Phi & more — one GitHub PAT unlocks all",
        keyHint: "github_pat_...",
        keyPrefix: "github_pat_",
        supportsVision: true,
        chatModel: "gpt-4o-mini",    // default — always available, swap via model picker
        visionModel: "gpt-4o-mini",
        baseURL: "https://models.inference.ai.azure.com",
        docsUrl: "https://github.com/settings/tokens",
    },
};

// ── GitHub Models catalog ────────────────────────────────────────────────────
// All accessible with a single GitHub PAT via models.inference.ai.azure.com

export interface GitHubModel {
    id: string;
    label: string;
    provider: string;
    supportsVision: boolean;
    description: string;
}

export const GITHUB_MODELS: GitHubModel[] = [
    // ── GPT-5 family ─────────────────────────────────────────────────────────
    { id: "gpt-5",      label: "GPT-5",       provider: "OpenAI", supportsVision: true,  description: "Logic-heavy and multi-step tasks — most capable" },
    { id: "gpt-5-mini", label: "GPT-5 Mini",  provider: "OpenAI", supportsVision: true,  description: "Lightweight, cost-effective — great default" },
    { id: "gpt-5-nano", label: "GPT-5 Nano",  provider: "OpenAI", supportsVision: false, description: "Fastest response, lowest latency" },
    { id: "gpt-5-chat", label: "GPT-5 Chat",  provider: "OpenAI", supportsVision: true,  description: "Advanced multimodal conversations" },
    // ── GPT-4o family ────────────────────────────────────────────────────────
    { id: "gpt-4o-mini",                                       label: "GPT-4o Mini",        provider: "OpenAI",    supportsVision: true,  description: "Fast, vision capable — proven reliable" },
    { id: "gpt-4o",                                            label: "GPT-4o",             provider: "OpenAI",    supportsVision: true,  description: "High quality, vision, slightly slower" },
    // ── Meta Llama ───────────────────────────────────────────────────────────
    { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct",         label: "Llama 4 Scout 17B",  provider: "Meta",      supportsVision: true,  description: "Free, multilingual, great Urdu support" },
    { id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", label: "Llama 4 Maverick",   provider: "Meta",      supportsVision: true,  description: "More powerful Llama 4 variant" },
    { id: "meta-llama/Meta-Llama-3.1-70B-Instruct",            label: "Llama 3.1 70B",      provider: "Meta",      supportsVision: false, description: "Proven, reliable, large model" },
    // ── Microsoft Phi ────────────────────────────────────────────────────────
    { id: "Phi-4",                                             label: "Phi-4",              provider: "Microsoft", supportsVision: false, description: "Small but smart, very fast" },
    { id: "Phi-4-mini-instruct",                               label: "Phi-4 Mini",         provider: "Microsoft", supportsVision: false, description: "Lightest and fastest option" },
    // ── Mistral ──────────────────────────────────────────────────────────────
    { id: "mistral-small",                                     label: "Mistral Small",      provider: "Mistral",   supportsVision: false, description: "European, privacy-focused" },
];

// ── Types stored in Organization.settings ────────────────────────────────────

interface StoredProviderEntry {
    apiKey: string;
    addedAt: string;
    selectedModel?: string; // for providers with model choice (e.g. github)
}

interface AIConfig {
    activeProvider: ProviderId;
    providers: Partial<Record<ProviderId, StoredProviderEntry>>;
}

interface OrgSettings {
    aiConfig?: AIConfig;
    // legacy field from the old single-key setup
    anthropicApiKey?: string;
    anthropicKeyAddedAt?: string;
    [key: string]: unknown;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function loadSettings(): Promise<OrgSettings> {
    const org = await prisma.organization.findUnique({
        where: { id: ORG_ID },
        select: { settings: true },
    });
    return ((org?.settings ?? {}) as OrgSettings);
}

async function saveSettings(settings: OrgSettings): Promise<void> {
    await prisma.organization.upsert({
        where: { id: ORG_ID },
        update: { settings: settings as object },
        create: { id: ORG_ID, name: "Akhtar Jewellers", settings: settings as object },
    });
}

function getAIConfig(settings: OrgSettings): AIConfig {
    if (settings.aiConfig) return settings.aiConfig;
    // Migrate legacy single Anthropic key
    const legacy = settings.anthropicApiKey?.trim();
    return {
        activeProvider: legacy ? "anthropic" : "anthropic",
        providers: legacy
            ? { anthropic: { apiKey: legacy, addedAt: settings.anthropicKeyAddedAt ?? new Date().toISOString() } }
            : {},
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Activate Puter.js LLM (no API key required — just sets it as active provider with chosen model). */
export async function activatePuterLLM(model: string): Promise<void> {
    const settings = await loadSettings();
    const config = getAIConfig(settings);
    config.activeProvider = "puter_llm";
    // Store chosen model under providers.puter_llm using a dummy key
    config.providers["puter_llm"] = { apiKey: "__puter_llm__", addedAt: new Date().toISOString(), selectedModel: model };
    settings.aiConfig = config;
    await saveSettings(settings);
}

/** True when puter_llm is the active provider (AI runs in browser, not server). */
export async function isProviderPuterLLM(): Promise<boolean> {
    try {
        const settings = await loadSettings();
        return getAIConfig(settings).activeProvider === "puter_llm";
    } catch {
        return false;
    }
}

/** Returns the API key + resolved provider info for the currently active provider (or null). */
export async function getActiveProviderKey(): Promise<{ provider: ProviderInfo; apiKey: string } | null> {
    try {
        const settings = await loadSettings();
        const config = getAIConfig(settings);
        const entry = config.providers[config.activeProvider];
        if (entry?.apiKey?.trim()) {
            // puter_llm has no real server-side key — caller must handle client-side
            if (config.activeProvider === "puter_llm") return null;

            const baseProvider = PROVIDERS[config.activeProvider];
            const provider: ProviderInfo = entry.selectedModel
                ? { ...baseProvider, chatModel: entry.selectedModel, visionModel: entry.selectedModel }
                : baseProvider;
            return { provider, apiKey: entry.apiKey.trim() };
        }

        // .env fallback (Anthropic only for backward compat)
        const envKey = process.env.ANTHROPIC_API_KEY?.trim();
        if (envKey) return { provider: PROVIDERS.anthropic, apiKey: envKey };

        return null;
    } catch {
        const envKey = process.env.ANTHROPIC_API_KEY?.trim();
        if (envKey) return { provider: PROVIDERS.anthropic, apiKey: envKey };
        return null;
    }
}

/** Set the selected model for a provider (GitHub Models supports multiple). */
export async function setProviderModel(providerId: ProviderId, modelId: string): Promise<void> {
    const settings = await loadSettings();
    const config = getAIConfig(settings);
    const entry = config.providers[providerId];
    if (!entry) throw new Error(`Provider ${providerId} not configured yet`);
    entry.selectedModel = modelId;
    settings.aiConfig = config;
    await saveSettings(settings);
}

/** Get the currently selected model for a provider. */
export async function getProviderSelectedModel(providerId: ProviderId): Promise<string | null> {
    const settings = await loadSettings();
    const config = getAIConfig(settings);
    return config.providers[providerId]?.selectedModel ?? null;
}

/** Get the currently active provider ID. */
export async function getActiveProviderId(): Promise<ProviderId> {
    const settings = await loadSettings();
    return getAIConfig(settings).activeProvider;
}

/** Returns metadata for all providers (no keys exposed). */
export async function getAllProviderStatus(): Promise<{
    activeProvider: ProviderId;
    configured: Partial<Record<ProviderId, { preview: string; addedAt: string; isActive: boolean; selectedModel?: string }>>;
}> {
    try {
        const settings = await loadSettings();
        const config = getAIConfig(settings);
        const envAnthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

        const configured: Partial<Record<ProviderId, { preview: string; addedAt: string; isActive: boolean; selectedModel?: string }>> = {};

        for (const pid of Object.keys(PROVIDERS) as ProviderId[]) {
            const entry = config.providers[pid];
            if (entry?.apiKey?.trim()) {
                const k = entry.apiKey.trim();
                configured[pid] = {
                    preview: `${k.slice(0, 8)}...${k.slice(-4)}`,
                    addedAt: entry.addedAt,
                    isActive: config.activeProvider === pid,
                    selectedModel: entry.selectedModel,
                };
            } else if (pid === "anthropic" && envAnthropicKey) {
                configured.anthropic = {
                    preview: `${envAnthropicKey.slice(0, 8)}...${envAnthropicKey.slice(-4)}`,
                    addedAt: "via .env",
                    isActive: config.activeProvider === "anthropic",
                };
            }
        }

        return { activeProvider: config.activeProvider, configured };
    } catch {
        return { activeProvider: "anthropic", configured: {} };
    }
}

/** Save a provider API key. */
export async function setProviderKey(providerId: ProviderId, apiKey: string): Promise<void> {
    const settings = await loadSettings();
    const config = getAIConfig(settings);
    config.providers[providerId] = { apiKey: apiKey.trim(), addedAt: new Date().toISOString() };
    settings.aiConfig = config;
    // Clean up legacy field if migrating
    if (providerId === "anthropic") { delete settings.anthropicApiKey; delete settings.anthropicKeyAddedAt; }
    await saveSettings(settings);
}

/** Remove a provider's API key. */
export async function removeProviderKey(providerId: ProviderId): Promise<void> {
    const settings = await loadSettings();
    const config = getAIConfig(settings);
    delete config.providers[providerId];
    // If we removed the active provider, switch to any remaining one
    if (config.activeProvider === providerId) {
        const remaining = (Object.keys(config.providers) as ProviderId[]).find(
            (p) => config.providers[p]?.apiKey
        );
        config.activeProvider = remaining ?? "anthropic";
    }
    settings.aiConfig = config;
    await saveSettings(settings);
}

/** Set which provider is active for all automations. */
export async function setActiveProvider(providerId: ProviderId): Promise<void> {
    const settings = await loadSettings();
    const config = getAIConfig(settings);
    config.activeProvider = providerId;
    settings.aiConfig = config;
    await saveSettings(settings);
}

// For GitHub Models, try these candidates in order until one works.
// Different tokens have access to different model families.
const GITHUB_VALIDATION_CANDIDATES = [
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5",
    "gpt-5-chat",
    "gpt-4o-mini",
    "gpt-4o",
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "Phi-4-mini-instruct",
];

const VALIDATION_MODELS: Partial<Record<ProviderId, string>> = {
    openai:   "gpt-4o-mini",
    deepseek: "deepseek-chat",
    mistral:  "mistral-small-latest",
};

/** Test that a key actually works by making a tiny call. Returns { valid, error, workingModel, quotaExceeded }. */
export async function testProviderKey(
    providerId: ProviderId,
    apiKey: string
): Promise<{ valid: boolean; error?: string; workingModel?: string; quotaExceeded?: boolean }> {
    try {
        const provider = PROVIDERS[providerId];

        if (providerId === "anthropic") {
            const Anthropic = (await import("@anthropic-ai/sdk")).default;
            const client = new Anthropic({ apiKey });
            await client.messages.create({ model: provider.chatModel, max_tokens: 5, messages: [{ role: "user", content: "hi" }] });
            return { valid: true };
        }

        if (providerId === "google") {
            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(apiKey);
            await genAI.getGenerativeModel({ model: provider.chatModel }).generateContent("hi");
            return { valid: true };
        }

        // OpenAI-compatible providers
        const OpenAI = (await import("openai")).default;
        const client = new OpenAI({ apiKey, ...(provider.baseURL ? { baseURL: provider.baseURL } : {}) });

        if (providerId === "github") {
            // Try each candidate model — succeed as soon as one works
            const lastErrors: string[] = [];
            for (const modelId of GITHUB_VALIDATION_CANDIDATES) {
                try {
                    const tokParam = /^(gpt-5|o1|o3)/i.test(modelId) ? { max_completion_tokens: 5 } : { max_tokens: 5 };
                    await client.chat.completions.create({
                        model: modelId, ...tokParam,
                        messages: [{ role: "user", content: "hi" }],
                    });
                    return { valid: true, workingModel: modelId };
                } catch (e) {
                    lastErrors.push(`${modelId}: ${e instanceof Error ? e.message : "error"}`);
                }
            }
            return { valid: false, error: `No available model found. Tried: ${GITHUB_VALIDATION_CANDIDATES.slice(0, 4).join(", ")}…` };
        }

        // Standard OpenAI-compatible
        const testModel = VALIDATION_MODELS[providerId] ?? provider.chatModel;
        const tokParam = /^(gpt-5|o1|o3)/i.test(testModel) ? { max_completion_tokens: 5 } : { max_tokens: 5 };
        await client.chat.completions.create({ model: testModel, ...tokParam, messages: [{ role: "user", content: "hi" }] });
        return { valid: true };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        // 429 / quota errors mean the key itself is correct — just exhausted.
        // Treat as valid so the user can still save it.
        const isQuota = /429|quota|rate.?limit|exceeded|too many requests/i.test(msg);
        if (isQuota) return { valid: true, quotaExceeded: true };
        return { valid: false, error: msg };
    }
}
