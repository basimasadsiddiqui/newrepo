import { NextResponse } from "next/server";
import { getActiveProviderKey, getAllProviderStatus, PROVIDERS } from "@/lib/ai-key-manager";

// Short-lived cache so the page + Settings panel (each polling every 30s, plus
// any manual rechecks) don't each fire outbound HEAD requests at AI vendors.
// Without this, an open Settings tab probes Anthropic/OpenAI ~4×/min.
let internetCache: { value: boolean; at: number } | null = null;
const INTERNET_TTL_MS = 20_000;

async function probeInternet(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await fetch("https://api.anthropic.com/v1/messages", { method: "HEAD", signal: controller.signal });
        clearTimeout(timeout);
        return true;
    } catch {
        // Try a different endpoint as fallback
        try {
            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), 3000);
            await fetch("https://api.openai.com/", { method: "HEAD", signal: controller2.signal });
            clearTimeout(timeout2);
            return true;
        } catch {
            return false;
        }
    }
}

async function checkInternet(): Promise<boolean> {
    const now = Date.now();
    if (internetCache && now - internetCache.at < INTERNET_TTL_MS) {
        return internetCache.value;
    }
    const value = await probeInternet();
    internetCache = { value, at: now };
    return value;
}

export async function GET() {
    try {
        const [internet, active, allStatus] = await Promise.all([
            checkInternet(),
            getActiveProviderKey(),
            getAllProviderStatus(),
        ]);

        const isPuterLLM = allStatus.activeProvider === "puter_llm";
        const apiKeyConfigured = isPuterLLM || !!active;
        const mode: string = isPuterLLM ? "puter_llm" : (internet && !!active ? "online" : "offline");

        // Include puter model directly in health so client needs only one request
        const puterModel = isPuterLLM
            ? (allStatus.configured["puter_llm"]?.selectedModel ?? "gpt-5-nano")
            : null;

        return NextResponse.json({
            success: true,
            internet,
            apiKeyConfigured,
            mode,
            activeProvider: allStatus.activeProvider,
            activeProviderName: isPuterLLM ? "Puter.js Free AI" : (active ? PROVIDERS[allStatus.activeProvider]?.name : null),
            puterModel,
            configuredProviders: Object.keys(allStatus.configured),
            checkedAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error("Health check error:", err);
        return NextResponse.json(
            { success: false, internet: false, apiKeyConfigured: false, mode: "offline" },
            { status: 500 }
        );
    }
}
