"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PUTER_VOICES } from "@/components/automations/TTSSettings";

export type TTSProvider = "browser" | "elevenlabs" | "openai" | "puter" | "edge";

export interface TTSState {
    voiceEnabled: boolean;
    setVoiceEnabled: (v: boolean) => void;
    autoPlay: boolean;
    setAutoPlay: (v: boolean) => void;
    isPlaying: boolean;
    isSpeaking: (messageId: string) => boolean;
    speak: (text: string, messageId?: string) => Promise<void>;
    stop: () => void;
    provider: TTSProvider;
}

// window.puter is declared in usePuterAgent.ts (includes both txt2speech and chat)

/** Injects the Puter.js CDN script once and resolves when ready. */
let puterLoadPromise: Promise<void> | null = null;
function loadPuter(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.puter) return Promise.resolve();
    if (puterLoadPromise) return puterLoadPromise;
    puterLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="puter.com"]');
        if (existing) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://js.puter.com/v2/";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Puter.js"));
        document.head.appendChild(s);
    });
    return puterLoadPromise;
}

export function useTTS(): TTSState {
    const [voiceEnabled, setVoiceEnabledState] = useState(false);
    const [autoPlay, setAutoPlayState] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [provider, setProvider] = useState<TTSProvider>("edge");

    // Puter config cached from server
    const puterConfigRef = useRef<{ voice: string; engine: string; language: string }>({
        voice: "Joanna", engine: "neural", language: "en-US",
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

    const applyConfig = useCallback((cfg: {
        enabled?: boolean; autoPlay?: boolean;
        provider?: TTSProvider;
        puter?: { voice: string; engine: string; language: string };
    }) => {
        if (typeof cfg.enabled === "boolean") setVoiceEnabledState(cfg.enabled);
        if (typeof cfg.autoPlay === "boolean") setAutoPlayState(cfg.autoPlay);
        if (cfg.provider) setProvider(cfg.provider);
        if (cfg.puter) puterConfigRef.current = cfg.puter;
        if (cfg.provider === "puter") loadPuter().catch(() => {});
    }, []);

    // Load config on mount
    useEffect(() => {
        fetch("/api/automations/tts")
            .then((r) => r.json())
            .then((d) => { if (d.config) applyConfig(d.config); })
            .catch(() => {});
    }, [applyConfig]);

    // Live-sync when TTSSettings saves a change
    useEffect(() => {
        const handler = (e: Event) => {
            const cfg = (e as CustomEvent).detail;
            if (cfg) applyConfig(cfg);
        };
        window.addEventListener("tts-config-updated", handler);
        return () => window.removeEventListener("tts-config-updated", handler);
    }, [applyConfig]);

    const stop = useCallback(() => {
        // Stop server-side audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }
        // Stop browser speech synthesis
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        synthRef.current = null;
        setIsPlaying(false);
        setPlayingId(null);
    }, []);

    const speak = useCallback(async (text: string, messageId?: string) => {
        if (!voiceEnabled) return;
        stop(); // stop any current audio first

        const id = messageId ?? Math.random().toString(36).slice(2);
        setIsPlaying(true);
        setPlayingId(id);

        const clean = text.replace(/[*#`]/g, "").replace(/\n+/g, ". ").trim().slice(0, 800);

        if (provider === "puter") {
            try {
                await loadPuter();
                if (!window.puter) throw new Error("Puter.js not available");
                const cfg = puterConfigRef.current;

                // Ensure engine is compatible with chosen voice.
                // Some voices (Aditi/Zeina/etc) only support "standard".
                const meta = PUTER_VOICES.find((v) => v.voice === cfg.voice);
                const supportedEngines = meta?.engines ?? ["standard","neural","generative"];
                const safeEngine = supportedEngines.includes(cfg.engine as "standard"|"neural"|"generative")
                    ? cfg.engine
                    : "standard";
                // Use the voice's canonical language code (e.g. Arabic is "arb" not "ar")
                const safeLanguage = meta?.language ?? cfg.language;

                const audio = await window.puter.ai.txt2speech(clean, {
                    voice: cfg.voice,
                    engine: safeEngine,
                    language: safeLanguage,
                });
                audioRef.current = audio;
                audio.onended = () => { setIsPlaying(false); setPlayingId(null); audioRef.current = null; };
                audio.onerror = () => { setIsPlaying(false); setPlayingId(null); audioRef.current = null; };
                audio.play();
            } catch {
                setIsPlaying(false); setPlayingId(null);
            }
            return;
        }

        if (provider === "browser") {
            if (typeof window === "undefined" || !window.speechSynthesis) {
                setIsPlaying(false); setPlayingId(null);
                return;
            }
            const utter = new SpeechSynthesisUtterance(clean);
            utter.lang = "ur-PK";
            utter.rate = 0.95;
            utter.onend = () => { setIsPlaying(false); setPlayingId(null); };
            utter.onerror = () => { setIsPlaying(false); setPlayingId(null); };
            synthRef.current = utter;
            window.speechSynthesis.speak(utter);
            return;
        }

        // ElevenLabs or OpenAI — call server
        try {
            const res = await fetch("/api/automations/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) {
                // If server says use browser, fall back
                const data = await res.json().catch(() => ({}));
                if ((data as { error?: string }).error === "browser_tts") {
                    setIsPlaying(false); setPlayingId(null);
                    // Silently fall back to browser
                    const utter = new SpeechSynthesisUtterance(text.slice(0, 400));
                    utter.onend = () => { setIsPlaying(false); setPlayingId(null); };
                    window.speechSynthesis?.speak(utter);
                } else {
                    setIsPlaying(false); setPlayingId(null);
                }
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
                URL.revokeObjectURL(url);
                setIsPlaying(false);
                setPlayingId(null);
                audioRef.current = null;
            };
            audio.onerror = () => {
                URL.revokeObjectURL(url);
                setIsPlaying(false);
                setPlayingId(null);
                audioRef.current = null;
            };

            await audio.play();
        } catch {
            setIsPlaying(false);
            setPlayingId(null);
        }
    }, [voiceEnabled, provider, stop]);

    const setVoiceEnabled = useCallback((v: boolean) => {
        setVoiceEnabledState(v);
        if (!v) stop();
        // Persist
        fetch("/api/automations/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_config", enabled: v }),
        }).catch(() => {});
    }, [stop]);

    const setAutoPlay = useCallback((v: boolean) => {
        setAutoPlayState(v);
        fetch("/api/automations/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_config", autoPlay: v }),
        }).catch(() => {});
    }, []);

    const isSpeaking = useCallback((id: string) => playingId === id && isPlaying, [playingId, isPlaying]);

    return { voiceEnabled, setVoiceEnabled, autoPlay, setAutoPlay, isPlaying, isSpeaking, speak, stop, provider };
}
