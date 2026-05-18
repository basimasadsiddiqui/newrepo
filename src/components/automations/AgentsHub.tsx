"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import AgentChat from "@/components/automations/AgentChat";

interface AgentDef {
    id: string;
    name: string;
    nameUrdu: string;
    description: string;
    descUrdu: string;
    icon: string;
    tools: number;
    examples: string[];
}

interface Props {
    isOnline: boolean;
    puterModel?: string | null;
}

export default function AgentsHub({ isOnline, puterModel }: Props) {
    const [agents, setAgents] = useState<AgentDef[]>([]);
    const [activeAgent, setActiveAgent] = useState<AgentDef | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/automations/agent")
            .then((r) => r.json())
            .then((d) => { if (d.agents) setAgents(d.agents); })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
            <p className="text-sm">Loading agents...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // Active agent — full chat view
    if (activeAgent) {
        return (
            <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
                <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <button onClick={() => setActiveAgent(null)} className="btn btn-ghost btn-icon"
                        style={{ width: 32, height: 32, minWidth: 32, padding: 0 }}>
                        <ArrowLeft size={16} />
                    </button>
                    <span className="text-xl">{activeAgent.icon}</span>
                    <div>
                        <h3 className="font-bold text-sm" style={{ color: "var(--maroon)" }}>{activeAgent.name}</h3>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {activeAgent.tools} tools · Urdu + English
                        </p>
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <AgentChat
                        agentId={activeAgent.id}
                        agentDef={activeAgent}
                        examples={activeAgent.examples}
                        isOnline={isOnline || !!puterModel}
                        puterModel={puterModel}
                    />
                </div>
            </div>
        );
    }

    // Agent selection grid
    return (
        <div className="space-y-5">
            {/* Intro */}
            <div className="rounded-xl p-5 space-y-2"
                style={{ background: "linear-gradient(135deg, rgba(92,10,10,0.03), rgba(201,168,76,0.06))", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div className="flex items-start gap-3">
                    <span className="text-3xl">🤖</span>
                    <div>
                        <h3 className="font-bold text-base" style={{ color: "var(--maroon)" }}>
                            ERP Agents — اردو اور انگریزی میں
                        </h3>
                        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                            These agents can <strong>take actions</strong> in your ERP — not just answer questions.
                            They call live database tools, understand Urdu, and show you exactly what they did.
                        </p>
                    </div>
                </div>

                {!isOnline && (
                    <div className="flex items-center gap-2 mt-3 p-3 rounded-lg text-sm"
                        style={{ background: "var(--warning-bg)", border: "1px solid rgba(217,119,6,0.2)", color: "var(--warning)" }}>
                        ⚠️ No AI provider configured. Add a key in Settings to activate agents.
                    </div>
                )}
            </div>

            {/* Capability badges */}
            <div className="flex flex-wrap gap-2">
                {["Urdu + English", "Live DB queries", "Tool calling", "Multi-step reasoning", "Confirmation for writes"].map((cap) => (
                    <span key={cap} className="badge badge-info">{cap}</span>
                ))}
            </div>

            {/* Agent cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agents.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => setActiveAgent(agent)}
                        disabled={!isOnline && !puterModel}
                        className="text-left rounded-xl p-5 space-y-3 transition-all"
                        style={{
                            background: "white",
                            border: "1px solid var(--border)",
                            boxShadow: "var(--shadow-sm)",
                            cursor: isOnline ? "pointer" : "not-allowed",
                            opacity: isOnline ? 1 : 0.5,
                        }}
                        onMouseEnter={(e) => { if (isOnline) { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
                    >
                        {/* Icon + name */}
                        <div className="flex items-start gap-3">
                            <span className="text-3xl">{agent.icon}</span>
                            <div>
                                <div className="font-bold text-base" style={{ color: "var(--maroon)" }}>
                                    {agent.name}
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "serif" }}>
                                    {agent.nameUrdu}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            {agent.description}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)", direction: "rtl", textAlign: "right" }}>
                            {agent.descUrdu}
                        </p>

                        {/* Tool count */}
                        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                                {agent.tools} tools
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: "rgba(201,168,76,0.12)", color: "var(--gold-dark)" }}>
                                Open →
                            </span>
                        </div>

                        {/* Sample prompts */}
                        <div className="space-y-1">
                            {agent.examples.slice(0, 2).map((ex) => (
                                <div key={ex} className="text-xs px-2 py-1 rounded"
                                    style={{
                                        background: "var(--cream-light)", color: "var(--text-muted)",
                                        direction: /[؀-ۿ]/.test(ex) ? "rtl" : "ltr",
                                    }}>
                                    "{ex}"
                                </div>
                            ))}
                        </div>
                    </button>
                ))}
            </div>

            {/* How it works */}
            <div className="card">
                <div className="card-header">
                    <h3>How Agents Work</h3>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { step: "1", title: "You ask", desc: "In English or Urdu — type or speak", icon: "💬" },
                            { step: "2", title: "Agent plans", desc: "AI decides which ERP tools to call", icon: "🧠" },
                            { step: "3", title: "Tools run", desc: "Live DB queries execute in real-time", icon: "⚙️" },
                            { step: "4", title: "You get answer", desc: "In your language, with live data", icon: "✅" },
                        ].map((s) => (
                            <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg"
                                style={{ background: "var(--cream-light)", border: "1px solid var(--border)" }}>
                                <span className="text-2xl">{s.icon}</span>
                                <div>
                                    <div className="font-bold text-sm" style={{ color: "var(--maroon)" }}>
                                        {s.step}. {s.title}
                                    </div>
                                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
