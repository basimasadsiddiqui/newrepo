"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Mic, MicOff, FileText, Loader2, CheckCircle2, XCircle,
    ExternalLink, RotateCcw, Sparkles, User, Package,
} from "lucide-react";
import { useRouter } from "next/navigation";
import QuotaBanner from "@/components/automations/QuotaBanner";
import { puterChat } from "@/hooks/usePuterAgent";

interface ParsedItem {
    description: string;
    pieces: number;
    carat: number;
    estimatedGoldWeight: number | null;
    stoneWeight: number | null;
    stoneRate: number | null;
    makingCharges: number | null;
}

interface ParsedInvoice {
    partyName: string | null;
    transactionType: string;
    goldRate: number | null;
    items: ParsedItem[];
    remarks: string;
    cashReceived: number | null;
    discount: number | null;
}

// Use the globally declared SpeechRecognition types (defined in AgentChat.tsx / browser globals)
type SR = InstanceType<typeof window.SpeechRecognition>;

// Trigger phrases that auto-submit the invoice
const TRIGGER_PHRASES = [
    "invoice banao", "invoice bana", "generate invoice", "create invoice",
    "invoice create karo", "invoice create", "invoice ready", "save invoice",
    "invoice save karo", "done", "complete karo", "invoice complete",
];

export default function VoiceInvoice({ isOnline, puterModel }: { isOnline: boolean; puterModel?: string | null }) {
    const router = useRouter();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimText, setInterimText] = useState("");
    const [isParsing, setIsParsing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
    const [createdInvoice, setCreatedInvoice] = useState<{ id: string; orderNumber: string; editUrl: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [quotaError, setQuotaError] = useState<{ providerName: string; quotaKind: "quota" | "rate_limit" | "overloaded"; message: string; creditLink: string | null } | null>(null);
    const [micAvailable, setMicAvailable] = useState(false);

    const recognitionRef = useRef<SR | null>(null);
    const transcriptRef = useRef("");

    useEffect(() => {
        const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SRClass) {
            setMicAvailable(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = new SRClass() as any;
            r.lang = "ur-PK";
            r.continuous = true;
            r.interimResults = true;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            r.onresult = (e: any) => {
                let interim = "";
                let finalText = transcriptRef.current;
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const result = e.results[i];
                    if (result.isFinal) finalText += result[0].transcript + " ";
                    else interim = result[0].transcript;
                }
                transcriptRef.current = finalText;
                setTranscript(finalText);
                setInterimText(interim);
                const lower = (finalText + interim).toLowerCase();
                const triggered = TRIGGER_PHRASES.some((p) => lower.includes(p));
                if (triggered && finalText.trim().length > 10) {
                    r.stop();
                    setIsListening(false);
                    setInterimText("");
                    parseTranscript(finalText.trim());
                }
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            r.onerror = (e: any) => {
                if (e.error !== "aborted") setError(`Mic error: ${e.error}`);
                setIsListening(false);
            };
            r.onend = () => { setIsListening(false); setInterimText(""); };
            recognitionRef.current = r;
        }
    }, []);

    const toggleMic = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setError(null);
            transcriptRef.current = transcript; // continue from existing text
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const parseTranscript = useCallback(async (text: string) => {
        if (!text.trim() || isParsing) return;
        setIsParsing(true);
        setError(null);
        setParsed(null);
        try {
            const res = await fetch("/api/automations/voice-invoice?action=parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript: text }),
            });
            const data = await res.json();

            if (data.quotaExceeded) {
                setQuotaError({ providerName: data.providerName, quotaKind: data.quotaKind, message: data.message, creditLink: data.creditLink });
            } else if (data.mode === "puter" && puterModel) {
                // Server says Puter mode — call Puter.js in browser for parsing
                const rawJson = await puterChat(data.puterUserPrompt, [], data.puterSystemPrompt, puterModel);
                const clean = rawJson.replace(/```json|```/g, "").trim();
                setParsed(JSON.parse(clean));
            } else if (data.success) {
                setParsed(data.parsed);
            } else {
                setError(data.error ?? "Could not parse invoice details");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Connection error");
        }
        setIsParsing(false);
    }, [isParsing, puterModel]);

    const createInvoice = async () => {
        if (!parsed || !transcript.trim()) return;
        setIsCreating(true);
        setError(null);
        try {
            // When Puter parsed the transcript, send the already-parsed data directly
            const action = puterModel ? "create-direct" : "create";
            const body = puterModel
                ? { transcript: transcript.trim(), parsedData: parsed }
                : { transcript: transcript.trim() };
            const res = await fetch(`/api/automations/voice-invoice?action=${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                setCreatedInvoice({ id: data.invoiceId, orderNumber: data.orderNumber, editUrl: data.editUrl });
            } else {
                setError(data.error ?? "Failed to create invoice");
            }
        } catch {
            setError("Connection error");
        }
        setIsCreating(false);
    };

    const reset = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recognitionRef.current as any)?.abort?.();
        setIsListening(false);
        setTranscript("");
        setInterimText("");
        setParsed(null);
        setCreatedInvoice(null);
        setError(null);
        transcriptRef.current = "";
    };

    if (!isOnline) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <span className="text-4xl">🎙️</span>
            <h3 className="font-bold text-lg" style={{ color: "var(--maroon)" }}>AI provider required</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Add an API key in Automations → Settings to use Voice Invoice.
            </p>
        </div>
    );

    // ── Success state ─────────────────────────────────────────────────────────
    if (createdInvoice) return (
        <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "var(--success-bg)", border: "2px solid rgba(30,124,74,0.3)" }}>
                <CheckCircle2 size={36} style={{ color: "var(--success)" }} />
            </div>
            <div>
                <h3 className="font-bold text-xl" style={{ color: "var(--maroon)" }}>
                    Invoice Created!
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    Draft #{createdInvoice.orderNumber} saved. Review and finalise it.
                </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
                <a href={createdInvoice.editUrl}
                    className="btn btn-primary"
                    style={{ gap: 8 }}>
                    <ExternalLink size={15} />
                    Open Invoice
                </a>
                <button onClick={reset} className="btn btn-ghost">
                    <RotateCcw size={14} /> New Invoice
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-5 h-full" style={{ minHeight: 0 }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="font-bold text-lg" style={{ color: "var(--maroon)" }}>
                        🎙️ Voice Invoice
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Speak the invoice details in Urdu or English. Say <strong>"invoice banao"</strong> when done.
                    </p>
                </div>
                {(transcript || parsed) && (
                    <button onClick={reset} className="btn btn-ghost" style={{ height: 32 }}>
                        <RotateCcw size={13} /> Reset
                    </button>
                )}
            </div>

            {/* Examples */}
            {!transcript && (
                <div className="rounded-xl p-4 space-y-2"
                    style={{ background: "linear-gradient(135deg, rgba(92,10,10,0.03), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Example phrases — bolein kuch aisa:
                    </p>
                    {[
                        "Ahmed Khan ke liye ek 22 karat gold ring ka invoice, weight 5 gram, rate 9500, making charges 800 rupay",
                        "Sona Khan ki 2 gold bangles, 18 karat, 12 gram total, rate 8500, discount 500. Invoice banao.",
                        "Ramesh Kumar — ek necklace, 22 carat, 15.5 gram, stone weight 2 gram, stone rate 200 per gram",
                    ].map((ex) => (
                        <button key={ex} onClick={() => { setTranscript(ex); transcriptRef.current = ex; }}
                            className="block w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                            style={{
                                background: "rgba(255,255,255,0.7)", border: "1px solid var(--border)",
                                color: "var(--text-secondary)", cursor: "pointer",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                            "{ex}"
                        </button>
                    ))}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
                {/* Left — transcript + mic */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Transcript area */}
                    <div className="flex-1 rounded-xl p-4 relative min-h-32"
                        style={{
                            background: "white", border: `2px solid ${isListening ? "var(--gold)" : "var(--border)"}`,
                            boxShadow: isListening ? "var(--shadow-gold)" : "none",
                            transition: "all 0.2s",
                        }}>
                        {transcript || interimText ? (
                            <div>
                                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                                    {transcript}
                                </p>
                                {interimText && (
                                    <p className="text-sm leading-relaxed mt-1" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                        {interimText}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2 py-8"
                                style={{ color: "var(--text-muted)" }}>
                                <Mic size={28} style={{ opacity: 0.3 }} />
                                <p className="text-sm text-center">
                                    {isListening ? "سن رہا ہوں... بولیں" : "Mic button press karein aur bolein"}
                                </p>
                            </div>
                        )}

                        {isListening && (
                            <div className="absolute top-3 right-3 flex items-center gap-2">
                                {[0, 1, 2].map((i) => (
                                    <span key={i} className="w-2 h-2 rounded-full"
                                        style={{
                                            background: "var(--danger)",
                                            animation: "pulse 1.2s ease-in-out infinite",
                                            animationDelay: `${i * 0.2}s`,
                                        }} />
                                ))}
                                <span className="text-xs font-semibold" style={{ color: "var(--danger)" }}>REC</span>
                            </div>
                        )}
                    </div>

                    {/* Text input fallback */}
                    {transcript && !isListening && (
                        <textarea
                            value={transcript}
                            onChange={(e) => { setTranscript(e.target.value); transcriptRef.current = e.target.value; setParsed(null); }}
                            rows={3}
                            className="form-input"
                            style={{ resize: "vertical", fontFamily: "inherit", fontSize: "0.875rem" }}
                            placeholder="Yahan bhi type kar sakte hain..."
                        />
                    )}

                    {/* Controls */}
                    <div className="flex flex-wrap gap-3">
                        {micAvailable && (
                            <button
                                onClick={toggleMic}
                                disabled={isParsing || isCreating}
                                className="btn flex-1"
                                style={{
                                    background: isListening
                                        ? "linear-gradient(135deg, var(--danger), #b91c1c)"
                                        : "linear-gradient(135deg, var(--maroon-light), var(--maroon))",
                                    color: "white",
                                    boxShadow: isListening ? "0 0 0 4px rgba(220,38,38,0.15)" : "var(--shadow-sm)",
                                    minWidth: 140,
                                }}>
                                {isListening ? <><MicOff size={16} /> Rokein</> : <><Mic size={16} /> Bolein</>}
                            </button>
                        )}

                        {transcript && !isListening && (
                            <button
                                onClick={() => parseTranscript(transcript)}
                                disabled={isParsing}
                                className="btn btn-secondary flex-1">
                                {isParsing
                                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Samajh raha hoon...</>
                                    : <><Sparkles size={15} /> Details Nikalo</>
                                }
                            </button>
                        )}
                    </div>

                    {quotaError && (
                        <QuotaBanner {...quotaError}
                            onDismiss={() => setQuotaError(null)}
                            onRetry={quotaError.quotaKind !== "quota" ? () => { setQuotaError(null); if (transcript) parseTranscript(transcript); } : undefined}
                        />
                    )}
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                            style={{ background: "var(--danger-bg)", border: "1px solid rgba(196,43,43,0.2)", color: "var(--danger)" }}>
                            <XCircle size={14} /> {error}
                        </div>
                    )}
                </div>

                {/* Right — parsed preview */}
                {(parsed || isParsing) && (
                    <div className="lg:w-80 flex flex-col gap-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            Invoice Preview
                        </h3>

                        {isParsing ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-xl"
                                style={{ background: "var(--cream-light)", border: "1px solid var(--border)" }}>
                                <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--gold)" }} />
                                <p className="text-sm" style={{ color: "var(--text-muted)" }}>AI samajh raha hai...</p>
                            </div>
                        ) : parsed && (
                            <div className="space-y-3">
                                {/* Customer */}
                                <div className="rounded-xl p-4"
                                    style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <User size={14} style={{ color: "var(--maroon)" }} />
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Customer</span>
                                    </div>
                                    <p className="font-bold text-base" style={{ color: "var(--maroon)" }}>
                                        {parsed.partyName ?? <span style={{ opacity: 0.4 }}>Not detected</span>}
                                    </p>
                                    <div className="flex gap-3 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                        <span>{parsed.transactionType}</span>
                                        {parsed.goldRate && <span>Rate: PKR {parsed.goldRate.toLocaleString()}/g</span>}
                                        {parsed.cashReceived && <span>Cash: PKR {parsed.cashReceived.toLocaleString()}</span>}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="rounded-xl overflow-hidden"
                                    style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                                    <div className="px-4 py-2.5 flex items-center gap-2"
                                        style={{ background: "linear-gradient(135deg, rgba(92,10,10,0.04), rgba(201,168,76,0.03))", borderBottom: "1px solid var(--border)" }}>
                                        <Package size={13} style={{ color: "var(--maroon)" }} />
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                            Items ({parsed.items.length})
                                        </span>
                                    </div>
                                    <div className="divide-y divide-[var(--border)]">
                                        {parsed.items.map((item, i) => (
                                            <div key={i} className="px-4 py-3">
                                                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                                                    {item.description}
                                                </p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                    {[
                                                        item.pieces > 1 && `${item.pieces} pcs`,
                                                        item.carat && `${item.carat}K`,
                                                        item.estimatedGoldWeight && `${item.estimatedGoldWeight}g`,
                                                        item.stoneWeight && `Stone: ${item.stoneWeight}g`,
                                                        item.makingCharges && `Making: PKR ${item.makingCharges}`,
                                                    ].filter(Boolean).map((d, j) => (
                                                        <span key={j} className="text-xs" style={{ color: "var(--text-muted)" }}>{d}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {parsed.remarks && (
                                    <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>
                                        Note: {parsed.remarks}
                                    </p>
                                )}

                                {/* Create button */}
                                <button
                                    onClick={createInvoice}
                                    disabled={isCreating}
                                    className="btn btn-primary w-full"
                                    style={{ height: 44, fontSize: "0.9375rem" }}>
                                    {isCreating
                                        ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Invoice bana raha hoon...</>
                                        : <><FileText size={16} /> Draft Invoice Banao</>
                                    }
                                </button>

                                <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                                    A draft will be created — you can review and edit before finalising.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse { 0%,100% { opacity:0.3; transform:scale(0.7) } 50% { opacity:1; transform:scale(1) } }
                @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
            `}</style>
        </div>
    );
}
