"use client";

import { useState, useEffect } from "react";
import {
    Volume2, VolumeX, Loader2, CheckCircle2, XCircle, Trash2,
    ExternalLink, Mic, Play, Eye, EyeOff, RefreshCw,
} from "lucide-react";

type TTSProvider = "browser" | "elevenlabs" | "openai" | "puter" | "edge";

interface Voice { voice_id: string; name: string; category: string; preview_url?: string; }

interface TTSConfigSafe {
    enabled: boolean;
    provider: TTSProvider;
    autoPlay: boolean;
    openaiVoice?: string;
    edgeVoice?: string;
    elevenlabs?: { voiceId: string; voiceName: string; keySet: boolean };
    puter?: { voice: string; engine: string; language: string };
}

// Each voice specifies its correct language code AND which engines it supports.
// Amazon Polly neural/generative only covers certain voices — others MUST use standard.
export interface PuterVoiceMeta {
    voice: string;
    label: string;
    language: string;   // exact Polly language code
    group: string;
    engines: Array<"standard" | "neural" | "generative">;
}

export const PUTER_VOICES: PuterVoiceMeta[] = [
    // ── English (US) ── all 3 engines
    { voice: "Joanna",   label: "Joanna (Female)",        language: "en-US", group: "English (US)", engines: ["standard","neural","generative"] },
    { voice: "Matthew",  label: "Matthew (Male)",          language: "en-US", group: "English (US)", engines: ["standard","neural","generative"] },
    { voice: "Salli",    label: "Salli (Female)",          language: "en-US", group: "English (US)", engines: ["standard","neural","generative"] },
    { voice: "Joey",     label: "Joey (Male)",             language: "en-US", group: "English (US)", engines: ["standard","neural","generative"] },
    { voice: "Kendra",   label: "Kendra (Female)",         language: "en-US", group: "English (US)", engines: ["standard","neural","generative"] },
    { voice: "Kimberly", label: "Kimberly (Female)",       language: "en-US", group: "English (US)", engines: ["standard","neural","generative"] },
    { voice: "Kevin",    label: "Kevin (Child)",           language: "en-US", group: "English (US)", engines: ["standard","neural"] },
    // ── English (UK) ──
    { voice: "Amy",      label: "Amy (Female)",            language: "en-GB", group: "English (UK)", engines: ["standard","neural","generative"] },
    { voice: "Brian",    label: "Brian (Male)",            language: "en-GB", group: "English (UK)", engines: ["standard","neural","generative"] },
    { voice: "Emma",     label: "Emma (Female)",           language: "en-GB", group: "English (UK)", engines: ["standard","neural","generative"] },
    { voice: "Arthur",   label: "Arthur (Male)",           language: "en-GB", group: "English (UK)", engines: ["standard","neural"] },
    // ── English (AU) ──
    { voice: "Olivia",   label: "Olivia (Female)",         language: "en-AU", group: "English (AU)", engines: ["standard","neural","generative"] },
    { voice: "Russell",  label: "Russell (Male)",          language: "en-AU", group: "English (AU)", engines: ["standard"] },
    { voice: "Nicole",   label: "Nicole (Female)",         language: "en-AU", group: "English (AU)", engines: ["standard"] },
    // ── Arabic ── standard only; Polly language code is "arb" not "ar"
    { voice: "Zeina",    label: "Zeina (Female)",          language: "arb",   group: "Arabic",        engines: ["standard"] },
    // ── Hindi ──
    { voice: "Aditi",    label: "Aditi (Female)",          language: "hi-IN", group: "Hindi",         engines: ["standard"] },
    { voice: "Kajal",    label: "Kajal (Female)",          language: "hi-IN", group: "Hindi",         engines: ["standard","neural"] },
    // ── French ──
    { voice: "Celine",   label: "Céline (Female)",         language: "fr-FR", group: "French",        engines: ["standard"] },
    { voice: "Lea",      label: "Léa (Female)",            language: "fr-FR", group: "French",        engines: ["standard","neural"] },
    { voice: "Mathieu",  label: "Mathieu (Male)",          language: "fr-FR", group: "French",        engines: ["standard"] },
    // ── German ──
    { voice: "Vicki",    label: "Vicki (Female)",          language: "de-DE", group: "German",        engines: ["standard","neural"] },
    { voice: "Hans",     label: "Hans (Male)",             language: "de-DE", group: "German",        engines: ["standard"] },
    // ── Spanish ──
    { voice: "Lucia",    label: "Lucia (Female)",          language: "es-ES", group: "Spanish",       engines: ["standard","neural"] },
    { voice: "Enrique",  label: "Enrique (Male)",          language: "es-ES", group: "Spanish",       engines: ["standard"] },
    // ── Turkish ──
    { voice: "Filiz",    label: "Filiz (Female)",          language: "tr-TR", group: "Turkish",       engines: ["standard"] },
    // ── Italian ──
    { voice: "Carla",    label: "Carla (Female)",          language: "it-IT", group: "Italian",       engines: ["standard"] },
    { voice: "Bianca",   label: "Bianca (Female)",         language: "it-IT", group: "Italian",       engines: ["standard","neural"] },
];

// Microsoft Edge neural voices — free, no API key
export const EDGE_VOICES = [
    // ── Urdu ── (the reason we're here)
    { voice: "ur-PK-UzmaNeural",   label: "Uzma",    lang: "Urdu",         gender: "Female", flag: "🇵🇰" },
    { voice: "ur-PK-AsadNeural",   label: "Asad",    lang: "Urdu",         gender: "Male",   flag: "🇵🇰" },
    // ── Hindi ──
    { voice: "hi-IN-SwaraNeural",  label: "Swara",   lang: "Hindi",        gender: "Female", flag: "🇮🇳" },
    { voice: "hi-IN-MadhurNeural", label: "Madhur",  lang: "Hindi",        gender: "Male",   flag: "🇮🇳" },
    // ── Arabic ──
    { voice: "ar-SA-ZariyahNeural",label: "Zariyah", lang: "Arabic (SA)",  gender: "Female", flag: "🇸🇦" },
    { voice: "ar-SA-HamedNeural",  label: "Hamed",   lang: "Arabic (SA)",  gender: "Male",   flag: "🇸🇦" },
    { voice: "ar-EG-SalmaNeural",  label: "Salma",   lang: "Arabic (EG)",  gender: "Female", flag: "🇪🇬" },
    // ── English ──
    { voice: "en-US-JennyNeural",  label: "Jenny",   lang: "English (US)", gender: "Female", flag: "🇺🇸" },
    { voice: "en-US-GuyNeural",    label: "Guy",     lang: "English (US)", gender: "Male",   flag: "🇺🇸" },
    { voice: "en-US-AriaNeural",   label: "Aria",    lang: "English (US)", gender: "Female", flag: "🇺🇸" },
    { voice: "en-GB-SoniaNeural",  label: "Sonia",   lang: "English (UK)", gender: "Female", flag: "🇬🇧" },
    { voice: "en-GB-RyanNeural",   label: "Ryan",    lang: "English (UK)", gender: "Male",   flag: "🇬🇧" },
    // ── French ──
    { voice: "fr-FR-DeniseNeural", label: "Denise",  lang: "French",       gender: "Female", flag: "🇫🇷" },
    // ── German ──
    { voice: "de-DE-KatjaNeural",  label: "Katja",   lang: "German",       gender: "Female", flag: "🇩🇪" },
    // ── Spanish ──
    { voice: "es-ES-ElviraNeural", label: "Elvira",  lang: "Spanish",      gender: "Female", flag: "🇪🇸" },
    // ── Turkish ──
    { voice: "tr-TR-EmelNeural",   label: "Emel",    lang: "Turkish",      gender: "Female", flag: "🇹🇷" },
];

const OPENAI_VOICES = [
    { id: "alloy",   label: "Alloy",   desc: "Balanced, neutral" },
    { id: "echo",    label: "Echo",    desc: "Clear, male" },
    { id: "fable",   label: "Fable",   desc: "Warm, storytelling" },
    { id: "onyx",    label: "Onyx",    desc: "Deep, authoritative" },
    { id: "nova",    label: "Nova",    desc: "Friendly, female" },
    { id: "shimmer", label: "Shimmer", desc: "Soft, female" },
];

export default function TTSSettings() {
    const [config, setConfig] = useState<TTSConfigSafe | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ElevenLabs state
    const [elKey, setElKey] = useState("");
    const [showElKey, setShowElKey] = useState(false);
    const [elVoices, setElVoices] = useState<Voice[]>([]);
    const [loadingVoices, setLoadingVoices] = useState(false);
    const [savingEl, setSavingEl] = useState(false);
    const [selectedVoiceId, setSelectedVoiceId] = useState("");
    const [selectedVoiceName, setSelectedVoiceName] = useState("");
    const [playingPreview, setPlayingPreview] = useState<string | null>(null);

    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const showMsg = (type: "success" | "error", text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 6000);
    };

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/automations/tts");
            const d = await res.json();
            if (d.config) {
                setConfig(d.config);
                if (d.config.elevenlabs?.voiceId) setSelectedVoiceId(d.config.elevenlabs.voiceId);
                if (d.config.elevenlabs?.voiceName) setSelectedVoiceName(d.config.elevenlabs.voiceName);
            }
        } catch { /* ignore */ }
        setIsLoading(false);
    };

    useEffect(() => { loadConfig(); }, []);

    const patchConfig = async (patch: Partial<TTSConfigSafe>) => {
        try {
            const res = await fetch("/api/automations/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "save_config", ...patch }),
            });
            const d = await res.json();
            if (d.config) {
                setConfig(d.config);
                // Notify useTTS hooks in other components so they apply the new config immediately
                window.dispatchEvent(new CustomEvent("tts-config-updated", { detail: d.config }));
            }
        } catch { /* ignore */ }
    };

    const fetchElVoices = async (key?: string) => {
        const k = key ?? elKey;
        if (!k.trim()) return;
        setLoadingVoices(true);
        try {
            const params = key ? `?action=voices&key=${encodeURIComponent(key)}` : "?action=voices";
            const res = await fetch(`/api/automations/tts${params}`);
            const d = await res.json();
            if (d.success) setElVoices(d.voices);
            else showMsg("error", d.error ?? "Failed to load voices");
        } catch { showMsg("error", "Connection error"); }
        setLoadingVoices(false);
    };

    const saveElevenLabs = async () => {
        if (!elKey.trim() || !selectedVoiceId) {
            showMsg("error", "Enter API key and select a voice");
            return;
        }
        setSavingEl(true);
        try {
            const res = await fetch("/api/automations/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save_elevenlabs",
                    apiKey: elKey.trim(),
                    voiceId: selectedVoiceId,
                    voiceName: selectedVoiceName,
                }),
            });
            const d = await res.json();
            if (d.success) {
                showMsg("success", `ElevenLabs voice "${selectedVoiceName}" saved.`);
                setElKey("");
                await loadConfig();
            } else {
                showMsg("error", d.error ?? "Failed to save");
            }
        } catch { showMsg("error", "Connection error"); }
        setSavingEl(false);
    };

    const removeElevenLabs = async () => {
        if (!confirm("Remove ElevenLabs key?")) return;
        await fetch("/api/automations/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "remove_elevenlabs" }),
        });
        await loadConfig();
    };

    const playPreview = async (previewUrl: string, voiceId: string) => {
        setPlayingPreview(voiceId);
        const audio = new Audio(previewUrl);
        audio.onended = () => setPlayingPreview(null);
        audio.onerror = () => setPlayingPreview(null);
        audio.play().catch(() => setPlayingPreview(null));
    };

    if (isLoading) return (
        <div className="flex items-center justify-center py-16 gap-3" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            <span className="text-sm">Loading voice settings...</span>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Master enable toggle */}
            <div className="rounded-xl p-5"
                style={{ background: "linear-gradient(135deg, rgba(92,10,10,0.03), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: config?.enabled ? "var(--success-bg)" : "var(--cream-dark)", border: `1px solid ${config?.enabled ? "rgba(30,124,74,0.2)" : "var(--border)"}` }}>
                            {config?.enabled
                                ? <Volume2 size={18} style={{ color: "var(--success)" }} />
                                : <VolumeX size={18} style={{ color: "var(--text-muted)" }} />
                            }
                        </div>
                        <div>
                            <h3 className="font-bold text-base" style={{ color: "var(--maroon)" }}>
                                Voice Output
                            </h3>
                            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                AI responses are read aloud after every message. Supports Urdu via ElevenLabs.
                            </p>
                        </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                        onClick={() => patchConfig({ enabled: !config?.enabled })}
                        className="shrink-0 rounded-full transition-all"
                        style={{
                            width: 48, height: 26, padding: 3,
                            background: config?.enabled ? "var(--success)" : "var(--cream-dark)",
                            border: `1px solid ${config?.enabled ? "var(--success)" : "var(--border)"}`,
                            cursor: "pointer", position: "relative",
                        }}>
                        <span style={{
                            width: 18, height: 18, borderRadius: "50%", background: "white",
                            position: "absolute", top: 3,
                            left: config?.enabled ? "calc(100% - 21px)" : 3,
                            transition: "left 0.2s",
                            boxShadow: "var(--shadow-xs)",
                        }} />
                    </button>
                </div>

                {/* Auto-play toggle */}
                {config?.enabled && (
                    <div className="flex items-center justify-between mt-4 pt-4"
                        style={{ borderTop: "1px solid rgba(201,168,76,0.15)" }}>
                        <div>
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                Auto-play responses
                            </span>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                Speak automatically when AI replies. Disable to only play on demand.
                            </p>
                        </div>
                        <button
                            onClick={() => patchConfig({ autoPlay: !config?.autoPlay })}
                            className="shrink-0 rounded-full transition-all"
                            style={{
                                width: 40, height: 22, padding: 2,
                                background: config?.autoPlay ? "var(--gold)" : "var(--cream-dark)",
                                border: "1px solid var(--border)",
                                cursor: "pointer", position: "relative",
                            }}>
                            <span style={{
                                width: 16, height: 16, borderRadius: "50%", background: "white",
                                position: "absolute", top: 2,
                                left: config?.autoPlay ? "calc(100% - 18px)" : 2,
                                transition: "left 0.2s",
                                boxShadow: "var(--shadow-xs)",
                            }} />
                        </button>
                    </div>
                )}
            </div>

            {config?.enabled && (
                <>
                    {/* Provider selection */}
                    <div className="card">
                        <div className="card-header">
                            <h3>Voice Provider</h3>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {([
                                    { id: "edge",       label: "Edge TTS",         icon: "🇵🇰", desc: "Free Microsoft neural — native Urdu, Arabic, Hindi" },
                                    { id: "puter",      label: "Puter.js",         icon: "⚡", desc: "Free unlimited, Amazon Polly voices" },
                                    { id: "browser",    label: "Browser",          icon: "🌐", desc: "Built-in voices, fully offline" },
                                    { id: "elevenlabs", label: "ElevenLabs",       icon: "🎙️", desc: "Custom cloned voices, best quality" },
                                    { id: "openai",     label: "OpenAI TTS",       icon: "💬", desc: "High quality, uses your OpenAI key" },
                                ] as { id: TTSProvider; label: string; icon: string; desc: string }[]).map((p) => {
                                    const isSelected = config?.provider === p.id;
                                    return (
                                        <button key={p.id} onClick={() => patchConfig({ provider: p.id })}
                                            className="text-left p-4 rounded-xl transition-all"
                                            style={{
                                                border: `1px solid ${isSelected ? "rgba(201,168,76,0.5)" : "var(--border)"}`,
                                                background: isSelected ? "rgba(201,168,76,0.08)" : "var(--cream-light)",
                                                cursor: "pointer",
                                            }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl">{p.icon}</span>
                                                {isSelected && <CheckCircle2 size={14} style={{ color: "var(--gold-dark)", marginLeft: "auto" }} />}
                                            </div>
                                            <div className="font-bold text-sm" style={{ color: isSelected ? "var(--maroon)" : "var(--text-primary)" }}>
                                                {p.label}
                                            </div>
                                            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{p.desc}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Edge TTS configuration */}
                    {config.provider === "edge" && (
                        <div className="card">
                            <div className="card-header">
                                <div className="flex items-center gap-2">
                                    <span>🇵🇰</span>
                                    <h3>Microsoft Edge TTS — Voice Selection</h3>
                                </div>
                                <span className="badge badge-finalized">Free · No API key · Real neural voices</span>
                            </div>
                            <div className="card-body space-y-4">
                                <div className="p-3 rounded-lg text-sm"
                                    style={{ background: "var(--success-bg)", border: "1px solid rgba(30,124,74,0.2)", color: "var(--success)" }}>
                                    ✅ Uses the same neural TTS built into Microsoft Edge browser — runs on Microsoft's servers, completely free.
                                    <strong> Uzma and Asad are native Urdu speakers</strong>, not transliteration.
                                </div>

                                {/* Grouped voice grid */}
                                {(() => {
                                    const currentVoice = config.edgeVoice ?? "ur-PK-UzmaNeural";
                                    const langs = [...new Set(EDGE_VOICES.map((v) => v.lang))];
                                    return (
                                        <div className="space-y-4">
                                            {langs.map((lang) => (
                                                <div key={lang}>
                                                    <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                                                        {lang}
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        {EDGE_VOICES.filter((v) => v.lang === lang).map((v) => {
                                                            const isSel = currentVoice === v.voice;
                                                            return (
                                                                <button key={v.voice}
                                                                    onClick={() => patchConfig({ edgeVoice: v.voice })}
                                                                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                                                                    style={{
                                                                        border: `1px solid ${isSel ? "rgba(201,168,76,0.5)" : "var(--border)"}`,
                                                                        background: isSel ? "rgba(201,168,76,0.1)" : "var(--cream-light)",
                                                                        cursor: "pointer",
                                                                        transform: isSel ? "translateY(-1px)" : "none",
                                                                        boxShadow: isSel ? "var(--shadow-md)" : "none",
                                                                    }}
                                                                    onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--cream-dark)"; }}
                                                                    onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "var(--cream-light)"; }}
                                                                >
                                                                    <span className="text-xl shrink-0">{v.flag}</span>
                                                                    <div className="min-w-0">
                                                                        <div className="font-bold text-sm" style={{ color: isSel ? "var(--maroon)" : "var(--text-primary)" }}>
                                                                            {v.label}
                                                                        </div>
                                                                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                                                            {v.gender}
                                                                        </div>
                                                                    </div>
                                                                    {isSel && <CheckCircle2 size={14} style={{ color: "var(--gold-dark)", marginLeft: "auto", flexShrink: 0 }} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Puter.js configuration */}
                    {config.provider === "puter" && (() => {
                        const currentVoice = config.puter?.voice ?? "Joanna";
                        const currentEngine = (config.puter?.engine ?? "neural") as "standard" | "neural" | "generative";
                        const meta = PUTER_VOICES.find((v) => v.voice === currentVoice);
                        const supportedEngines = meta?.engines ?? ["standard","neural","generative"];
                        const engineOk = supportedEngines.includes(currentEngine);

                        const selectVoice = (v: PuterVoiceMeta) => {
                            const safeEngine = v.engines.includes(currentEngine) ? currentEngine
                                : v.engines.includes("neural") ? "neural" : "standard";
                            patchConfig({ puter: { voice: v.voice, engine: safeEngine, language: v.language } });
                        };

                        const selectEngine = (e: "standard" | "neural" | "generative") => {
                            if (!supportedEngines.includes(e)) return;
                            patchConfig({ puter: { ...(config.puter ?? { voice: "Joanna", language: "en-US" }), engine: e } });
                        };

                        const groups = [...new Set(PUTER_VOICES.map((v) => v.group))];

                        return (
                            <div className="card">
                                <div className="card-header">
                                    <div className="flex items-center gap-2">
                                        <span>⚡</span>
                                        <h3>Puter.js — Amazon Polly Voices</h3>
                                    </div>
                                    <span className="badge badge-finalized">Free · No API key</span>
                                </div>
                                <div className="card-body space-y-5">

                                    {/* Engine selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                                            Engine
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {([
                                                { id: "standard",   label: "Standard",   desc: "Fastest, works with all voices" },
                                                { id: "neural",     label: "Neural",     desc: "More natural, fewer voices" },
                                                { id: "generative", label: "Generative", desc: "Most human, slowest, limited voices" },
                                            ] as { id: "standard"|"neural"|"generative"; label: string; desc: string }[]).map((e) => {
                                                const isSel = currentEngine === e.id;
                                                const disabled = !supportedEngines.includes(e.id);
                                                return (
                                                    <button key={e.id} onClick={() => selectEngine(e.id)}
                                                        disabled={disabled}
                                                        className="text-left p-3 rounded-lg transition-all"
                                                        style={{
                                                            border: `1px solid ${isSel ? "rgba(201,168,76,0.4)" : "var(--border)"}`,
                                                            background: isSel ? "rgba(201,168,76,0.08)" : disabled ? "rgba(0,0,0,0.02)" : "var(--cream-light)",
                                                            cursor: disabled ? "not-allowed" : "pointer",
                                                            opacity: disabled ? 0.4 : 1,
                                                        }}>
                                                        <div className="font-bold text-xs" style={{ color: isSel ? "var(--maroon)" : "var(--text-primary)" }}>{e.label}</div>
                                                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                                            {disabled ? "Not supported by this voice" : e.desc}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {!engineOk && (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                                                style={{ background: "var(--warning-bg)", border: "1px solid rgba(217,119,6,0.2)", color: "var(--warning)" }}>
                                                ⚠️ <strong>{currentVoice}</strong> doesn't support <strong>{currentEngine}</strong>. Switched to <strong>standard</strong> automatically.
                                            </div>
                                        )}
                                    </div>

                                    {/* Voice list grouped by language */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                                            Voice — currently: <span style={{ color: "var(--maroon)" }}>{meta?.label ?? currentVoice}</span>
                                        </label>
                                        <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                                            {groups.map((group) => (
                                                <div key={group}>
                                                    <div className="text-xs font-semibold mb-1.5 px-1" style={{ color: "var(--text-muted)" }}>
                                                        {group}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {PUTER_VOICES.filter((v) => v.group === group).map((v) => {
                                                            const isSel = currentVoice === v.voice;
                                                            const supportsNeural = v.engines.includes("neural") || v.engines.includes("generative");
                                                            return (
                                                                <button key={v.voice} onClick={() => selectVoice(v)}
                                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all"
                                                                    style={{
                                                                        background: isSel ? "rgba(201,168,76,0.1)" : "var(--cream-light)",
                                                                        border: `1px solid ${isSel ? "rgba(201,168,76,0.35)" : "var(--border)"}`,
                                                                        cursor: "pointer",
                                                                    }}>
                                                                    {isSel && <CheckCircle2 size={13} style={{ color: "var(--gold-dark)", flexShrink: 0 }} />}
                                                                    <span className="flex-1 text-sm font-medium" style={{ color: isSel ? "var(--maroon)" : "var(--text-primary)" }}>
                                                                        {v.label}
                                                                    </span>
                                                                    <span className={`badge ${supportsNeural ? "badge-finalized" : "badge-draft"}`} style={{ fontSize: "0.55rem" }}>
                                                                        {supportsNeural ? "neural ✓" : "standard only"}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                        💡 For <strong>Urdu</strong>: Amazon Polly has no Urdu voice — use <strong>ElevenLabs</strong> for native Urdu.
                                        <strong> Standard engine</strong> is fastest. Neural/Generative are slower but more natural.
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ElevenLabs configuration */}
                    {config.provider === "elevenlabs" && (
                        <div className="card">
                            <div className="card-header">
                                <div className="flex items-center gap-2">
                                    <span>🎙️</span>
                                    <h3>ElevenLabs Setup</h3>
                                </div>
                                <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs" style={{ color: "var(--gold-dark)" }}>
                                    <ExternalLink size={11} /> Get API key
                                </a>
                            </div>
                            <div className="card-body space-y-4">
                                {/* Current voice */}
                                {config.elevenlabs?.keySet && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg"
                                        style={{ background: "var(--success-bg)", border: "1px solid rgba(30,124,74,0.2)" }}>
                                        <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                                        <div className="flex-1">
                                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                                Voice: <strong>{config.elevenlabs.voiceName}</strong>
                                            </span>
                                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                                ID: {config.elevenlabs.voiceId}
                                            </p>
                                        </div>
                                        <button onClick={removeElevenLabs} className="btn btn-danger"
                                            style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}>
                                            <Trash2 size={11} /> Remove
                                        </button>
                                    </div>
                                )}

                                {/* API Key input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                                        {config.elevenlabs?.keySet ? "Replace key & select new voice:" : "API Key:"}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 flex items-center form-input p-0 overflow-hidden">
                                            <input
                                                type={showElKey ? "text" : "password"}
                                                value={elKey}
                                                onChange={(e) => setElKey(e.target.value)}
                                                placeholder="Paste ElevenLabs API key..."
                                                style={{
                                                    flex: 1, border: "none", outline: "none", background: "transparent",
                                                    padding: "8px 12px", fontFamily: "var(--font-mono)",
                                                    fontSize: "0.8125rem", color: "var(--text-primary)",
                                                }}
                                            />
                                            <button onClick={() => setShowElKey((v) => !v)} tabIndex={-1}
                                                className="btn btn-ghost btn-icon"
                                                style={{ width: 32, height: 32, minWidth: 32, borderRadius: 0, border: "none", borderLeft: "1px solid var(--border)" }}>
                                                {showElKey ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                        </div>
                                        <button onClick={() => fetchElVoices()} disabled={!elKey.trim() || loadingVoices}
                                            className="btn btn-ghost" style={{ minWidth: 100 }}>
                                            {loadingVoices
                                                ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Loading...</>
                                                : <><RefreshCw size={13} /> Load Voices</>
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Voice list */}
                                {elVoices.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                                            Select a voice ({elVoices.length} available):
                                        </label>
                                        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                                            {elVoices.map((v) => {
                                                const isSel = selectedVoiceId === v.voice_id;
                                                return (
                                                    <div key={v.voice_id}
                                                        onClick={() => { setSelectedVoiceId(v.voice_id); setSelectedVoiceName(v.name); }}
                                                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all"
                                                        style={{
                                                            background: isSel ? "rgba(201,168,76,0.1)" : "var(--cream-light)",
                                                            border: `1px solid ${isSel ? "rgba(201,168,76,0.4)" : "var(--border)"}`,
                                                        }}>
                                                        {isSel && <CheckCircle2 size={13} style={{ color: "var(--gold-dark)", flexShrink: 0 }} />}
                                                        <div className="flex-1 min-w-0">
                                                            <span className="font-semibold text-sm" style={{ color: isSel ? "var(--maroon)" : "var(--text-primary)" }}>
                                                                {v.name}
                                                            </span>
                                                            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                                                                {v.category}
                                                            </span>
                                                        </div>
                                                        {v.preview_url && (
                                                            <button onClick={(e) => { e.stopPropagation(); playPreview(v.preview_url!, v.voice_id); }}
                                                                className="btn btn-ghost btn-icon shrink-0"
                                                                style={{ width: 26, height: 26, minWidth: 26, padding: 0 }}>
                                                                {playingPreview === v.voice_id
                                                                    ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                                                                    : <Play size={12} />
                                                                }
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button onClick={saveElevenLabs} disabled={!selectedVoiceId || savingEl}
                                            className="btn btn-secondary w-full">
                                            {savingEl
                                                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
                                                : <><Mic size={14} /> Use "{selectedVoiceName || "selected voice"}"</>
                                            }
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* OpenAI voice selection */}
                    {config.provider === "openai" && (
                        <div className="card">
                            <div className="card-header">
                                <div className="flex items-center gap-2">
                                    <span>💬</span>
                                    <h3>OpenAI Voice</h3>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {OPENAI_VOICES.map((v) => {
                                        const isSel = (config?.openaiVoice ?? "nova") === v.id;
                                        return (
                                            <button key={v.id}
                                                onClick={() => patchConfig({ openaiVoice: v.id as TTSConfigSafe["openaiVoice"] })}
                                                className="text-left p-3 rounded-lg transition-all"
                                                style={{
                                                    border: `1px solid ${isSel ? "rgba(201,168,76,0.4)" : "var(--border)"}`,
                                                    background: isSel ? "rgba(201,168,76,0.08)" : "var(--cream-light)",
                                                    cursor: "pointer",
                                                }}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm" style={{ color: isSel ? "var(--maroon)" : "var(--text-primary)" }}>
                                                        {v.label}
                                                    </span>
                                                    {isSel && <CheckCircle2 size={12} style={{ color: "var(--gold-dark)" }} />}
                                                </div>
                                                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{v.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {config.provider === "browser" && (
                        <div className="p-4 rounded-xl text-sm"
                            style={{ background: "var(--info-bg)", border: "1px solid rgba(29,95,173,0.15)", color: "var(--info)" }}>
                            🌐 Browser TTS uses your device's built-in voices — free and offline, but quality varies by OS.
                            For natural Urdu, switch to <strong>Edge TTS</strong> (free, no key needed).
                        </div>
                    )}
                </>
            )}

            {msg && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                    style={{
                        background: msg.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
                        border: `1px solid ${msg.type === "success" ? "rgba(30,124,74,0.2)" : "rgba(196,43,43,0.2)"}`,
                        color: msg.type === "success" ? "var(--success)" : "var(--danger)",
                    }}>
                    {msg.type === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {msg.text}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
