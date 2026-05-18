"use client";

import { useState } from "react";
import { FileText, Loader2, Copy, Check, Sparkles, RefreshCw, TrendingUp, Package, AlertTriangle, Banknote } from "lucide-react";
import { puterChat } from "@/hooks/usePuterAgent";

interface DigestData {
    date: string;
    todaySales: { count: number; total: number };
    monthSales: { count: number; total: number };
    todayPayments: { count: number; total: number };
    inventory: { available: number; lowStock: number };
    overduePayments: number;
    pendingOrders: number;
    metalRates: { metal: string; rate: number }[];
}

interface Props { isOnline: boolean; puterModel?: string | null; }

export default function DailyDigest({ isOnline, puterModel }: Props) {
    const [digest, setDigest] = useState("");
    const [data, setData] = useState<DigestData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<"online" | "offline" | "puter">("offline");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");

    const generate = async () => {
        setIsLoading(true); setError(""); setDigest("");
        try {
            const res = await fetch("/api/automations/daily-digest");
            const json = await res.json();
            if (json.success) {
                if (json.mode === "puter" && puterModel) {
                    // Call Puter.js in the browser with the prompts from server
                    setData(json.data);
                    setMode("puter");
                    const text = await puterChat(json.puterUserPrompt, [], json.puterSystemPrompt, puterModel);
                    setDigest(text);
                } else {
                    setDigest(json.digest);
                    setData(json.data);
                    setMode(json.mode);
                }
            } else {
                setError(json.error ?? "Failed to generate digest.");
            }
        } catch {
            setError("Connection error. Please try again.");
        }
        setIsLoading(false);
    };

    const copy = () => {
        navigator.clipboard.writeText(digest);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="space-y-5">
            {/* Intro */}
            <div className="rounded-xl p-5"
                style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(92,10,10,0.04) 100%)", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, var(--gold-light), var(--gold))" }}>
                        <FileText size={22} color="var(--maroon-dark)" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-base mb-1" style={{ color: "var(--maroon)" }}>
                            Daily Business Digest
                        </h3>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            One click generates a complete end-of-day summary — sales, payments, inventory alerts, and metal rates — ready to copy and share on WhatsApp.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <button onClick={generate} disabled={isLoading} className="btn btn-primary btn-lg">
                        {isLoading
                            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
                            : <><Sparkles size={16} /> Generate Today's Digest</>
                        }
                    </button>
                    {digest && (
                        <button onClick={generate} disabled={isLoading} className="btn btn-ghost"
                            style={{ height: 42 }}>
                            <RefreshCw size={14} /> Regenerate
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="text-sm px-4 py-3 rounded-lg flex items-center gap-2"
                    style={{ background: "var(--danger-bg)", border: "1px solid rgba(196,43,43,0.2)", color: "var(--danger)" }}>
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {/* Stat cards shown while loading or after generation */}
            {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={<TrendingUp size={16} />} label="Today's Sales"
                        value={`PKR ${data.todaySales.total.toLocaleString()}`}
                        sub={`${data.todaySales.count} invoice${data.todaySales.count !== 1 ? "s" : ""}`}
                        tone="success" />
                    <StatCard icon={<Banknote size={16} />} label="Collected Today"
                        value={`PKR ${data.todayPayments.total.toLocaleString()}`}
                        sub={`${data.todayPayments.count} transaction${data.todayPayments.count !== 1 ? "s" : ""}`}
                        tone="info" />
                    <StatCard icon={<Package size={16} />} label="Low Stock"
                        value={String(data.inventory.lowStock)}
                        sub={`of ${data.inventory.available} available`}
                        tone={data.inventory.lowStock > 0 ? "warning" : "success"} />
                    <StatCard icon={<AlertTriangle size={16} />} label="Overdue"
                        value={String(data.overduePayments)}
                        sub="payments pending"
                        tone={data.overduePayments > 0 ? "danger" : "success"} />
                </div>
            )}

            {/* Digest text */}
            {digest && (
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <FileText size={14} style={{ color: "var(--gold-dark)" }} />
                            <h3>Summary</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`badge ${mode !== "offline" ? "badge-finalized" : "badge-draft"}`}>
                                <Sparkles size={9} />
                                {mode === "puter" ? `Puter.js` : mode === "online" ? "AI Written" : "Auto-Generated"}
                            </span>
                            <button onClick={copy} className="btn btn-ghost"
                                style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}>
                                {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                            </button>
                        </div>
                    </div>
                    <div className="card-body">
                        <pre className="text-sm leading-relaxed whitespace-pre-wrap"
                            style={{
                                fontFamily: "var(--font-sans)", color: "var(--text-primary)",
                                background: "var(--cream-light)", padding: "16px", borderRadius: 10,
                                border: "1px solid var(--border)", margin: 0,
                            }}>
                            {digest}
                        </pre>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function StatCard({ icon, label, value, sub, tone }: {
    icon: React.ReactNode; label: string; value: string; sub: string;
    tone: "success" | "warning" | "danger" | "info";
}) {
    const t = {
        success: { bg: "var(--success-bg)", border: "rgba(30,124,74,0.2)", color: "var(--success)", iconBg: "rgba(30,124,74,0.1)" },
        warning: { bg: "var(--warning-bg)", border: "rgba(217,119,6,0.2)", color: "var(--warning)", iconBg: "rgba(217,119,6,0.1)" },
        danger: { bg: "var(--danger-bg)", border: "rgba(196,43,43,0.2)", color: "var(--danger)", iconBg: "rgba(196,43,43,0.1)" },
        info: { bg: "var(--info-bg)", border: "rgba(29,95,173,0.2)", color: "var(--info)", iconBg: "rgba(29,95,173,0.1)" },
    }[tone];

    return (
        <div className="rounded-xl p-4 space-y-2" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.iconBg, color: t.color }}>{icon}</div>
            <div className="font-bold text-lg leading-none" style={{ color: t.color }}>{value}</div>
            <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{label}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div>
        </div>
    );
}
