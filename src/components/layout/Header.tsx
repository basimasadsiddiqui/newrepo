/**
 * ============================================================================
 * HEADER COMPONENT
 * ============================================================================
 *
 * Top header bar showing:
 * - Page title
 * - Current date/time (auto-updating)
 * - User info
 * - Quick actions
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import { Bell, User, Clock } from "lucide-react";

import { usePathname } from "next/navigation";

export default function Header() {
    const pathname = usePathname();
    const [currentTime, setCurrentTime] = useState<string>("");

    const getPageTitle = () => {
        if (pathname?.startsWith("/inventory")) return "Inventory Management";
        if (pathname?.startsWith("/parties")) return "Party Management";
        if (pathname?.startsWith("/payments")) return "Payments Module";
        return "Invoice Module";
    };

    useEffect(() => {
        /** Update the clock every second */
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleDateString("en-PK", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }) +
                "  •  " +
                now.toLocaleTimeString("en-PK", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                })
            );
        };

        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="app-header">
            {/* Left: Page Title */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                <h1 style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "var(--maroon)",
                    margin: 0,
                }}>
                    {getPageTitle()}
                </h1>
                <span className="badge badge-draft" style={{ fontSize: "0.625rem" }}>
                    Phase 1
                </span>
            </div>

            {/* Center: Clock */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--text-muted)",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-mono)",
            }}>
                <Clock size={14} />
                <span>{currentTime}</span>
            </div>

            {/* Right: Actions */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginLeft: "24px",
            }}>
                <button className="btn btn-icon btn-ghost" title="Notifications">
                    <Bell size={16} />
                </button>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 12px",
                    background: "var(--cream)",
                    borderRadius: "var(--radius-full)",
                }}>
                    <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "var(--maroon)",
                        color: "var(--text-on-maroon)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                    }}>
                        <User size={14} />
                    </div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Admin</span>
                </div>
            </div>
        </header>
    );
}
