"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, Bot, User, Loader2, Sparkles, RotateCcw, Volume2, VolumeX, Square } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import QuotaBanner from "@/components/automations/QuotaBanner";
import { puterChat } from "@/hooks/usePuterAgent";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface Props {
    isOnline: boolean;
    puterModel?: string | null;
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

const SUGGESTIONS = [
    "What is the current gold rate?",
    "Show today's total sales",
    "How many items are available?",
    "Show overdue payments",
    "Pending customer orders",
];

export default function VoiceAssistant({ isOnline, puterModel }: Props) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: isOnline
                ? "Hello! I'm your AI assistant powered by Claude. Ask me anything about your business — parties, inventory, payments, sales, or gold rates."
                : "Hello! I'm running in offline mode. I can answer queries about party balances, inventory, overdue payments, metal rates, and today's sales.",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [micAvailable, setMicAvailable] = useState(false);
    const [responseMode, setResponseMode] = useState<"online" | "offline">(isOnline ? "online" : "offline");
    const [quotaError, setQuotaError] = useState<{ providerName: string; quotaKind: "quota" | "rate_limit" | "overloaded"; message: string; creditLink: string | null } | null>(null);
    const tts = useTTS();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const accumulatedRef = useRef("");
    const [micLang, setMicLang] = useState<"en-US" | "ur-PK">("en-US");
    const [interimText, setInterimText] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const stopListening = () => {
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        isListeningRef.current = false;
        setIsListening(false);
        setInterimText("");
    };

    const buildRecognition = (lang: string) => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = new SR() as any;
        r.lang = lang;
        r.continuous = true;
        r.interimResults = true;
        r.maxAlternatives = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.onresult = (e: any) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) accumulatedRef.current += e.results[i][0].transcript + " ";
                else interim = e.results[i][0].transcript;
            }
            setInput(accumulatedRef.current.trim());
            setInterimText(interim);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.onerror = (e: any) => {
            if (e.error !== "no-speech" && e.error !== "aborted") { isListeningRef.current = false; setIsListening(false); setInterimText(""); }
        };
        r.onend = () => {
            if (isListeningRef.current) { try { r.start(); } catch { /* ignore */ } }
            else { setInterimText(""); }
        };
        return r;
    };

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) setMicAvailable(true);
        return () => { stopListening(); };
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        setMessages((prev) => [...prev, { role: "user", content: trimmed, timestamp: new Date() }]);
        setInput("");
        setIsLoading(true);

        try {
            let reply = "";

            if (puterModel) {
                // ── Puter.js path — client-side, no server needed ──────────
                setResponseMode("online");
                const systemPrompt = `You are a helpful ERP assistant for Akhtar Jewellers, a Pakistani jewellery shop.
You speak BOTH English and Urdu fluently. Respond in the SAME language the user wrote in.
Be concise. Use PKR for currency, grams for weight.
For data questions, answer based on context if available, or tell the user to use the AI Agents section for live DB queries.`;
                reply = await puterChat(
                    trimmed,
                    messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                    systemPrompt,
                    puterModel
                );
            } else {
                // ── Server path ─────────────────────────────────────────────
                const res = await fetch("/api/automations/voice", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: trimmed,
                        history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                    }),
                });
                const data = await res.json();
                if (data.quotaExceeded) {
                    setQuotaError({ providerName: data.providerName, quotaKind: data.quotaKind, message: data.message, creditLink: data.creditLink });
                    setIsLoading(false);
                    return;
                }
                if (data.mode) setResponseMode(data.mode as "online" | "offline");
                reply = data.success ? data.reply : "Sorry, something went wrong. Please try again.";
            }

            setMessages((prev) => [...prev, { role: "assistant", content: reply, timestamp: new Date() }]);
            if (tts.autoPlay) tts.speak(reply);
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Connection error. Please check the server.";
            setMessages((prev) => [...prev, { role: "assistant", content: errMsg, timestamp: new Date() }]);
        }
        setIsLoading(false);
        inputRef.current?.focus();
    }, [isLoading, messages]);

    const toggleMic = () => {
        if (isListeningRef.current) {
            stopListening();
        } else {
            try { recognitionRef.current?.stop(); } catch { /* ignore */ }
            const r = buildRecognition(micLang);
            if (!r) return;
            recognitionRef.current = r;
            accumulatedRef.current = input;
            isListeningRef.current = true;
            setIsListening(true);
            setInterimText("");
            try { r.start(); } catch { isListeningRef.current = false; setIsListening(false); }
        }
    };

    const switchLang = () => {
        const next = micLang === "en-US" ? "ur-PK" : "en-US";
        setMicLang(next);
        if (isListeningRef.current) {
            try { recognitionRef.current?.stop(); } catch { /* ignore */ }
            const r = buildRecognition(next);
            if (!r) return;
            recognitionRef.current = r;
            isListeningRef.current = true;
            try { r.start(); } catch { /* ignore */ }
        }
    };

    const clearChat = () => {
        setMessages([{
            role: "assistant",
            content: isOnline
                ? "Chat cleared. Ask me anything about your business!"
                : "Chat cleared. I can help with party balances, inventory, payments, rates, and sales.",
            timestamp: new Date(),
        }]);
    };

    return (
        <div className="flex flex-col h-full" style={{ minHeight: 0, maxHeight: "calc(100vh - 240px)" }}>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3">
                <span className={`badge ${responseMode === "online" ? "badge-finalized" : "badge-draft"}`}>
                    <Sparkles size={10} />
                    {puterModel ? `Puter.js (${puterModel})` : responseMode === "online" ? "AI Active" : "Offline Rules"}
                </span>
                <div className="flex items-center gap-2">
                    {micAvailable && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Microphone available
                        </span>
                    )}
                    {/* Voice output toggle */}
                    <button
                        onClick={() => tts.voiceEnabled ? (tts.isPlaying ? tts.stop() : tts.setVoiceEnabled(false)) : tts.setVoiceEnabled(true)}
                        className="btn btn-ghost btn-icon"
                        title={tts.voiceEnabled ? (tts.isPlaying ? "Stop speaking" : "Voice on — click off") : "Turn on voice"}
                        style={{
                            width: 28, height: 28, minWidth: 28, padding: 0,
                            color: tts.voiceEnabled ? "var(--gold-dark)" : "var(--text-muted)",
                            background: tts.voiceEnabled ? "rgba(201,168,76,0.1)" : "transparent",
                            border: tts.voiceEnabled ? "1px solid rgba(201,168,76,0.25)" : "1px solid var(--border)",
                        }}>
                        {tts.isPlaying ? <Square size={12} /> : tts.voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                    </button>
                    <button onClick={clearChat} className="btn btn-ghost btn-icon" title="Clear chat"
                        style={{ width: 28, height: 28, minWidth: 28, padding: 0 }}>
                        <RotateCcw size={13} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ minHeight: 0 }}>
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{
                                background: msg.role === "user" ? "rgba(201,168,76,0.15)" : "rgba(92,10,10,0.07)",
                                border: `1px solid ${msg.role === "user" ? "rgba(201,168,76,0.3)" : "rgba(92,10,10,0.12)"}`,
                            }}>
                            {msg.role === "user"
                                ? <User size={14} style={{ color: "var(--gold-dark)" }} />
                                : <Bot size={14} style={{ color: "var(--maroon)" }} />
                            }
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[72%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                                style={{
                                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    background: msg.role === "user"
                                        ? "linear-gradient(135deg, var(--maroon-light), var(--maroon))"
                                        : "white",
                                    color: msg.role === "user" ? "var(--text-on-maroon)" : "var(--text-primary)",
                                    border: msg.role === "user" ? "none" : "1px solid var(--border)",
                                    boxShadow: "var(--shadow-xs)",
                                }}>
                                {msg.content}
                            </div>
                            <div className="flex items-center gap-2 px-1">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {msg.role === "assistant" && tts.voiceEnabled && (
                                    <button
                                        onClick={() => tts.isPlaying ? tts.stop() : tts.speak(msg.content)}
                                        title={tts.isPlaying ? "Stop" : "Read aloud"}
                                        style={{
                                            width: 20, height: 20, borderRadius: 4, border: "none",
                                            background: "transparent", color: "var(--text-muted)",
                                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                                        }}>
                                        {tts.isPlaying ? <Square size={10} /> : <Volume2 size={11} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "rgba(92,10,10,0.07)", border: "1px solid rgba(92,10,10,0.12)" }}>
                            <Bot size={14} style={{ color: "var(--maroon)" }} />
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                            style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
                            <div className="flex gap-1.5 items-center h-4">
                                {[0, 1, 2].map((d) => (
                                    <span key={d} className="w-2 h-2 rounded-full"
                                        style={{
                                            background: "var(--gold)",
                                            animation: "bounce 1.2s ease-in-out infinite",
                                            animationDelay: `${d * 0.2}s`,
                                        }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {quotaError && (
                    <QuotaBanner {...quotaError}
                        onDismiss={() => setQuotaError(null)}
                        onRetry={quotaError.quotaKind !== "quota" ? () => setQuotaError(null) : undefined}
                    />
                )}
                <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && (
                <div className="flex flex-wrap gap-2 my-3">
                    {SUGGESTIONS.map((s) => (
                        <button key={s} onClick={() => sendMessage(s)}
                            className="text-xs px-3 py-1.5 rounded-full transition-all"
                            style={{
                                background: "var(--cream-light)",
                                border: "1px solid var(--border)",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "var(--gold)";
                                e.currentTarget.style.color = "var(--maroon)";
                                e.currentTarget.style.background = "rgba(201,168,76,0.1)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--border)";
                                e.currentTarget.style.color = "var(--text-secondary)";
                                e.currentTarget.style.background = "var(--cream-light)";
                            }}>
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Input bar */}
            <div className="flex items-center gap-2 mt-3 p-2 rounded-xl"
                style={{ background: "var(--cream-light)", border: "1px solid var(--border)" }}>
                {micAvailable && (
                    <button onClick={toggleMic}
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all"
                        style={{
                            background: isListening ? "var(--danger-bg)" : "white",
                            border: `1px solid ${isListening ? "rgba(196,43,43,0.3)" : "var(--border)"}`,
                            color: isListening ? "var(--danger)" : "var(--text-muted)",
                            cursor: "pointer",
                            boxShadow: isListening ? "0 0 0 3px rgba(196,43,43,0.1)" : "none",
                        }}>
                        {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                )}

                {/* Lang toggle */}
                {micAvailable && (
                    <button onClick={switchLang}
                        title={`Switch to ${micLang === "en-US" ? "Urdu script" : "Roman Urdu / English"}`}
                        className="shrink-0 rounded text-xs font-bold px-1.5"
                        style={{ height: 28, border: "1px solid var(--border)", background: "white", color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>
                        {micLang === "en-US" ? "EN" : "اردو"}
                    </button>
                )}

                <div className="flex-1 min-w-0 relative">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => { setInput(e.target.value); accumulatedRef.current = e.target.value; }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isListening) { e.preventDefault(); sendMessage(input); } }}
                        placeholder={isListening ? `بولتے رہیں (${micLang === "en-US" ? "Roman Urdu / English" : "Urdu"})…` : "Ask anything — type or speak as long as you want"}
                        disabled={isLoading}
                        className="w-full bg-transparent border-none outline-none text-sm"
                        style={{ color: "var(--text-primary)" }}
                    />
                    {isListening && interimText && (
                        <div className="absolute left-0 top-full mt-0.5 text-xs px-1 pointer-events-none truncate max-w-full"
                            style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                            {interimText}…
                        </div>
                    )}
                </div>

                <button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading}
                    className="btn btn-primary"
                    style={{ width: 36, height: 36, padding: 0, minWidth: 36, borderRadius: 8 }}>
                    {isLoading
                        ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                        : <Send size={15} />
                    }
                </button>
            </div>

            <style>{`
                @keyframes bounce { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
