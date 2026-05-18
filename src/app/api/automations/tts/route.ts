import { NextRequest, NextResponse } from "next/server";
import { getTTSConfig, saveTTSConfig, setElevenLabsKey, removeElevenLabsKey, listElevenLabsVoices, prepareTextForSpeech } from "@/lib/tts-manager";
import { getActiveProviderKey } from "@/lib/ai-key-manager";

// ── GET — return config, or list ElevenLabs voices ────────────────────────────

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "voices") {
        const testKey = searchParams.get("key") ?? undefined;
        try {
            const voices = await listElevenLabsVoices(testKey);
            return NextResponse.json({ success: true, voices });
        } catch (err) {
            return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
        }
    }

    const config = await getTTSConfig();
    // Never expose the raw API key to the client
    const safe = {
        ...config,
        elevenlabs: config.elevenlabs
            ? { voiceId: config.elevenlabs.voiceId, voiceName: config.elevenlabs.voiceName, keySet: true }
            : undefined,
    };
    return NextResponse.json({ success: true, config: safe });
}

// ── POST — synthesise speech, return audio binary ─────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const { text, action, ...body } = await req.json() as {
            text?: string;
            action?: string;
            apiKey?: string;
            voiceId?: string;
            voiceName?: string;
            provider?: string;
            openaiVoice?: string;
            edgeVoice?: string;
            enabled?: boolean;
            autoPlay?: boolean;
            puter?: { voice: string; engine: "standard" | "neural" | "generative"; language: string };
        };

        // ── Save config ──────────────────────────────────────────────────────
        if (action === "save_config") {
            const config = await saveTTSConfig({
                ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
                ...(body.provider ? { provider: body.provider as "browser" | "elevenlabs" | "openai" | "puter" | "edge" } : {}),
                ...(body.openaiVoice ? { openaiVoice: body.openaiVoice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" } : {}),
                ...(body.edgeVoice ? { edgeVoice: body.edgeVoice } : {}),
                ...(typeof body.autoPlay === "boolean" ? { autoPlay: body.autoPlay } : {}),
                ...(body.puter ? { puter: body.puter as { voice: string; engine: "standard" | "neural" | "generative"; language: string } } : {}),
            });
            return NextResponse.json({ success: true, config });
        }

        // ── Save ElevenLabs key + voice ──────────────────────────────────────
        if (action === "save_elevenlabs") {
            if (!body.apiKey || !body.voiceId || !body.voiceName) {
                return NextResponse.json({ success: false, error: "apiKey, voiceId and voiceName required" }, { status: 400 });
            }
            // Validate key by fetching voices
            try {
                await listElevenLabsVoices(body.apiKey);
            } catch (err) {
                return NextResponse.json({ success: false, error: `Invalid ElevenLabs key: ${err instanceof Error ? err.message : "error"}` }, { status: 400 });
            }
            await setElevenLabsKey(body.apiKey, body.voiceId, body.voiceName);
            return NextResponse.json({ success: true });
        }

        // ── Remove ElevenLabs key ────────────────────────────────────────────
        if (action === "remove_elevenlabs") {
            await removeElevenLabsKey();
            return NextResponse.json({ success: true });
        }

        // ── Synthesise speech ────────────────────────────────────────────────
        if (!text?.trim()) {
            return NextResponse.json({ success: false, error: "text is required" }, { status: 400 });
        }

        const config = await getTTSConfig();
        const clean = prepareTextForSpeech(text);

        if (config.provider === "elevenlabs" && config.elevenlabs?.apiKey) {
            const res = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenlabs.voiceId}`,
                {
                    method: "POST",
                    headers: {
                        "xi-api-key": config.elevenlabs.apiKey,
                        "Content-Type": "application/json",
                        "Accept": "audio/mpeg",
                    },
                    body: JSON.stringify({
                        text: clean,
                        model_id: "eleven_multilingual_v2",
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                    }),
                }
            );
            if (!res.ok) {
                const err = await res.text();
                return NextResponse.json({ success: false, error: `ElevenLabs: ${err}` }, { status: 500 });
            }
            const audio = await res.arrayBuffer();
            return new NextResponse(audio, {
                headers: { "Content-Type": "audio/mpeg", "Content-Length": String(audio.byteLength) },
            });
        }

        if (config.provider === "openai") {
            const active = await getActiveProviderKey();
            const openaiKey = active?.provider.id === "openai" || active?.provider.id === "github"
                ? active.apiKey
                : null;

            if (!openaiKey) {
                return NextResponse.json({ success: false, error: "OpenAI key not configured" }, { status: 400 });
            }

            const OpenAI = (await import("openai")).default;
            const client = new OpenAI({ apiKey: openaiKey });
            const mp3 = await client.audio.speech.create({
                model: "tts-1",
                voice: config.openaiVoice ?? "nova",
                input: clean,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            return new NextResponse(buffer, {
                headers: { "Content-Type": "audio/mpeg", "Content-Length": String(buffer.byteLength) },
            });
        }

        if (config.provider === "edge") {
            const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
            const voice = config.edgeVoice ?? "ur-PK-UzmaNeural";
            const tts = new MsEdgeTTS();
            await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
            const { audioStream } = tts.toStream(clean);
            const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = [];
                audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
                audioStream.on("end", () => resolve(Buffer.concat(chunks)));
                audioStream.on("error", reject);
            });
            return new NextResponse(audioBuffer.buffer as ArrayBuffer, {
                headers: { "Content-Type": "audio/mpeg", "Content-Length": String(audioBuffer.byteLength) },
            });
        }

        // Browser TTS — no server audio, client handles it
        return NextResponse.json({ success: false, error: "browser_tts", message: "Use browser speech synthesis" }, { status: 400 });
    } catch (err) {
        console.error("TTS error:", err);
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "TTS failed" }, { status: 500 });
    }
}
