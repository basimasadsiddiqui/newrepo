"use client";

import { useState, useEffect } from "react";
import { MessageSquareQuote, Loader2, Copy, Check, ExternalLink, Sparkles, AlertTriangle, RefreshCw, Users } from "lucide-react";
import { puterChat } from "@/hooks/usePuterAgent";

interface PartyDue {
    id: string;
    partyName: string;
    mobile: string | null;
    amount: number;
    dueDate: string;
    daysOverdue: number;
}

interface GeneratedMessage {
    partyId: string;
    message: string;
    waLink: string | null;
    mode: string;
    copied: boolean;
}

interface Props { isOnline: boolean; puterModel?: string | null; }

export default function SmartReminders({ isOnline, puterModel }: Props) {
    const [parties, setParties] = useState<PartyDue[]>([]);
    const [isLoadingParties, setIsLoadingParties] = useState(true);
    const [generatedMessages, setGeneratedMessages] = useState<Record<string, GeneratedMessage>>({});
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [error, setError] = useState("");

    const loadParties = async () => {
        setIsLoadingParties(true);
        try {
            const res = await fetch("/api/automations/reminders");
            const data = await res.json();
            if (data.success) setParties(data.parties);
        } catch { setError("Failed to load overdue parties."); }
        setIsLoadingParties(false);
    };

    useEffect(() => { loadParties(); }, []);

    const generateMessage = async (party: PartyDue) => {
        setGeneratingId(party.id);
        try {
            const res = await fetch("/api/automations/reminders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partyName: party.partyName, amount: party.amount,
                    daysOverdue: party.daysOverdue, mobile: party.mobile,
                }),
            });
            const data = await res.json();
            if (data.success) {
                let finalMessage = data.message;
                let finalWaLink = data.waLink;

                // Puter mode — generate reminder text in browser
                if (data.mode === "puter" && puterModel) {
                    finalMessage = await puterChat(data.puterUserPrompt, [], data.puterSystemPrompt, puterModel);
                    if (data.waBase) finalWaLink = `${data.waBase}?text=${encodeURIComponent(finalMessage)}`;
                }

                setGeneratedMessages((prev) => ({
                    ...prev,
                    [party.id]: { partyId: party.id, message: finalMessage, waLink: finalWaLink, mode: data.mode, copied: false },
                }));
            }
        } catch { /* ignore */ }
        setGeneratingId(null);
    };

    const copyMessage = (partyId: string) => {
        const msg = generatedMessages[partyId];
        if (!msg) return;
        navigator.clipboard.writeText(msg.message);
        setGeneratedMessages((prev) => ({ ...prev, [partyId]: { ...prev[partyId], copied: true } }));
        setTimeout(() => setGeneratedMessages((prev) => ({ ...prev, [partyId]: { ...prev[partyId], copied: false } })), 2500);
    };

    const urgencyColor = (days: number) =>
        days > 30 ? "var(--danger)" : days > 14 ? "var(--warning)" : "var(--info)";

    const urgencyBg = (days: number) =>
        days > 30 ? "var(--danger-bg)" : days > 14 ? "var(--warning-bg)" : "var(--info-bg)";

    const urgencyBorder = (days: number) =>
        days > 30 ? "rgba(196,43,43,0.2)" : days > 14 ? "rgba(217,119,6,0.2)" : "rgba(29,95,173,0.2)";

    return (
        <div className="space-y-5">
            {/* Intro */}
            <div className="rounded-xl p-5"
                style={{ background: "linear-gradient(135deg, rgba(92,10,10,0.04) 0%, rgba(201,168,76,0.06) 100%)", border: "1px solid rgba(92,10,10,0.12)" }}>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, var(--maroon-light), var(--maroon))" }}>
                        <MessageSquareQuote size={22} color="var(--text-on-maroon)" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-base mb-1" style={{ color: "var(--maroon)" }}>
                            Smart Payment Reminders
                        </h3>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            {isOnline
                                ? "AI drafts a personalized, polite WhatsApp message for each overdue customer — ready to send in one tap."
                                : "Automatically generates professional reminder messages for each overdue customer using smart templates."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users size={16} style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                        {isLoadingParties ? "Loading..." : `${parties.length} overdue payment${parties.length !== 1 ? "s" : ""}`}
                    </span>
                </div>
                <button onClick={loadParties} disabled={isLoadingParties} className="btn btn-ghost"
                    style={{ height: 30, padding: "0 10px", fontSize: "0.75rem" }}>
                    <RefreshCw size={12} style={{ animation: isLoadingParties ? "spin 1s linear infinite" : "none" }} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="text-sm px-4 py-3 rounded-lg flex items-center gap-2"
                    style={{ background: "var(--danger-bg)", border: "1px solid rgba(196,43,43,0.2)", color: "var(--danger)" }}>
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {isLoadingParties ? (
                <div className="flex items-center justify-center py-12 gap-3" style={{ color: "var(--text-muted)" }}>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    <span className="text-sm">Loading overdue payments...</span>
                </div>
            ) : parties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3"
                    style={{ color: "var(--text-muted)" }}>
                    <Check size={36} style={{ color: "var(--success)", opacity: 0.6 }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                        All clear! No overdue payments.
                    </p>
                    <p className="text-xs">All customers are up to date.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {parties.map((party) => {
                        const generated = generatedMessages[party.id];
                        const isGenerating = generatingId === party.id;

                        return (
                            <div key={party.id} className="card overflow-visible">
                                {/* Party header */}
                                <div className="px-4 py-3 flex items-center justify-between gap-3"
                                    style={{ borderBottom: generated ? "1px solid var(--border)" : "none" }}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                            style={{
                                                background: urgencyBg(party.daysOverdue),
                                                color: urgencyColor(party.daysOverdue),
                                                border: `1px solid ${urgencyBorder(party.daysOverdue)}`,
                                            }}>
                                            {party.partyName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                                                {party.partyName}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold" style={{ color: "var(--maroon)" }}>
                                                    PKR {party.amount.toLocaleString()}
                                                </span>
                                                <span className="text-xs"
                                                    style={{
                                                        color: urgencyColor(party.daysOverdue),
                                                        background: urgencyBg(party.daysOverdue),
                                                        padding: "0 6px", borderRadius: 99,
                                                        border: `1px solid ${urgencyBorder(party.daysOverdue)}`,
                                                        fontWeight: 600, fontSize: "0.625rem",
                                                    }}>
                                                    {party.daysOverdue} day{party.daysOverdue !== 1 ? "s" : ""} overdue
                                                </span>
                                                {party.mobile && (
                                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                                        {party.mobile}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!generated && (
                                        <button onClick={() => generateMessage(party)}
                                            disabled={isGenerating}
                                            className="btn btn-secondary shrink-0"
                                            style={{ height: 32, padding: "0 12px", fontSize: "0.75rem" }}>
                                            {isGenerating
                                                ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Drafting...</>
                                                : <><Sparkles size={12} /> Draft Reminder</>
                                            }
                                        </button>
                                    )}
                                </div>

                                {/* Generated message */}
                                {generated && (
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className={`badge ${generated.mode === "online" ? "badge-finalized" : "badge-draft"}`}>
                                                <Sparkles size={9} />
                                                {generated.mode === "online" ? "AI Written" : "Template"}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => generateMessage(party)}
                                                    disabled={isGenerating}
                                                    className="btn btn-ghost"
                                                    style={{ height: 26, padding: "0 8px", fontSize: "0.6875rem" }}>
                                                    <RefreshCw size={11} /> Rewrite
                                                </button>
                                            </div>
                                        </div>

                                        <pre className="text-sm leading-relaxed whitespace-pre-wrap"
                                            style={{
                                                fontFamily: "var(--font-sans)", color: "var(--text-primary)",
                                                background: "var(--cream-light)", padding: "14px 16px",
                                                borderRadius: 10, border: "1px solid var(--border)", margin: 0,
                                            }}>
                                            {generated.message}
                                        </pre>

                                        <div className="flex items-center gap-2">
                                            <button onClick={() => copyMessage(party.id)} className="btn btn-ghost"
                                                style={{ height: 32, padding: "0 12px", fontSize: "0.75rem" }}>
                                                {generatedMessages[party.id]?.copied
                                                    ? <><Check size={13} style={{ color: "var(--success)" }} /> Copied!</>
                                                    : <><Copy size={13} /> Copy Message</>
                                                }
                                            </button>

                                            {generated.waLink && (
                                                <a href={generated.waLink} target="_blank" rel="noopener noreferrer"
                                                    className="btn btn-primary"
                                                    style={{ height: 32, padding: "0 12px", fontSize: "0.75rem" }}>
                                                    <ExternalLink size={13} /> Open in WhatsApp
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
