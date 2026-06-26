"use client";

import { useState, useEffect } from "react";
import { Bell, User, Clock, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

interface HeaderProps {
    onMenuToggle: () => void;
}

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
    "/":                { title: "Sales Invoice",    sub: "Create & manage sale invoices" },
    "/bulk-purchase":   { title: "Bulk Purchase",    sub: "Record bulk metal purchases" },
    "/purchase":        { title: "Purchase Invoice", sub: "Record incoming stock & purchases" },
    "/invoices":        { title: "Invoice History",  sub: "All finalized invoices" },
    "/payments":        { title: "Payments",         sub: "Track receivables & payables" },
    "/inventory":       { title: "Inventory",        sub: "Stock management & tracking" },
    "/customer-orders": { title: "Customer Orders",  sub: "Orders & karigar tracking" },
    "/parties":         { title: "Party Ledger",     sub: "Customers & suppliers" },
    "/settings":        { title: "Settings",         sub: "System configuration" },
    "/dashboard":       { title: "Dashboard",        sub: "Overview & analytics" },
};

function getPageInfo(pathname: string | null) {
    if (!pathname) return PAGE_TITLES["/"];
    const key = Object.keys(PAGE_TITLES).find(k => k !== "/" && pathname.startsWith(k)) || "/";
    return PAGE_TITLES[key];
}

export default function Header({ onMenuToggle }: HeaderProps) {
    const pathname = usePathname();
    const [time, setTime] = useState("");
    const [date, setDate] = useState("");

    const info = getPageInfo(pathname);

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
            setDate(now.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <header className="app-header">
            {/* Left: Hamburger + Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <button
                    className="btn btn-icon btn-ghost"
                    onClick={onMenuToggle}
                    title="Toggle navigation"
                    aria-label="Toggle navigation"
                    style={{ flexShrink: 0 }}
                >
                    <Menu size={17} />
                </button>

                {/* Gold accent line */}
                <div style={{
                    width: 3,
                    height: 28,
                    borderRadius: 99,
                    background: "linear-gradient(to bottom, var(--gold-light), var(--gold))",
                    flexShrink: 0,
                }} />

                <div style={{ minWidth: 0 }}>
                    <h1 style={{
                        fontSize: "0.9375rem",
                        fontWeight: 800,
                        color: "var(--maroon)",
                        margin: 0,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}>
                        {info.title}
                    </h1>
                    <p style={{
                        fontSize: "0.625rem",
                        color: "var(--text-muted)",
                        margin: 0,
                        fontWeight: 500,
                        letterSpacing: "0.01em",
                    }}>
                        {info.sub}
                    </p>
                </div>

                <span className="badge badge-gold" style={{ flexShrink: 0 }}>
                    Phase 1
                </span>
            </div>

            {/* Center: Clock */}
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0 20px",
                gap: 1,
                flexShrink: 0,
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--maroon)",
                    fontSize: "0.875rem",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                }}>
                    <Clock size={13} style={{ color: "var(--gold)", flexShrink: 0 }} />
                    {time}
                </div>
                <div style={{
                    fontSize: "0.5625rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                }}>
                    {date}
                </div>
            </div>

            {/* Right: Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button
                    className="btn btn-icon btn-ghost"
                    title="Notifications"
                    style={{ position: "relative" }}
                >
                    <Bell size={15} />
                    {/* Notification dot */}
                    <span style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--gold)",
                        border: "1.5px solid white",
                    }} />
                </button>

                {/* Divider */}
                <div style={{ width: 1, height: 24, background: "var(--border)", flexShrink: 0 }} />

                {/* User pill */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 10px 4px 4px",
                    background: "var(--cream-light)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    transition: "all var(--t-fast)",
                }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-light)";
                        (e.currentTarget as HTMLElement).style.background = "var(--cream)";
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.background = "var(--cream-light)";
                    }}
                >
                    <div style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--maroon-light), var(--maroon-dark))",
                        color: "var(--text-on-maroon)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(92,10,10,0.3)",
                    }}>
                        <User size={13} />
                    </div>
                    <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>
                            Admin
                        </div>
                        <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", fontWeight: 500 }}>
                            Administrator
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
