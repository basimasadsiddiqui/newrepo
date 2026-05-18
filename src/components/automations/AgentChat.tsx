"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Send, Loader2, Bot, User, Wrench, CheckCircle2, XCircle,
    Mic, MicOff, RotateCcw, AlertTriangle, ChevronDown, ChevronUp,
    Volume2, VolumeX, Square,
} from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import QuotaBanner from "@/components/automations/QuotaBanner";
import { usePuterAgent } from "@/hooks/usePuterAgent";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    toolCalls?: ToolCallRecord[];
    isError?: boolean;
}

interface ToolCallRecord {
    tool: string;
    input: Record<string, unknown>;
    result: unknown;
    isWrite: boolean;
}

interface PendingConfirmation {
    tool: string;
    input: Record<string, unknown>;
    description: string;
}

interface AgentDef {
    id: string;
    name: string;
    nameUrdu: string;
    icon: string;
}

interface Props {
    agentId: string;
    agentDef: AgentDef;
    examples: string[];
    isOnline: boolean;
    puterModel?: string | null;  // non-null means use Puter.js client-side
}

interface SpeechRecognition extends EventTarget {
    lang: string; interimResults: boolean; maxAlternatives: number;
    start(): void; stop(): void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null; onend: (() => void) | null;
}
interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList; }
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

function uid() { return Math.random().toString(36).slice(2); }

export default function AgentChat({ agentId, agentDef, examples, isOnline, puterModel }: Props) {
    const [messages, setMessages] = useState<Message[]>([{
        id: uid(), role: "assistant",
        content: `${agentDef.icon} **${agentDef.name}** ready.\n\nAsk me anything in English or Urdu — I'll use live ERP data to answer.\n\n*${agentDef.nameUrdu}* — انگریزی یا اردو میں پوچھیں۔`,
        timestamp: new Date(),
    }]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [micAvailable, setMicAvailable] = useState(false);
    const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
    const [quotaError, setQuotaError] = useState<{ providerName: string; quotaKind: "quota" | "rate_limit" | "overloaded"; message: string; creditLink: string | null } | null>(null);

    const tts = useTTS();
    const puterAgent = usePuterAgent(puterModel ?? "gpt-5-nano");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const accumulatedRef = useRef(""); // collects all speech across pauses
    const [micLang, setMicLang] = useState<"en-US" | "ur-PK">("en-US"); // en-US handles Roman Urdu better
    const [interimText, setInterimText] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const getHistory = () =>
        messages.slice(1).map((m) => ({ role: m.role, content: m.content }));

    const stopListening = () => {
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        isListeningRef.current = false;
        setIsListening(false);
        setInterimText("");
    };

    const buildRecognition = useCallback((lang: string) => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = new SR() as any;
        r.lang = lang;
        r.continuous = true;       // keep listening across natural pauses
        r.interimResults = true;   // show live text while speaking
        r.maxAlternatives = 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.onresult = (e: any) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const result = e.results[i];
                if (result.isFinal) {
                    accumulatedRef.current += result[0].transcript + " ";
                    setInput(accumulatedRef.current.trim());
                } else {
                    interim = result[0].transcript;
                }
            }
            setInterimText(interim);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.onerror = (e: any) => {
            // Ignore "no-speech" — user just hasn't spoken yet
            if (e.error !== "no-speech" && e.error !== "aborted") {
                isListeningRef.current = false;
                setIsListening(false);
                setInterimText("");
            }
        };

        r.onend = () => {
            // Auto-restart while mic button is still active (handles browser stopping after pause)
            if (isListeningRef.current) {
                try { r.start(); } catch { /* ignore double-start */ }
            } else {
                setInterimText("");
            }
        };
        return r;
    }, []);

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) setMicAvailable(true);
        return () => { stopListening(); };
    }, []);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking, pendingConfirm]);

    const sendMessage = useCallback(async (text: string, isConfirmAction = false, confirmData?: { tool: string; input: Record<string, unknown> }) => {
        const trimmed = text.trim();
        if ((!trimmed && !isConfirmAction) || isThinking) return;

        const userMsg: Message = { id: uid(), role: "user", content: trimmed || "✅ Confirmed", timestamp: new Date() };
        if (!isConfirmAction) setMessages((p) => [...p, userMsg]);
        setInput("");
        setIsThinking(true);
        setPendingConfirm(null);

        try {
            const body: Record<string, unknown> = {
                agentId,
                history: getHistory(),
            };
            if (isConfirmAction && confirmData) {
                body.confirmAction = confirmData;
            } else {
                body.message = trimmed;
            }

            let responseText = "";
            let responseToolCalls: ToolCallRecord[] = [];
            let responseSuccess = true;

            if (puterModel && !isConfirmAction) {
                // ── Puter.js client-side path ─────────────────────────────
                try {
                    const result = await puterAgent.run(trimmed, getHistory(), agentId);
                    responseText = result.response;
                    responseToolCalls = result.toolCalls;
                } catch (err) {
                    responseText = err instanceof Error ? err.message : "Puter.js error";
                    responseSuccess = false;
                }
            } else {
                // ── Server-side path (API key providers + confirm actions) ─
                const res = await fetch("/api/automations/agent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                const data = await res.json();

                if (data.quotaExceeded) {
                    setQuotaError({ providerName: data.providerName, quotaKind: data.quotaKind, message: data.message, creditLink: data.creditLink });
                    setIsThinking(false);
                    inputRef.current?.focus();
                    return;
                }
                if (data.pendingConfirmation) {
                    setPendingConfirm(data.pendingConfirmation);
                    const msgId = uid();
                    setMessages((p) => [...p, { id: msgId, role: "assistant", content: data.response, timestamp: new Date(), toolCalls: data.toolCalls }]);
                    if (tts.autoPlay) tts.speak(data.response, msgId);
                    setIsThinking(false);
                    inputRef.current?.focus();
                    return;
                }
                responseText = data.success ? data.response : (data.error || "Something went wrong.");
                responseToolCalls = data.toolCalls ?? [];
                responseSuccess = data.success;
            }

            const msgId = uid();
            setMessages((p) => [...p, {
                id: msgId, role: "assistant", content: responseText,
                timestamp: new Date(), toolCalls: responseToolCalls, isError: !responseSuccess,
            }]);
            if (responseSuccess && tts.autoPlay) tts.speak(responseText, msgId);
        } catch {
            setMessages((p) => [...p, {
                id: uid(), role: "assistant",
                content: "Connection error. Please check the server.",
                timestamp: new Date(), isError: true,
            }]);
        }
        setIsThinking(false);
        inputRef.current?.focus();
    }, [isThinking, messages, agentId]);

    const confirm = () => {
        if (!pendingConfirm) return;
        sendMessage("Confirmed", true, { tool: pendingConfirm.tool, input: pendingConfirm.input });
    };

    const clearChat = () => {
        setMessages([{
            id: uid(), role: "assistant",
            content: `${agentDef.icon} Chat cleared. Ask me anything!`,
            timestamp: new Date(),
        }]);
        setPendingConfirm(null);
    };

    const toggleMic = () => {
        if (isListeningRef.current) {
            // User clicking stop — keep the accumulated text in input
            stopListening();
        } else {
            // Fresh start — rebuild recognition with current lang setting
            try { recognitionRef.current?.stop(); } catch { /* ignore */ }
            const r = buildRecognition(micLang);
            if (!r) return;
            recognitionRef.current = r;
            accumulatedRef.current = input; // start from whatever is already typed
            isListeningRef.current = true;
            setIsListening(true);
            setInterimText("");
            try { r.start(); } catch { isListeningRef.current = false; setIsListening(false); }
        }
    };

    const switchLang = () => {
        const next = micLang === "en-US" ? "ur-PK" : "en-US";
        setMicLang(next);
        // Restart with new language if already listening
        if (isListeningRef.current) {
            try { recognitionRef.current?.stop(); } catch { /* ignore */ }
            const r = buildRecognition(next);
            if (!r) return;
            recognitionRef.current = r;
            isListeningRef.current = true;
            try { r.start(); } catch { /* ignore */ }
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ minHeight: 0, maxHeight: "calc(100vh - 220px)" }}>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{agentDef.icon}</span>
                    <div>
                        <span className="font-bold text-sm" style={{ color: "var(--maroon)" }}>{agentDef.name}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--text-muted)", fontFamily: "'Jameel Noori Nastaleeq', serif" }}>{agentDef.nameUrdu}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`badge ${isOnline ? "badge-finalized" : "badge-draft"}`}>
                        {isOnline ? "AI Active" : "No Provider Set"}
                    </span>
                    {micAvailable && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>اردو بولنا ممکن</span>
                    )}
                    {/* Voice toggle */}
                    <button
                        onClick={() => tts.voiceEnabled ? (tts.isPlaying ? tts.stop() : tts.setVoiceEnabled(false)) : tts.setVoiceEnabled(true)}
                        className="btn btn-ghost btn-icon"
                        title={tts.voiceEnabled ? (tts.isPlaying ? "Stop speaking" : "Voice on — click to turn off") : "Turn on voice"}
                        style={{
                            width: 28, height: 28, minWidth: 28, padding: 0,
                            color: tts.voiceEnabled ? "var(--gold-dark)" : "var(--text-muted)",
                            background: tts.voiceEnabled ? "rgba(201,168,76,0.1)" : "transparent",
                            border: tts.voiceEnabled ? "1px solid rgba(201,168,76,0.25)" : "1px solid var(--border)",
                        }}>
                        {tts.isPlaying ? <Square size={12} /> : tts.voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                    </button>
                    <button onClick={clearChat} className="btn btn-ghost btn-icon"
                        style={{ width: 28, height: 28, minWidth: 28, padding: 0 }} title="Clear chat">
                        <RotateCcw size={13} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2" style={{ minHeight: 0 }}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                            style={{
                                background: msg.role === "user" ? "rgba(201,168,76,0.15)" : "rgba(92,10,10,0.07)",
                                border: `1px solid ${msg.role === "user" ? "rgba(201,168,76,0.3)" : "rgba(92,10,10,0.12)"}`,
                            }}>
                            {msg.role === "user"
                                ? <User size={14} style={{ color: "var(--gold-dark)" }} />
                                : <span>{agentDef.icon}</span>
                            }
                        </div>
                        <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            {/* Tool calls summary */}
                            {msg.toolCalls && msg.toolCalls.length > 0 && (
                                <div className="space-y-1 w-full">
                                    {msg.toolCalls.map((tc, i) => (
                                        <ToolCallCard key={i} tc={tc}
                                            expanded={!!expandedTools[`${msg.id}-${i}`]}
                                            onToggle={() => setExpandedTools((p) => ({ ...p, [`${msg.id}-${i}`]: !p[`${msg.id}-${i}`] }))} />
                                    ))}
                                </div>
                            )}
                            {/* Bubble */}
                            <div className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                                style={{
                                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    background: msg.isError ? "var(--danger-bg)" :
                                        msg.role === "user" ? "linear-gradient(135deg, var(--maroon-light), var(--maroon))" : "white",
                                    color: msg.isError ? "var(--danger)" :
                                        msg.role === "user" ? "var(--text-on-maroon)" : "var(--text-primary)",
                                    border: msg.role === "user" ? "none" : `1px solid ${msg.isError ? "rgba(196,43,43,0.2)" : "var(--border)"}`,
                                    boxShadow: "var(--shadow-xs)",
                                    direction: /[؀-ۿ]/.test(msg.content) ? "rtl" : "ltr",
                                }}>
                                {msg.content}
                            </div>
                            <div className="flex items-center gap-2 px-1">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {msg.role === "assistant" && !msg.isError && tts.voiceEnabled && (
                                    <button
                                        onClick={() => tts.isSpeaking(msg.id) ? tts.stop() : tts.speak(msg.content, msg.id)}
                                        title={tts.isSpeaking(msg.id) ? "Stop" : "Read aloud"}
                                        style={{
                                            width: 20, height: 20, borderRadius: 4, border: "none",
                                            background: tts.isSpeaking(msg.id) ? "rgba(201,168,76,0.15)" : "transparent",
                                            color: tts.isSpeaking(msg.id) ? "var(--gold-dark)" : "var(--text-muted)",
                                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                            padding: 0,
                                        }}>
                                        {tts.isSpeaking(msg.id) ? <Square size={10} /> : <Volume2 size={11} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                            style={{ background: "rgba(92,10,10,0.07)", border: "1px solid rgba(92,10,10,0.12)" }}>
                            {agentDef.icon}
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                            style={{ background: "white", border: "1px solid var(--border)" }}>
                            <div className="flex gap-1.5 items-center">
                                {[0, 1, 2].map((d) => (
                                    <span key={d} className="w-2 h-2 rounded-full"
                                        style={{ background: "var(--gold)", animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${d * 0.2}s` }} />
                                ))}
                                <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation prompt */}
                {pendingConfirm && (
                    <div className="rounded-xl p-4 space-y-3"
                        style={{ background: "var(--warning-bg)", border: "1px solid rgba(217,119,6,0.25)" }}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
                            <span className="font-semibold text-sm" style={{ color: "var(--warning)" }}>
                                Confirmation Required
                            </span>
                        </div>
                        <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                            <strong>{pendingConfirm.tool.replace(/_/g, " ")}</strong>
                            <div className="mt-1 p-2 rounded text-xs font-mono"
                                style={{ background: "rgba(217,119,6,0.08)", color: "var(--text-secondary)" }}>
                                {JSON.stringify(pendingConfirm.input, null, 2)}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={confirm} className="btn btn-primary" style={{ height: 32, fontSize: "0.8125rem" }}>
                                <CheckCircle2 size={14} /> Confirm & Execute
                            </button>
                            <button onClick={() => setPendingConfirm(null)} className="btn btn-ghost"
                                style={{ height: 32, fontSize: "0.8125rem" }}>
                                <XCircle size={14} /> Cancel
                            </button>
                        </div>
                    </div>
                )}

                {quotaError && (
                    <QuotaBanner
                        {...quotaError}
                        onDismiss={() => setQuotaError(null)}
                        onRetry={quotaError.quotaKind !== "quota" ? () => { setQuotaError(null); sendMessage(input || "retry"); } : undefined}
                    />
                )}

                <div ref={bottomRef} />
            </div>

            {/* Suggestions — show only at start */}
            {messages.length <= 2 && examples.length > 0 && (
                <div className="space-y-1 my-2">
                    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                        {examples.map((ex) => (
                            <button key={ex} onClick={() => sendMessage(ex)}
                                className="text-xs px-3 py-1.5 rounded-full transition-all text-left"
                                style={{
                                    background: "var(--cream-light)", border: "1px solid var(--border)",
                                    color: "var(--text-secondary)", cursor: "pointer",
                                    direction: /[؀-ۿ]/.test(ex) ? "rtl" : "ltr",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--maroon)"; e.currentTarget.style.background = "rgba(201,168,76,0.08)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--cream-light)"; }}>
                                {ex}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 mt-2 p-2 rounded-xl"
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
                        }}
                        title={isListening ? "Stop listening" : `Speak (${micLang === "en-US" ? "Roman Urdu / English" : "Urdu script"})`}>
                        {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                )}
                {/* Language toggle — Roman Urdu (en-US) vs Urdu script (ur-PK) */}
                {micAvailable && (
                    <button onClick={switchLang}
                        title={`Switch to ${micLang === "en-US" ? "Urdu script" : "Roman Urdu / English"}`}
                        className="shrink-0 rounded text-xs font-bold px-1.5"
                        style={{
                            height: 28, border: "1px solid var(--border)", background: "white",
                            color: "var(--text-muted)", cursor: "pointer", lineHeight: 1,
                        }}>
                        {micLang === "en-US" ? "EN" : "اردو"}
                    </button>
                )}
                <div className="flex-1 min-w-0 relative">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => { setInput(e.target.value); accumulatedRef.current = e.target.value; }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isListening) { e.preventDefault(); sendMessage(input); } }}
                        placeholder={isListening ? `${micLang === "ur-PK" ? "اردو" : "Roman Urdu / English"} — بولتے رہیں، رکیں تو جاری رہے گا...` : "Type or press mic — speak as long as you want"}
                        disabled={isThinking}
                        className="w-full bg-transparent border-none outline-none text-sm"
                        style={{ color: "var(--text-primary)" }}
                    />
                    {/* Live interim text overlay */}
                    {isListening && interimText && (
                        <div className="absolute left-0 top-full mt-0.5 text-xs px-1 pointer-events-none truncate max-w-full"
                            style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                            {interimText}…
                        </div>
                    )}
                </div>
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || isThinking}
                    className="btn btn-primary"
                    style={{ width: 36, height: 36, padding: 0, minWidth: 36, borderRadius: 8 }}>
                    {isThinking
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

function ToolCallCard({ tc, expanded, onToggle }: { tc: ToolCallRecord; expanded: boolean; onToggle: () => void }) {
    return (
        <div className="rounded-lg overflow-hidden text-xs"
            style={{ background: "var(--info-bg)", border: "1px solid rgba(29,95,173,0.2)", maxWidth: 360 }}>
            <button onClick={onToggle}
                className="w-full flex items-center gap-2 px-3 py-2 text-left"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--info)" }}>
                <Wrench size={12} />
                <span className="font-semibold flex-1">{tc.tool.replace(/_/g, " ")}</span>
                {tc.isWrite && <span className="badge badge-draft ml-1">write</span>}
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {expanded && (
                <div className="px-3 pb-2 space-y-1" style={{ borderTop: "1px solid rgba(29,95,173,0.15)" }}>
                    <div className="mt-1 font-mono overflow-x-auto text-xs"
                        style={{ color: "var(--info)", opacity: 0.8 }}>
                        Input: {JSON.stringify(tc.input)}
                    </div>
                    <div className="font-mono overflow-x-auto text-xs"
                        style={{ color: "var(--text-secondary)" }}>
                        {typeof tc.result === "object"
                            ? JSON.stringify(tc.result).slice(0, 200) + (JSON.stringify(tc.result).length > 200 ? "..." : "")
                            : String(tc.result)}
                    </div>
                </div>
            )}
        </div>
    );
}
