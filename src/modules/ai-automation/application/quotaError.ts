/**
 * Centralised quota / rate-limit detection for all AI providers.
 */

export class QuotaError extends Error {
    constructor(
        public readonly providerName: string,
        public readonly originalMessage: string,
        public readonly kind: "quota" | "rate_limit" | "overloaded"
    ) {
        super("QUOTA_EXCEEDED");
        this.name = "QuotaError";
    }
}

const QUOTA_PATTERNS = [
    "insufficient_quota",
    "exceeded your current quota",
    "credit balance is too low",
    "out of credits",
    "billing_hard_limit_reached",
    "payment required",
    "you need to add credits",
    "resource_exhausted",
    "quota exceeded",
    "quota has been exceeded",
];

const RATE_LIMIT_PATTERNS = [
    "rate limit reached",
    "rate limit exceeded",
    "rate_limit_error",
    "too many requests",
    "ratelimiterror",
    "requests per minute",
    "requests per day",
    "tokens per minute",
    "retry after",
];

const OVERLOADED_PATTERNS = [
    "overloaded_error",
    "overloaded",
    "service unavailable",
    "capacity",
    "model is currently overloaded",
];

function matchPatterns(msg: string, patterns: string[]): boolean {
    return patterns.some((p) => msg.includes(p));
}

export function detectQuotaError(
    error: unknown,
    providerName = "AI provider"
): QuotaError | null {
    const raw = error instanceof Error ? error.message : String(error ?? "");
    const msg = raw.toLowerCase();

    if (raw.includes("402")) {
        return new QuotaError(providerName, raw, "quota");
    }
    if (matchPatterns(msg, QUOTA_PATTERNS)) {
        return new QuotaError(providerName, raw, "quota");
    }
    if (matchPatterns(msg, RATE_LIMIT_PATTERNS)) {
        return new QuotaError(providerName, raw, "rate_limit");
    }
    if (matchPatterns(msg, OVERLOADED_PATTERNS)) {
        return new QuotaError(providerName, raw, "overloaded");
    }
    if (msg.includes("429")) {
        return new QuotaError(providerName, raw, "rate_limit");
    }

    return null;
}

export function quotaErrorResponse(qErr: QuotaError) {
    const kindMessages: Record<QuotaError["kind"], string> = {
        quota: "Your API credits have run out or billing limit was reached.",
        rate_limit: "Rate limit hit — too many requests in a short time.",
        overloaded: "The AI server is overloaded. Try again in a few seconds.",
    };

    const creditLinks: Record<string, string> = {
        "Anthropic Claude":        "https://console.anthropic.com/settings/billing",
        "OpenAI (ChatGPT)":        "https://platform.openai.com/account/billing",
        "DeepSeek":                "https://platform.deepseek.com/top_up",
        "Google Gemini":           "https://aistudio.google.com/app/apikey",
        "Mistral AI":              "https://console.mistral.ai/billing",
        "GitHub Models":           "https://github.com/settings/tokens",
        "GitHub Models (Llama 4)": "https://github.com/settings/tokens",
    };

    return {
        success: false,
        quotaExceeded: true,
        quotaKind: qErr.kind,
        providerName: qErr.providerName,
        message: kindMessages[qErr.kind],
        creditLink: creditLinks[qErr.providerName] ?? null,
    };
}
