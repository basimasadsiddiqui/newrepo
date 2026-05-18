import prisma from "@/lib/prisma";

const ORG_ID = "org-akhtar";

export type TTSProvider = "browser" | "elevenlabs" | "openai" | "puter" | "edge";

export interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    category: string;
    labels: Record<string, string>;
    preview_url?: string;
}

export interface PuterConfig {
    voice: string;
    engine: "standard" | "neural" | "generative";
    language: string;
}

export interface TTSConfig {
    enabled: boolean;
    provider: TTSProvider;
    autoPlay: boolean;
    elevenlabs?: {
        apiKey: string;
        voiceId: string;
        voiceName: string;
    };
    openaiVoice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    puter?: PuterConfig;
    edgeVoice?: string;   // e.g. "ur-PK-UzmaNeural"
}

interface OrgSettings {
    ttsConfig?: TTSConfig;
    [key: string]: unknown;
}

const DEFAULT_TTS: TTSConfig = {
    enabled: false,
    provider: "edge",
    autoPlay: true,
    edgeVoice: "ur-PK-UzmaNeural",
    openaiVoice: "nova",
    puter: { voice: "Joanna", engine: "neural", language: "en-US" },
};

async function loadOrgSettings(): Promise<OrgSettings> {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: ORG_ID },
            select: { settings: true },
        });
        return (org?.settings ?? {}) as OrgSettings;
    } catch {
        return {};
    }
}

async function saveOrgSettings(settings: OrgSettings): Promise<void> {
    await prisma.organization.upsert({
        where: { id: ORG_ID },
        update: { settings: settings as object },
        create: { id: ORG_ID, name: "Akhtar Jewellers", settings: settings as object },
    });
}

export async function getTTSConfig(): Promise<TTSConfig> {
    const settings = await loadOrgSettings();
    return settings.ttsConfig ?? DEFAULT_TTS;
}

export async function saveTTSConfig(config: Partial<TTSConfig>): Promise<TTSConfig> {
    const settings = await loadOrgSettings();
    const current = settings.ttsConfig ?? DEFAULT_TTS;
    const updated: TTSConfig = { ...current, ...config };
    settings.ttsConfig = updated;
    await saveOrgSettings(settings);
    return updated;
}

export async function setElevenLabsKey(apiKey: string, voiceId: string, voiceName: string): Promise<void> {
    const settings = await loadOrgSettings();
    const current = settings.ttsConfig ?? DEFAULT_TTS;
    settings.ttsConfig = {
        ...current,
        provider: "elevenlabs",
        elevenlabs: { apiKey: apiKey.trim(), voiceId, voiceName },
    };
    await saveOrgSettings(settings);
}

export async function removeElevenLabsKey(): Promise<void> {
    const settings = await loadOrgSettings();
    if (settings.ttsConfig?.elevenlabs) {
        delete settings.ttsConfig.elevenlabs;
        settings.ttsConfig.provider = "browser";
    }
    await saveOrgSettings(settings);
}

/** Fetch voice list from ElevenLabs using the stored or provided key. */
export async function listElevenLabsVoices(apiKey?: string): Promise<ElevenLabsVoice[]> {
    const settings = await loadOrgSettings();
    const key = apiKey ?? settings.ttsConfig?.elevenlabs?.apiKey;
    if (!key) throw new Error("No ElevenLabs API key");

    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key },
    });
    if (!res.ok) throw new Error(`ElevenLabs error: ${res.status} ${res.statusText}`);
    const data = await res.json() as { voices: ElevenLabsVoice[] };
    return data.voices;
}

/** Safe preview: strips markdown, truncates. */
export function prepareTextForSpeech(text: string, maxChars = 800): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, "$1")  // bold
        .replace(/\*(.*?)\*/g, "$1")       // italic
        .replace(/`[^`]*`/g, "")           // inline code
        .replace(/#{1,6}\s/g, "")          // headings
        .replace(/\n{2,}/g, ". ")          // double newlines to pause
        .replace(/\n/g, " ")
        .trim()
        .slice(0, maxChars);
}
