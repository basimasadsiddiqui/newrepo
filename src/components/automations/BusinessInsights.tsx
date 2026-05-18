"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Users, Tag, Package, Loader2, RefreshCw, Banknote, AlertTriangle } from "lucide-react";

interface InsightData {
    topCustomers: { name: string; total: number; invoices: number }[];
    topCategories: { name: string; total: number; count: number }[];
    slowMovingItems: number;
    salesTrend: {
        today: number; todayCount: number;
        yesterday: number; yesterdayCount: number;
        thisWeek: number; thisMonth: number;
        lastMonth: number; monthOverMonthPercent: number | null;
    };
    totalReceivable: number;
}

export default function BusinessInsights() {
    const [data, setData] = useState<InsightData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setIsLoading(true); setError("");
        try {
            const res = await fetch("/api/automations/insights");
            const json = await res.json();
            if (json.success) setData(json);
            else setError(json.error ?? "Failed to load.");
        } catch { setError("Connection error."); }
        setIsLoading(false);
    };

    useEffect(() => { load(); }, []);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
            <p className="text-sm">Loading business insights...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-sm px-4 py-3 rounded-lg flex items-center gap-2"
                style={{ background: "var(--danger-bg)", border: "1px solid rgba(196,43,43,0.2)", color: "var(--danger)" }}>
                <AlertTriangle size={14} /> {error}
            </div>
            <button onClick={load} className="btn btn-ghost"><RefreshCw size={14} /> Retry</button>
        </div>
    );

    if (!data) return null;

    const { salesTrend } = data;
    const todayVsYesterday = salesTrend.yesterday > 0
        ? Math.round(((salesTrend.today - salesTrend.yesterday) / salesTrend.yesterday) * 100)
        : null;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Based on this month's data
                </p>
                <button onClick={load} className="btn btn-ghost" style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}>
                    <RefreshCw size={12} /> Refresh
                </button>
            </div>

            {/* Sales trend row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <TrendCard label="Today" value={`PKR ${salesTrend.today.toLocaleString()}`}
                    sub={`${salesTrend.todayCount} invoice${salesTrend.todayCount !== 1 ? "s" : ""}`}
                    trend={todayVsYesterday} icon={<TrendingUp size={16} />} />
                <TrendCard label="Yesterday" value={`PKR ${salesTrend.yesterday.toLocaleString()}`}
                    sub={`${salesTrend.yesterdayCount} invoice${salesTrend.yesterdayCount !== 1 ? "s" : ""}`}
                    icon={<TrendingUp size={16} />} />
                <TrendCard label="This Week" value={`PKR ${salesTrend.thisWeek.toLocaleString()}`}
                    sub="rolling 7 days" icon={<TrendingUp size={16} />} />
                <TrendCard label="This Month" value={`PKR ${salesTrend.thisMonth.toLocaleString()}`}
                    sub={salesTrend.monthOverMonthPercent !== null
                        ? `${salesTrend.monthOverMonthPercent >= 0 ? "+" : ""}${salesTrend.monthOverMonthPercent}% vs last month`
                        : "vs last month"
                    }
                    trend={salesTrend.monthOverMonthPercent}
                    icon={<TrendingUp size={16} />} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Top Customers */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Users size={14} style={{ color: "var(--gold-dark)" }} />
                            <h3>Top Customers This Month</h3>
                        </div>
                    </div>
                    <div className="card-body space-y-2">
                        {data.topCustomers.length === 0 ? (
                            <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No sales this month</p>
                        ) : data.topCustomers.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 py-2">
                                <span className="text-sm font-bold w-5 text-center" style={{ color: "var(--text-muted)" }}>
                                    {i + 1}
                                </span>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                    style={{ background: i === 0 ? "rgba(201,168,76,0.15)" : "var(--cream-light)", color: i === 0 ? "var(--gold-dark)" : "var(--text-muted)", border: "1px solid var(--border)" }}>
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.invoices} invoice{c.invoices !== 1 ? "s" : ""}</p>
                                </div>
                                <span className="text-sm font-bold shrink-0" style={{ color: "var(--maroon)" }}>
                                    PKR {c.total.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Categories */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Tag size={14} style={{ color: "var(--gold-dark)" }} />
                            <h3>Top Categories This Month</h3>
                        </div>
                    </div>
                    <div className="card-body space-y-2">
                        {data.topCategories.length === 0 ? (
                            <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No sales this month</p>
                        ) : data.topCategories.map((c, i) => {
                            const maxTotal = data.topCategories[0]?.total ?? 1;
                            const pct = Math.round((c.total / maxTotal) * 100);
                            return (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                                        <span className="text-sm font-bold" style={{ color: "var(--maroon)" }}>
                                            PKR {c.total.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--cream-dark)" }}>
                                        <div className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${pct}%`,
                                                background: "linear-gradient(90deg, var(--gold), var(--gold-dark))",
                                            }} />
                                    </div>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.count} item{c.count !== 1 ? "s" : ""} sold</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Alerts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AlertRow
                    icon={<Package size={16} />}
                    label="Slow-Moving Stock"
                    value={`${data.slowMovingItems} item${data.slowMovingItems !== 1 ? "s" : ""}`}
                    desc="In stock for 60+ days without a sale"
                    tone={data.slowMovingItems > 5 ? "warning" : "info"}
                />
                <AlertRow
                    icon={<Banknote size={16} />}
                    label="Total Receivable"
                    value={`PKR ${data.totalReceivable.toLocaleString()}`}
                    desc="Across all overdue and pending payments"
                    tone={data.totalReceivable > 100000 ? "danger" : data.totalReceivable > 0 ? "warning" : "success"}
                />
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function TrendCard({ label, value, sub, trend, icon }: {
    label: string; value: string; sub: string; trend?: number | null; icon: React.ReactNode;
}) {
    const isPositive = trend !== null && trend !== undefined && trend > 0;
    const isNegative = trend !== null && trend !== undefined && trend < 0;

    return (
        <div className="rounded-xl p-4 space-y-2"
            style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
            <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-muted)", display: "flex" }}>{icon}</span>
                {trend !== null && trend !== undefined && (
                    <div className="flex items-center gap-1 text-xs font-bold"
                        style={{ color: isPositive ? "var(--success)" : isNegative ? "var(--danger)" : "var(--text-muted)" }}>
                        {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>{value}</div>
            <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{label}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div>
        </div>
    );
}

function AlertRow({ icon, label, value, desc, tone }: {
    icon: React.ReactNode; label: string; value: string; desc: string;
    tone: "success" | "warning" | "danger" | "info";
}) {
    const t = {
        success: { bg: "var(--success-bg)", border: "rgba(30,124,74,0.2)", color: "var(--success)" },
        warning: { bg: "var(--warning-bg)", border: "rgba(217,119,6,0.2)", color: "var(--warning)" },
        danger: { bg: "var(--danger-bg)", border: "rgba(196,43,43,0.2)", color: "var(--danger)" },
        info: { bg: "var(--info-bg)", border: "rgba(29,95,173,0.2)", color: "var(--info)" },
    }[tone];

    return (
        <div className="flex items-center gap-4 rounded-xl p-4"
            style={{ background: t.bg, border: `1px solid ${t.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "white", color: t.color, border: `1px solid ${t.border}` }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
            </div>
            <span className="text-base font-bold shrink-0" style={{ color: t.color }}>{value}</span>
        </div>
    );
}
