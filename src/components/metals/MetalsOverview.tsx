"use client";

import Link from "next/link";
import { Gauge, Layers, Gem, Tag, Package, TrendingUp } from "lucide-react";

interface MetalsOverviewProps {
    metalTypeCount: number;
    categoryCount: number;
    activeRatesCount: number;
    premium: number;
    rates: any[];
}

const METAL_META: Record<string, { label: string; emoji: string; cardClass: string; unit: string }> = {
    XAU: { label: "Gold (24K)", emoji: "🥇", cardClass: "gold-card", unit: "tola" },
    XAG: { label: "Silver (999)", emoji: "🥈", cardClass: "silver-card", unit: "tola" },
    DIA: { label: "Diamond", emoji: "💎", cardClass: "diamond-card", unit: "carat" },
    XPT: { label: "Platinum", emoji: "⬜", cardClass: "platinum-card", unit: "gram" },
};

function rateDisplay(metal: string, ratePerGram: number): string {
    if (metal === "DIA") return ratePerGram.toLocaleString("en-PK", { minimumFractionDigits: 0 });
    const tola = ratePerGram < 100000 ? ratePerGram * 11.664 : ratePerGram;
    return "₨ " + Math.round(tola).toLocaleString("en-PK");
}

const QUICK_LINKS = [
    { href: "/metals/rates", icon: <Gem size={18} />, label: "Metal Rates", desc: "Edit Gold, Silver & Diamond rates" },
    { href: "/metals/types", icon: <Layers size={18} />, label: "Metal Types", desc: "Manage 24K, 22K, 18K, Silver etc." },
    { href: "/metals/categories", icon: <Tag size={18} />, label: "Categories", desc: "Rings, Bangles, Necklaces & more" },
    { href: "/inventory", icon: <Package size={18} />, label: "Inventory", desc: "View & manage stock items" },
];

export default function MetalsOverview({
    metalTypeCount,
    categoryCount,
    activeRatesCount,
    premium,
    rates,
}: MetalsOverviewProps) {
    const knownMetals = ["XAU", "XAG", "DIA"];

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
                <div className="stat-tile animate-stagger">
                    <div className="stat-tile-icon gold">
                        <Layers size={20} />
                    </div>
                    <div>
                        <div className="stat-tile-value">{metalTypeCount}</div>
                        <div className="stat-tile-label">Metal Types</div>
                    </div>
                </div>
                <div className="stat-tile">
                    <div className="stat-tile-icon maroon">
                        <Tag size={20} />
                    </div>
                    <div>
                        <div className="stat-tile-value">{categoryCount}</div>
                        <div className="stat-tile-label">Categories</div>
                    </div>
                </div>
                <div className="stat-tile">
                    <div className="stat-tile-icon silver">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className="stat-tile-value">{activeRatesCount}</div>
                        <div className="stat-tile-label">Active Rates</div>
                    </div>
                </div>
                <div className="stat-tile">
                    <div className="stat-tile-icon diamond">
                        <span style={{ fontSize: "1.125rem", fontWeight: 800 }}>%</span>
                    </div>
                    <div>
                        <div className="stat-tile-value">{premium > 0 ? `+${premium}` : premium}%</div>
                        <div className="stat-tile-label">Market Premium</div>
                    </div>
                </div>
            </div>

            {/* Live Metal Rate Cards */}
            <div className="card">
                <div className="card-header">
                    <h3>📊 Live Metal Rates</h3>
                    <Link href="/metals/rates" style={{
                        fontSize: "0.75rem",
                        color: "var(--maroon)",
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                    }}>
                        Manage rates →
                    </Link>
                </div>
                <div className="card-body" style={{ padding: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}
                         className="animate-stagger">
                        {knownMetals.map((code) => {
                            const meta = METAL_META[code];
                            const record = rates.find((r) => r.metal === code);
                            return (
                                <div key={code} className={`metal-rate-card ${meta.cardClass}`}>
                                    <div className="rate-label">{meta.emoji} {meta.label}</div>
                                    <div className="rate-value">
                                        {record ? rateDisplay(code, Number(record.ratePerGram)) : "—"}
                                    </div>
                                    <div className="rate-unit">per {meta.unit}</div>
                                    {record && (
                                        <div className="rate-updated">
                                            {record.source === "API" ? "🟢 Live API" : `✏️ Manual`} ·{" "}
                                            {new Date(record.lastUpdated).toLocaleDateString("en-PK", {
                                                month: "short", day: "numeric"
                                            })}
                                        </div>
                                    )}
                                    {!record && (
                                        <div className="rate-updated" style={{ color: "rgba(255,255,255,0.45)" }}>
                                            Not configured yet
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Navigation */}
            <div className="card">
                <div className="card-header">
                    <h3>⚡ Quick Navigation</h3>
                </div>
                <div className="card-body" style={{ padding: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
                        {QUICK_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                style={{ textDecoration: "none" }}
                            >
                                <div style={{
                                    padding: "16px",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)",
                                    background: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "14px",
                                    transition: "all var(--transition-fast)",
                                    cursor: "pointer",
                                }}
                                    className="stat-tile"
                                >
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "var(--radius-sm)",
                                        background: "linear-gradient(135deg, var(--gold-pale) 0%, var(--gold-light) 100%)",
                                        border: "1px solid var(--gold-light)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "var(--maroon-dark)",
                                        flexShrink: 0,
                                    }}>
                                        {link.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--maroon)" }}>
                                            {link.label}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                            {link.desc}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
