import prisma from "@/lib/prisma";

const ORG_ID = "org-akhtar";

interface OrgSettings {
    anthropicApiKey?: string;
    anthropicKeyAddedAt?: string;
    [key: string]: unknown;
}

/**
 * Get the Anthropic API key — checks DB first, then .env fallback.
 * Returns null if no key is configured anywhere.
 */
export async function getAnthropicKey(): Promise<string | null> {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: ORG_ID },
            select: { settings: true },
        });
        const settings = (org?.settings ?? {}) as OrgSettings;
        if (settings.anthropicApiKey?.trim()) return settings.anthropicApiKey.trim();
    } catch {
        // DB not reachable — fall through to env
    }

    const envKey = process.env.ANTHROPIC_API_KEY?.trim();
    return envKey || null;
}

/**
 * Save the API key to organization settings (overwrites any existing key).
 */
export async function setAnthropicKey(apiKey: string): Promise<void> {
    const org = await prisma.organization.findUnique({
        where: { id: ORG_ID },
        select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as OrgSettings;
    settings.anthropicApiKey = apiKey.trim();
    settings.anthropicKeyAddedAt = new Date().toISOString();

    await prisma.organization.update({
        where: { id: ORG_ID },
        data: { settings: settings as object },
    });
}

/**
 * Remove the API key from organization settings.
 */
export async function removeAnthropicKey(): Promise<void> {
    const org = await prisma.organization.findUnique({
        where: { id: ORG_ID },
        select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as OrgSettings;
    delete settings.anthropicApiKey;
    delete settings.anthropicKeyAddedAt;

    await prisma.organization.update({
        where: { id: ORG_ID },
        data: { settings: settings as object },
    });
}

/**
 * Get metadata about the current key without returning the key itself.
 */
export async function getKeyInfo(): Promise<{
    source: "db" | "env" | "none";
    preview: string | null;
    addedAt: string | null;
}> {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: ORG_ID },
            select: { settings: true },
        });
        const settings = (org?.settings ?? {}) as OrgSettings;
        if (settings.anthropicApiKey?.trim()) {
            const k = settings.anthropicApiKey.trim();
            return {
                source: "db",
                preview: `${k.slice(0, 7)}...${k.slice(-4)}`,
                addedAt: settings.anthropicKeyAddedAt ?? null,
            };
        }
    } catch {
        // ignore
    }

    const envKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (envKey) {
        return {
            source: "env",
            preview: `${envKey.slice(0, 7)}...${envKey.slice(-4)}`,
            addedAt: null,
        };
    }

    return { source: "none", preview: null, addedAt: null };
}

/**
 * Verify that a key actually works by making a tiny test call to Claude.
 */
export async function testAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey });
        await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 5,
            messages: [{ role: "user", content: "hi" }],
        });
        return { valid: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { valid: false, error: message };
    }
}
