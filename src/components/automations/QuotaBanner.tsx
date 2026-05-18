"use client";

import { AlertTriangle, ExternalLink, Settings, RefreshCw } from "lucide-react";

interface Props {
    providerName: string;
    quotaKind: "quota" | "rate_limit" | "overloaded";
    message: string;
    creditLink: string | null;
    onDismiss?: () => void;
    onRetry?: () => void;
}

const KIND_CONFIG = {
    quota: {
        title: "Credits / Quota Exhausted",
        titleUrdu: "کریڈٹ ختم ہو گئے",
        color: "var(--danger)",
        bg: "var(--danger-bg)",
        border: "rgba(196,43,43,0.25)",
        icon: "💳",
    },
    rate_limit: {
        title: "Rate Limit Hit",
        titleUrdu: "حد سے زیادہ درخواستیں",
        color: "var(--warning)",
        bg: "var(--warning-bg)",
        border: "rgba(217,119,6,0.25)",
        icon: "⏳",
    },
    overloaded: {
        title: "Server Overloaded",
        titleUrdu: "سرور مصروف ہے",
        color: "var(--info)",
        bg: "var(--info-bg)",
        border: "rgba(29,95,173,0.25)",
        icon: "🔄",
    },
};

export default function QuotaBanner({ providerName, quotaKind, message, creditLink, onDismiss, onRetry }: Props) {
    const cfg = KIND_CONFIG[quotaKind];

    return (
        <div className="rounded-xl p-4 space-y-3"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            {/* Header */}
            <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{cfg.icon}</span>
                <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: cfg.color }}>
                        {cfg.title}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: cfg.color, opacity: 0.8, fontFamily: "serif" }}>
                        {cfg.titleUrdu}
                    </div>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss}
                        style={{ background: "none", border: "none", cursor: "pointer", color: cfg.color, opacity: 0.6, fontSize: "1rem", lineHeight: 1, padding: 2 }}>
                        ×
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="text-sm space-y-1" style={{ color: cfg.color }}>
                <div><strong>{providerName}</strong> — {message}</div>

                {quotaKind === "quota" && (
                    <div className="text-xs" style={{ opacity: 0.75 }}>
                        آپ کے {providerName} کے credits ختم ہو گئے ہیں۔ نیچے دیے گئے لنک سے credits خریدیں یا Settings میں جا کر دوسرا provider منتخب کریں۔
                    </div>
                )}
                {quotaKind === "rate_limit" && (
                    <div className="text-xs" style={{ opacity: 0.75 }}>
                        بہت زیادہ requests بھیجی گئیں۔ چند منٹ بعد دوبارہ کوشش کریں۔
                    </div>
                )}
                {quotaKind === "overloaded" && (
                    <div className="text-xs" style={{ opacity: 0.75 }}>
                        AI server ابھی مصروف ہے۔ چند سیکنڈ انتظار کریں۔
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
                {creditLink && quotaKind === "quota" && (
                    <a href={creditLink} target="_blank" rel="noopener noreferrer"
                        className="btn"
                        style={{
                            height: 32, fontSize: "0.75rem", background: cfg.color, color: "white",
                            border: "none", gap: 6,
                        }}>
                        <ExternalLink size={12} />
                        Add Credits — {providerName}
                    </a>
                )}
                {onRetry && (quotaKind === "rate_limit" || quotaKind === "overloaded") && (
                    <button onClick={onRetry} className="btn btn-ghost" style={{ height: 32, fontSize: "0.75rem" }}>
                        <RefreshCw size={12} /> Retry
                    </button>
                )}
                <a href="/automations" className="btn btn-ghost" style={{ height: 32, fontSize: "0.75rem" }}>
                    <Settings size={12} /> Switch Provider
                </a>
            </div>
        </div>
    );
}
