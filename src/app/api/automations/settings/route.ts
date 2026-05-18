import { NextRequest, NextResponse } from "next/server";
import { getAllProviderStatus, setProviderKey, removeProviderKey, setActiveProvider, setProviderModel, testProviderKey, activatePuterLLM, PROVIDERS, GITHUB_MODELS } from "@/lib/ai-key-manager";
import type { ProviderId } from "@/lib/ai-key-manager";

// GET — returns all provider statuses (no keys exposed)
export async function GET() {
    try {
        const status = await getAllProviderStatus();
        return NextResponse.json({ success: true, ...status, providers: PROVIDERS, githubModels: GITHUB_MODELS });
    } catch (err) {
        console.error("GET /settings error:", err);
        return NextResponse.json({ success: false, error: "Failed to load settings" }, { status: 500 });
    }
}

// POST — save & validate a provider key
export async function POST(req: NextRequest) {
    try {
        const { providerId, apiKey, skipValidation } = await req.json() as {
            providerId: ProviderId;
            apiKey: string;
            skipValidation?: boolean;
        };

        if (!providerId || !PROVIDERS[providerId]) {
            return NextResponse.json({ success: false, error: "Invalid provider ID" }, { status: 400 });
        }
        if (!apiKey?.trim()) {
            return NextResponse.json({ success: false, error: "API key is required" }, { status: 400 });
        }

        let autoModel: string | undefined;

        let savedWithQuotaWarning = false;

        if (!skipValidation) {
            const test = await testProviderKey(providerId, apiKey.trim());
            if (!test.valid) {
                return NextResponse.json(
                    { success: false, error: `Key rejected by ${PROVIDERS[providerId].name}: ${test.error ?? "invalid key"}` },
                    { status: 400 }
                );
            }
            if (test.quotaExceeded) savedWithQuotaWarning = true;
            if (test.workingModel) autoModel = test.workingModel;
        }

        await setProviderKey(providerId, apiKey.trim());
        if (autoModel) await setProviderModel(providerId, autoModel);
        const status = await getAllProviderStatus();
        return NextResponse.json({
            success: true,
            validated: !skipValidation,
            quotaWarning: savedWithQuotaWarning,
            ...status,
            providers: PROVIDERS,
            githubModels: GITHUB_MODELS,
        });
    } catch (err) {
        console.error("POST /settings error:", err);
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed to save key" }, { status: 500 });
    }
}

// DELETE — remove a provider key
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const providerId = searchParams.get("provider") as ProviderId | null;
        if (!providerId || !PROVIDERS[providerId]) {
            return NextResponse.json({ success: false, error: "provider query param required" }, { status: 400 });
        }
        await removeProviderKey(providerId);
        const status = await getAllProviderStatus();
        return NextResponse.json({ success: true, ...status, providers: PROVIDERS, githubModels: GITHUB_MODELS });
    } catch (err) {
        console.error("DELETE /settings error:", err);
        return NextResponse.json({ success: false, error: "Failed to remove key" }, { status: 500 });
    }
}

// PATCH — set active provider OR set selected model for a provider
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json() as { activeProvider?: ProviderId; providerId?: ProviderId; modelId?: string; puterModel?: string };

        // Special: activate Puter.js LLM (no API key required)
        if (body.activeProvider === "puter_llm") {
            await activatePuterLLM(body.puterModel ?? "gpt-5-nano");
            const status = await getAllProviderStatus();
            return NextResponse.json({ success: true, ...status, providers: PROVIDERS, githubModels: GITHUB_MODELS });
        }

        // Set active provider
        if (body.activeProvider) {
            if (!PROVIDERS[body.activeProvider]) {
                return NextResponse.json({ success: false, error: "Invalid provider" }, { status: 400 });
            }
            await setActiveProvider(body.activeProvider);
        }

        // Set model for a specific provider (e.g. GitHub Models)
        if (body.providerId && body.modelId) {
            if (!PROVIDERS[body.providerId]) {
                return NextResponse.json({ success: false, error: "Invalid provider" }, { status: 400 });
            }
            await setProviderModel(body.providerId, body.modelId);
        }

        const status = await getAllProviderStatus();
        return NextResponse.json({ success: true, ...status, providers: PROVIDERS, githubModels: GITHUB_MODELS });
    } catch (err) {
        console.error("PATCH /settings error:", err);
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed to update settings" }, { status: 500 });
    }
}
