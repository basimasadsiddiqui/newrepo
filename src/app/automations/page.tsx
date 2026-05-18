"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Mic, SearchCheck, Sparkles, Settings as SettingsIcon, Wifi, WifiOff,
    KeyRound, FileText, MessageSquareQuote, TrendingUp, ChevronRight, Bot, Volume2, FilePlus,
} from "lucide-react";
import VoiceAssistant from "@/components/automations/VoiceAssistant";
import ImageSearch from "@/components/automations/ImageSearch";
import SettingsPanel from "@/components/automations/SettingsPanel";
import DailyDigest from "@/components/automations/DailyDigest";
import SmartReminders from "@/components/automations/SmartReminders";
import BusinessInsights from "@/components/automations/BusinessInsights";
import AgentsHub from "@/components/automations/AgentsHub";
import TTSSettings from "@/components/automations/TTSSettings";
import VoiceInvoice from "@/components/automations/VoiceInvoice";

type SectionId = "settings" | "voice" | "image" | "digest" | "reminders" | "insights" | "agents" | "tts" | "voice-invoice";

interface HealthStatus {
    internet: boolean;
    apiKeyConfigured: boolean;
    mode: "online" | "offline" | "puter_llm";
}

interface Section {
    id: SectionId;
    label: string;
    icon: React.ReactNode;
    desc: string;
    aiBoosted: boolean;
}

const SECTIONS: Section[] = [
    {
        id: "settings",
        label: "Settings",
        icon: <SettingsIcon size={16} />,
        desc: "Configure API keys & check connectivity",
        aiBoosted: false,
    },
    {
        id: "voice",
        label: "Voice Assistant",
        icon: <Mic size={16} />,
        desc: "Ask anything about your business — by voice or text",
        aiBoosted: true,
    },
    {
        id: "image",
        label: "Insta Search",
        icon: <SearchCheck size={16} />,
        desc: "Find inventory items from a customer's photo",
        aiBoosted: true,
    },
    {
        id: "digest",
        label: "Daily Digest",
        icon: <FileText size={16} />,
        desc: "Instant end-of-day summary, ready to share",
        aiBoosted: true,
    },
    {
        id: "reminders",
        label: "Smart Reminders",
        icon: <MessageSquareQuote size={16} />,
        desc: "Auto-draft polite WhatsApp reminders for overdue payments",
        aiBoosted: true,
    },
    {
        id: "insights",
        label: "Business Insights",
        icon: <TrendingUp size={16} />,
        desc: "Top customers, slow stock & sales trends",
        aiBoosted: false,
    },
    {
        id: "agents",
        label: "AI Agents",
        icon: <Bot size={16} />,
        desc: "Agents that act — Urdu + English, live DB tools",
        aiBoosted: true,
    },
    {
        id: "voice-invoice",
        label: "Voice Invoice",
        icon: <FilePlus size={16} />,
        desc: "Speak invoice details — auto-fills and creates draft",
        aiBoosted: true,
    },
    {
        id: "tts",
        label: "Voice Output",
        icon: <Volume2 size={16} />,
        desc: "Text-to-speech — ElevenLabs, OpenAI or browser voices",
        aiBoosted: false,
    },
];

export default function AutomationsPage() {
    const [activeSection, setActiveSection] = useState<SectionId>("settings");
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [puterModel, setPuterModel] = useState<string | null>(null);
    const [browserOnline, setBrowserOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
    const [healthLoaded, setHealthLoaded] = useState(false);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch("/api/automations/health");
            const data = await res.json();
            setHealth({
                internet: data.internet,
                apiKeyConfigured: data.apiKeyConfigured,
                mode: data.mode,
            });
            // puterModel is now included directly in the health response
            setPuterModel(data.puterModel ?? null);
        } catch { /* ignore */ }
        setHealthLoaded(true);
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000);
        const handleOnline = () => { setBrowserOnline(true); fetchHealth(); };
        const handleOffline = () => setBrowserOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            clearInterval(interval);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [fetchHealth]);

    const aiActive = (health?.mode ?? "offline") === "online" || (health?.mode ?? "") === "puter_llm";
    const isPuterMode = (health?.mode ?? "") === "puter_llm";
    const internetReachable = browserOnline && (health?.internet ?? false);
    const activeSectionData = SECTIONS.find((s) => s.id === activeSection)!;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 100%)" }}>
                            <Sparkles size={18} color="var(--maroon-dark)" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold" style={{ color: "var(--maroon)" }}>
                                Automations
                            </h1>
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                AI-powered tools that make daily work feel magical
                            </p>
                        </div>
                    </div>
                </div>

                {healthLoaded && (
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                            icon={internetReachable ? <Wifi size={11} /> : <WifiOff size={11} />}
                            label={internetReachable ? "Online" : browserOnline ? "Limited" : "Offline"}
                            tone={internetReachable ? "success" : "danger"}
                        />
                        <StatusPill
                            icon={<KeyRound size={11} />}
                            label={health?.apiKeyConfigured ? "Key Set" : "No Key"}
                            tone={health?.apiKeyConfigured ? "success" : "warning"}
                        />
                        <StatusPill
                            icon={<Sparkles size={11} />}
                            label={isPuterMode ? "Puter.js Free AI" : aiActive ? "AI Active" : "Offline Mode"}
                            tone={aiActive ? "success" : "warning"}
                        />
                    </div>
                )}
            </div>

            {/* Layout: sidebar + content */}
            <div className="flex flex-col lg:flex-row gap-5" style={{ minHeight: "calc(100vh - 180px)" }}>
                {/* Left: section navigation */}
                <aside
                    className="lg:w-72 shrink-0 rounded-xl overflow-hidden"
                    style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                >
                    <div className="px-4 py-3 border-b flex items-center justify-between"
                        style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, rgba(92,10,10,0.03), rgba(201,168,76,0.02))" }}>
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--maroon)" }}>
                            Available Automations
                        </h3>
                        <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                            {SECTIONS.length}
                        </span>
                    </div>

                    <div className="p-2">
                        {SECTIONS.map((section) => {
                            const isActive = activeSection === section.id;
                            const showAiBadge = section.aiBoosted && healthLoaded;

                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all mb-1"
                                    style={{
                                        background: isActive ? "rgba(201,168,76,0.12)" : "transparent",
                                        border: `1px solid ${isActive ? "rgba(201,168,76,0.3)" : "transparent"}`,
                                        color: isActive ? "var(--maroon-dark)" : "var(--text-secondary)",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = "var(--cream-light)";
                                            e.currentTarget.style.color = "var(--text-primary)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "var(--text-secondary)";
                                        }
                                    }}
                                >
                                    <span style={{
                                        color: isActive ? "var(--gold-dark)" : "var(--text-muted)",
                                        display: "flex",
                                        flexShrink: 0,
                                    }}>
                                        {section.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm flex items-center gap-2">
                                            <span className="truncate">{section.label}</span>
                                            {showAiBadge && (
                                                <span style={{
                                                    width: 6, height: 6, borderRadius: "50%",
                                                    background: aiActive ? "var(--success)" : "var(--warning)",
                                                    flexShrink: 0,
                                                }} />
                                            )}
                                        </div>
                                        <div className="text-xs leading-tight mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                                            {section.desc}
                                        </div>
                                    </div>
                                    {isActive && <ChevronRight size={14} style={{ color: "var(--gold-dark)" }} />}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Right: section content */}
                <main
                    className="flex-1 rounded-xl overflow-hidden flex flex-col min-w-0"
                    style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                >
                    {/* Section header */}
                    <div
                        className="px-5 py-4 border-b flex items-center justify-between gap-3"
                        style={{
                            borderColor: "var(--border)",
                            background: "linear-gradient(135deg, rgba(92,10,10,0.025), rgba(201,168,76,0.02))",
                        }}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.25)", color: "var(--gold-dark)" }}>
                                {activeSectionData.icon}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold truncate" style={{ color: "var(--maroon)" }}>
                                    {activeSectionData.label}
                                </h2>
                                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                    {activeSectionData.desc}
                                </p>
                            </div>
                        </div>

                        {activeSectionData.aiBoosted && healthLoaded && (
                            <span className={`badge ${aiActive ? "badge-finalized" : "badge-draft"}`}>
                                <Sparkles size={10} />
                                {aiActive ? "AI Powered" : "Offline Mode"}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 p-5 overflow-y-auto">
                        {!healthLoaded ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--text-muted)" }}>
                                <span className="w-2 h-2 rounded-full" style={{ background: "var(--gold)", animation: "pulse 1s ease-in-out infinite" }} />
                                <span className="text-sm">Detecting connectivity...</span>
                            </div>
                        ) : activeSection === "settings" ? (
                            <SettingsPanel onStatusChange={(s) => setHealth(s)} />
                        ) : activeSection === "voice" ? (
                            <VoiceAssistant isOnline={aiActive} puterModel={puterModel} />
                        ) : activeSection === "image" ? (
                            <ImageSearch isOnline={aiActive} puterModel={puterModel} />
                        ) : activeSection === "digest" ? (
                            <DailyDigest isOnline={aiActive} puterModel={puterModel} />
                        ) : activeSection === "reminders" ? (
                            <SmartReminders isOnline={aiActive} puterModel={puterModel} />
                        ) : activeSection === "insights" ? (
                            <BusinessInsights />
                        ) : activeSection === "agents" ? (
                            <AgentsHub isOnline={aiActive} puterModel={puterModel} />
                        ) : activeSection === "voice-invoice" ? (
                            <VoiceInvoice isOnline={aiActive} puterModel={puterModel} />
                        ) : (
                            <TTSSettings />
                        )}
                    </div>
                </main>
            </div>

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
            `}</style>
        </div>
    );
}

function StatusPill({ icon, label, tone }: {
    icon: React.ReactNode;
    label: string;
    tone: "success" | "warning" | "danger";
}) {
    const styles = {
        success: { bg: "var(--success-bg)", color: "var(--success)", border: "rgba(30,124,74,0.25)" },
        warning: { bg: "var(--warning-bg)", color: "var(--warning)", border: "rgba(217,119,6,0.25)" },
        danger: { bg: "var(--danger-bg)", color: "var(--danger)", border: "rgba(196,43,43,0.25)" },
    }[tone];

    return (
        <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{ background: styles.bg, color: styles.color, border: `1px solid ${styles.border}` }}
        >
            {icon}
            {label}
        </div>
    );
}
