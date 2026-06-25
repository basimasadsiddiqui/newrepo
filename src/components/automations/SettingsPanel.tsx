"use client";

import { useState, useEffect, useCallback } from "react";
import {
    KeyRound, CheckCircle2, XCircle, Loader2, Save, Trash2,
    Eye, EyeOff, Wifi, WifiOff, Sparkles, ExternalLink, RefreshCw,
    Star, ChevronDown, ChevronUp, AlertTriangle, Cpu,
} from "lucide-react";

type ProviderId = "anthropic" | "openai" | "deepseek" | "google" | "mistral" | "github" | "puter_llm";

interface ProviderInfo {
    id: ProviderId;
    name: string;
    description: string;
    keyHint: string;
    supportsVision: boolean;
    docsUrl: string;
}

interface GitHubModel {
    id: string;
    label: string;
    provider: string;
    supportsVision: boolean;
    description: string;
}

interface ConfiguredEntry {
    preview: string;
    addedAt: string;
    isActive: boolean;
    selectedModel?: string;
}

interface SettingsState {
    activeProvider: ProviderId;
    configured: Partial<Record<ProviderId, ConfiguredEntry>>;
    providers: Record<ProviderId, ProviderInfo>;
    githubModels: GitHubModel[];
}

type AIMode = "online" | "offline" | "puter_llm";

interface HealthState {
    internet: boolean;
    apiKeyConfigured: boolean;
    mode: AIMode;
    activeProviderName: string | null;
    configuredProviders: string[];
}

interface Props {
    onStatusChange?: (s: { internet: boolean; apiKeyConfigured: boolean; mode: AIMode }) => void;
}

const PROVIDER_ICONS: Record<string, string> = {
    anthropic: "🤖",
    openai: "💬",
    deepseek: "🔍",
    google: "✨",
    mistral: "🌊",
    github: "🐙",
    puter_llm: "⚡",
};

// Popular Puter.js LLM models (browser-side, free)
const PUTER_LLM_MODELS = [
    { id: "gpt-5-nano",            label: "GPT-5 Nano",          desc: "Fastest, great for most tasks" },
    { id: "gpt-5-mini",            label: "GPT-5 Mini",          desc: "Balanced quality & speed" },
    { id: "gpt-5",                 label: "GPT-5",               desc: "Best quality, logic-heavy" },
    { id: "claude-sonnet-4-5",     label: "Claude Sonnet 4.5",   desc: "Excellent reasoning, Urdu support" },
    { id: "claude-haiku-4-5",      label: "Claude Haiku 4.5",    desc: "Fast Claude, cost-efficient" },
    { id: "deepseek/deepseek-r1",  label: "DeepSeek R1",         desc: "Step-by-step reasoning" },
    { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash",  desc: "Google's fast model" },
    { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", desc: "Open-source, very capable" },
    { id: "grok-3-mini",           label: "Grok 3 Mini",         desc: "xAI's fast model" },
];

export default function SettingsPanel({ onStatusChange }: Props) {
    const [settings, setSettings] = useState<SettingsState | null>(null);
    const [health, setHealth] = useState<HealthState | null>(null);
    const [browserOnline, setBrowserOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    const [expanded, setExpanded] = useState<ProviderId | null>(null);
    const [keyInputs, setKeyInputs] = useState<Partial<Record<ProviderId, string>>>({});
    const [showKey, setShowKey] = useState<Partial<Record<ProviderId, boolean>>>({});
    const [saving, setSaving] = useState<ProviderId | null>(null);
    const [removing, setRemoving] = useState<ProviderId | null>(null);
    const [setting, setSetting] = useState<ProviderId | null>(null);
    const [settingModel, setSettingModel] = useState(false);
    const [msgs, setMsgs] = useState<Partial<Record<ProviderId, { type: "success" | "error" | "info"; text: string }>>>({});

    const setMsg = (pid: ProviderId, msg: { type: "success" | "error" | "info"; text: string } | null) => {
        setMsgs((prev) => ({ ...prev, [pid]: msg ?? undefined }));
        if (msg) setTimeout(() => setMsgs((prev) => { const n = { ...prev }; delete n[pid]; return n; }), 7000);
    };

    const refreshHealth = useCallback(async () => {
        setIsCheckingHealth(true);
        try {
            const res = await fetch("/api/automations/health");
            const data = await res.json();
            setHealth(data);
            onStatusChange?.({ internet: data.internet, apiKeyConfigured: data.apiKeyConfigured, mode: data.mode });
        } catch { /* ignore */ }
        setIsCheckingHealth(false);
    }, [onStatusChange]);

    const refreshSettings = useCallback(async () => {
        try {
            const res = await fetch("/api/automations/settings");
            const data = await res.json();
            if (data.success) setSettings(data as SettingsState);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        refreshHealth();
        refreshSettings();
        const interval = setInterval(refreshHealth, 30000);
        const handleOnline = () => { setBrowserOnline(true); refreshHealth(); };
        const handleOffline = () => setBrowserOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            clearInterval(interval);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [refreshHealth, refreshSettings]);

    const saveKey = async (pid: ProviderId) => {
        const key = keyInputs[pid]?.trim();
        if (!key) return;
        setSaving(pid);
        setMsg(pid, { type: "info", text: `Validating with ${settings?.providers[pid]?.name ?? pid}... (may take a few seconds)` });
        try {
            const res = await fetch("/api/automations/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ providerId: pid, apiKey: key }),
            });
            const data = await res.json();
            if (data.success) {
                setSettings(data as SettingsState);
                setKeyInputs((prev) => { const n = { ...prev }; delete n[pid]; return n; });
                if (data.quotaWarning) {
                    setMsg(pid, {
                        type: "info",
                        text: "Key saved ✓ — but your free tier quota is currently exhausted. The key will work once your quota resets (usually within a minute or the next day).",
                    });
                } else {
                    setMsg(pid, { type: "success", text: "Key saved and validated ✓" });
                }
                await refreshHealth();
            } else {
                setMsg(pid, { type: "error", text: data.error ?? "Failed to save." });
            }
        } catch {
            setMsg(pid, { type: "error", text: "Connection error." });
        }
        setSaving(null);
    };

    const removeKey = async (pid: ProviderId) => {
        if (!confirm(`Remove the ${settings?.providers[pid]?.name} key?`)) return;
        setRemoving(pid);
        try {
            const res = await fetch(`/api/automations/settings?provider=${pid}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) { setSettings(data as SettingsState); await refreshHealth(); }
        } catch { /* ignore */ }
        setRemoving(null);
    };

    const setActive = async (pid: ProviderId) => {
        setSetting(pid);
        try {
            const res = await fetch("/api/automations/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activeProvider: pid }),
            });
            const data = await res.json();
            if (data.success) { setSettings(data as SettingsState); await refreshHealth(); }
        } catch { /* ignore */ }
        setSetting(null);
    };

    const selectGithubModel = async (modelId: string) => {
        setSettingModel(true);
        try {
            const res = await fetch("/api/automations/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ providerId: "github", modelId }),
            });
            const data = await res.json();
            if (data.success) setSettings(data as SettingsState);
        } catch { /* ignore */ }
        setSettingModel(false);
    };

    const internetOk = browserOnline && (health?.internet ?? false);
    // Puter.js runs the model in-browser, so it is "AI active" even though mode !== "online".
    const aiActive = health?.mode === "online" || health?.mode === "puter_llm";
    const providerIds: ProviderId[] = settings?.providers
        ? (Object.keys(settings.providers) as ProviderId[])
        : ["anthropic", "openai", "deepseek", "google", "mistral", "github"];

    return (
        <div className="space-y-6">
            {/* Status row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusCard
                    icon={internetOk ? <Wifi size={18} /> : <WifiOff size={18} />}
                    label="Internet"
                    value={internetOk ? "Connected" : browserOnline ? "Limited" : "Offline"}
                    tone={internetOk ? "success" : "danger"}
                />
                <StatusCard
                    icon={<KeyRound size={18} />}
                    label="API Keys"
                    value={`${health?.configuredProviders?.length ?? 0} provider${(health?.configuredProviders?.length ?? 0) !== 1 ? "s" : ""} configured`}
                    tone={(health?.configuredProviders?.length ?? 0) > 0 ? "success" : "warning"}
                    sub={health?.configuredProviders?.length ? health.configuredProviders.join(" · ") : "Add a key below"}
                />
                <StatusCard
                    icon={<Sparkles size={18} />}
                    label="Active AI"
                    value={aiActive ? (health?.activeProviderName ?? "AI Active") : "Offline Mode"}
                    tone={aiActive ? "success" : "warning"}
                    sub={aiActive ? "All automations use this model" : "Rule-based fallback active"}
                />
            </div>

            {/* ── Puter.js Free AI — special no-key card ────────────── */}
            <PuterLLMCard
                isActive={settings?.activeProvider === "puter_llm"}
                selectedModel={settings?.configured?.["puter_llm"]?.selectedModel ?? "gpt-5-nano"}
                onActivate={async (model) => {
                    const res = await fetch("/api/automations/settings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ activeProvider: "puter_llm", puterModel: model }),
                    });
                    const d = await res.json();
                    if (d.success) { setSettings(d as SettingsState); await refreshHealth(); }
                }}
                onDeactivate={async () => {
                    const res = await fetch("/api/automations/settings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ activeProvider: "anthropic" }),
                    });
                    const d = await res.json();
                    if (d.success) { setSettings(d as SettingsState); await refreshHealth(); }
                }}
            />

            {/* Provider cards */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        API Key Providers
                    </h3>
                    <button onClick={refreshHealth} disabled={isCheckingHealth}
                        className="btn btn-ghost" style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}>
                        <RefreshCw size={12} style={{ animation: isCheckingHealth ? "spin 1s linear infinite" : "none" }} />
                        Recheck
                    </button>
                </div>

                {providerIds.map((pid) => {
                    const pInfo = settings?.providers?.[pid];
                    const configured = settings?.configured?.[pid];
                    const isActive = settings?.activeProvider === pid;
                    const isExpanded = expanded === pid;
                    const keyVal = keyInputs[pid] ?? "";
                    const msg = msgs[pid];
                    const isGithub = pid === "github";

                    // resolve display model label
                    const activeModelId = configured?.selectedModel ?? settings?.githubModels?.[0]?.id;
                    const activeModel = isGithub
                        ? settings?.githubModels?.find((m) => m.id === activeModelId)
                        : null;

                    return (
                        <div key={pid} className="rounded-xl overflow-hidden transition-all"
                            style={{
                                border: `1px solid ${isActive ? "rgba(201,168,76,0.45)" : "var(--border)"}`,
                                background: isActive ? "rgba(201,168,76,0.04)" : "white",
                                boxShadow: isActive ? "0 0 0 1px rgba(201,168,76,0.15), var(--shadow-sm)" : "var(--shadow-xs)",
                            }}>
                            {/* Header row */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="text-2xl w-9 text-center shrink-0 select-none">
                                    {PROVIDER_ICONS[pid] ?? "🔧"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                            {pInfo?.name ?? pid}
                                        </span>
                                        {isActive && (
                                            <span className="badge badge-gold flex items-center gap-1">
                                                <Star size={9} fill="currentColor" /> Active
                                            </span>
                                        )}
                                        {configured && !isActive && (
                                            <span className="badge badge-finalized">Configured</span>
                                        )}
                                        {!configured && (
                                            <span className="badge" style={{ background: "var(--cream-light)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                                                Not set
                                            </span>
                                        )}
                                        {!pInfo?.supportsVision && !isGithub && (
                                            <span className="badge badge-draft" title="Text only">No vision</span>
                                        )}
                                    </div>
                                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                                        {isGithub && activeModel
                                            ? `Using: ${activeModel.label} · ${activeModel.provider}`
                                            : pInfo?.description ?? ""}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {configured && !isActive && (
                                        <button onClick={() => setActive(pid)} disabled={!!setting}
                                            className="btn btn-secondary" style={{ height: 30, padding: "0 12px", fontSize: "0.75rem" }}>
                                            {setting === pid
                                                ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                                                : <><Star size={11} /> Set Active</>
                                            }
                                        </button>
                                    )}
                                    <button onClick={() => setExpanded(isExpanded ? null : pid)}
                                        className="btn btn-ghost btn-icon"
                                        style={{ width: 28, height: 28, minWidth: 28, padding: 0 }}>
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded panel */}
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-2 border-t space-y-4" style={{ borderColor: "var(--border)" }}>

                                    {/* GitHub model selector */}
                                    {isGithub && configured && settings?.githubModels && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Cpu size={14} style={{ color: "var(--gold-dark)" }} />
                                                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                                                    Choose Model
                                                </label>
                                                {settingModel && <Loader2 size={12} style={{ animation: "spin 1s linear infinite", color: "var(--text-muted)" }} />}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {settings.githubModels.map((model) => {
                                                    const isSelected = (configured.selectedModel ?? settings.githubModels?.[0]?.id) === model.id;
                                                    return (
                                                        <button key={model.id}
                                                            onClick={() => selectGithubModel(model.id)}
                                                            disabled={settingModel}
                                                            className="text-left p-3 rounded-lg transition-all"
                                                            style={{
                                                                border: `1px solid ${isSelected ? "rgba(201,168,76,0.5)" : "var(--border)"}`,
                                                                background: isSelected ? "rgba(201,168,76,0.08)" : "var(--cream-light)",
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold text-xs truncate" style={{ color: isSelected ? "var(--maroon)" : "var(--text-primary)" }}>
                                                                        {model.label}
                                                                    </div>
                                                                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                                                        {model.provider}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                                    {isSelected && (
                                                                        <CheckCircle2 size={13} style={{ color: "var(--gold-dark)" }} />
                                                                    )}
                                                                    {model.supportsVision && (
                                                                        <span className="text-xs px-1 rounded" style={{ background: "var(--info-bg)", color: "var(--info)", fontSize: "0.55rem", fontWeight: 700 }}>
                                                                            VISION
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                                                {model.description}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Existing key display */}
                                    {configured && (
                                        <div className="flex items-center gap-3 p-3 rounded-lg"
                                            style={{ background: "var(--success-bg)", border: "1px solid rgba(30,124,74,0.2)" }}>
                                            <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                                    Key:{" "}
                                                    <code className="text-xs px-1 rounded"
                                                        style={{ background: "rgba(30,124,74,0.1)", color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                                                        {configured.preview}
                                                    </code>
                                                </span>
                                                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                                    {configured.addedAt === "via .env" ? "Loaded from .env file" : `Added ${new Date(configured.addedAt).toLocaleDateString()}`}
                                                </p>
                                            </div>
                                            {configured.addedAt !== "via .env" && (
                                                <button onClick={() => removeKey(pid)} disabled={removing === pid}
                                                    className="btn btn-danger shrink-0" style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}>
                                                    {removing === pid
                                                        ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                                                        : <><Trash2 size={11} /> Remove</>
                                                    }
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Key input */}
                                    <div>
                                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                                            {configured ? "Replace key:" : "Add API key:"}
                                            {isGithub && !configured && (
                                                <span className="ml-2 font-normal" style={{ color: "var(--text-muted)" }}>
                                                    — one PAT unlocks ALL models above
                                                </span>
                                            )}
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex items-center form-input p-0 overflow-hidden">
                                                <input
                                                    type={showKey[pid] ? "text" : "password"}
                                                    value={keyVal}
                                                    onChange={(e) => setKeyInputs((p) => ({ ...p, [pid]: e.target.value }))}
                                                    onKeyDown={(e) => { if (e.key === "Enter") saveKey(pid); }}
                                                    placeholder={pInfo?.keyHint ?? "Paste API key..."}
                                                    disabled={saving === pid}
                                                    style={{
                                                        flex: 1, border: "none", outline: "none", background: "transparent",
                                                        padding: "8px 12px", fontFamily: "var(--font-mono)",
                                                        fontSize: "0.8125rem", color: "var(--text-primary)",
                                                    }}
                                                />
                                                <button onClick={() => setShowKey((p) => ({ ...p, [pid]: !p[pid] }))}
                                                    tabIndex={-1} className="btn btn-ghost btn-icon"
                                                    style={{ width: 32, height: 32, minWidth: 32, borderRadius: 0, border: "none", borderLeft: "1px solid var(--border)" }}>
                                                    {showKey[pid] ? <EyeOff size={13} /> : <Eye size={13} />}
                                                </button>
                                            </div>
                                            <button onClick={() => saveKey(pid)} disabled={!keyVal || saving === pid}
                                                className="btn btn-primary" style={{ minWidth: 110 }}>
                                                {saving === pid
                                                    ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Testing...</>
                                                    : <><Save size={13} /> Save & Test</>
                                                }
                                            </button>
                                        </div>
                                    </div>

                                    <a href={pInfo?.docsUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs"
                                        style={{ color: "var(--gold-dark)" }}>
                                        <ExternalLink size={11} />
                                        {isGithub ? "Generate GitHub PAT (no special scopes needed)" : `Get key from ${pInfo?.name ?? pid}`}
                                    </a>

                                    {msg && (
                                        <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                                            style={{
                                                background: msg.type === "success" ? "var(--success-bg)" : msg.type === "error" ? "var(--danger-bg)" : "var(--info-bg)",
                                                border: `1px solid ${msg.type === "success" ? "rgba(30,124,74,0.2)" : msg.type === "error" ? "rgba(196,43,43,0.2)" : "rgba(29,95,173,0.2)"}`,
                                                color: msg.type === "success" ? "var(--success)" : msg.type === "error" ? "var(--danger)" : "var(--info)",
                                            }}>
                                            {msg.type === "success" ? <CheckCircle2 size={13} /> : msg.type === "error" ? <XCircle size={13} /> : <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                                            {msg.text}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* GitHub special callout */}
            <div className="rounded-xl p-4 space-y-2"
                style={{ background: "linear-gradient(135deg, rgba(36,41,47,0.04), rgba(201,168,76,0.04))", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">🐙</span>
                    <span className="font-bold text-sm" style={{ color: "var(--maroon)" }}>
                        GitHub Models — the smart choice
                    </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    One free GitHub account unlocks <strong>OpenAI GPT-4o, Meta Llama 4, Microsoft Phi-4, Mistral</strong> and more.
                    No billing required, generous free limits. Just generate a Personal Access Token with no special scopes.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                    {["GPT-4o Mini", "Llama 4 Scout", "Phi-4", "Mistral Small"].map((m) => (
                        <span key={m} className="badge badge-gold">{m}</span>
                    ))}
                    <span className="badge" style={{ background: "var(--cream-dark)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                        + more
                    </span>
                </div>
            </div>

            {/* Vision note */}
            <div className="flex items-start gap-2 p-3 rounded-lg text-xs"
                style={{ background: "var(--info-bg)", border: "1px solid rgba(29,95,173,0.15)", color: "var(--info)" }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                    <strong>Image Search (Insta Search)</strong> requires a vision-capable model.
                    GPT-4o Mini, GPT-4o, Llama 4 Scout, and Gemini Flash all support image analysis.
                    DeepSeek, Phi-4, and Mistral are text-only — image search falls back to filter mode when these are active.
                </span>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function StatusCard({ icon, label, value, tone, sub }: {
    icon: React.ReactNode; label: string; value: string;
    tone: "success" | "warning" | "danger"; sub?: string;
}) {
    const t = {
        success: { bg: "var(--success-bg)", border: "rgba(30,124,74,0.2)", color: "var(--success)", iconBg: "rgba(30,124,74,0.12)" },
        warning: { bg: "var(--warning-bg)", border: "rgba(217,119,6,0.2)", color: "var(--warning)", iconBg: "rgba(217,119,6,0.12)" },
        danger: { bg: "var(--danger-bg)", border: "rgba(196,43,43,0.2)", color: "var(--danger)", iconBg: "rgba(196,43,43,0.12)" },
    }[tone];

    return (
        <div className="rounded-xl p-4" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: t.iconBg, color: t.color }}>{icon}</div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {label}
                </span>
            </div>
            <div className="font-bold text-base mb-1" style={{ color: t.color }}>{value}</div>
            {sub && <div className="text-xs leading-snug" style={{ color: "var(--text-muted)" }}>{sub}</div>}
        </div>
    );
}

// ── Puter.js free AI card ─────────────────────────────────────────────────────

function PuterLLMCard({
    isActive, selectedModel, onActivate, onDeactivate,
}: {
    isActive: boolean;
    selectedModel: string;
    onActivate: (model: string) => Promise<void>;
    onDeactivate: () => Promise<void>;
}) {
    const [model, setModel] = useState(selectedModel);
    const [isSaving, setIsSaving] = useState(false);

    const activate = async () => {
        setIsSaving(true);
        await onActivate(model);
        setIsSaving(false);
    };

    const deactivate = async () => {
        setIsSaving(true);
        await onDeactivate();
        setIsSaving(false);
    };

    return (
        <div className="rounded-xl overflow-hidden"
            style={{
                border: `2px solid ${isActive ? "rgba(201,168,76,0.5)" : "var(--border)"}`,
                background: isActive ? "rgba(201,168,76,0.05)" : "white",
                boxShadow: isActive ? "var(--shadow-md)" : "var(--shadow-sm)",
                transition: "all 0.2s",
            }}>
            <div className="px-5 py-4 flex items-start gap-4">
                <span className="text-3xl shrink-0">⚡</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base" style={{ color: "var(--maroon)" }}>
                            Puter.js Free AI
                        </h3>
                        <span className="badge badge-finalized">Free · No API key · 400+ models</span>
                        {isActive && <span className="badge badge-gold">Active</span>}
                    </div>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        GPT-5, Claude, Gemini, DeepSeek, Llama — all free, unlimited, runs in your browser.
                        No sign-up, no billing, no key needed.
                    </p>

                    {/* Model selector */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex-1" style={{ minWidth: 200 }}>
                            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>
                                Model
                            </label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="form-select"
                                style={{ fontSize: "0.8125rem" }}>
                                {PUTER_LLM_MODELS.map((m) => (
                                    <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2 items-end" style={{ paddingBottom: 1 }}>
                            {isActive ? (
                                <>
                                    <button onClick={activate} disabled={isSaving || model === selectedModel}
                                        className="btn btn-secondary" style={{ height: 36 }}>
                                        {isSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                                        Change Model
                                    </button>
                                    <button onClick={deactivate} disabled={isSaving}
                                        className="btn btn-ghost" style={{ height: 36 }}>
                                        Deactivate
                                    </button>
                                </>
                            ) : (
                                <button onClick={activate} disabled={isSaving}
                                    className="btn btn-primary" style={{ height: 36, minWidth: 120 }}>
                                    {isSaving
                                        ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Activating...</>
                                        : "⚡ Activate Free AI"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
