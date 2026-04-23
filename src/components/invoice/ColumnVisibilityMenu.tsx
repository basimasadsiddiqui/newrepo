"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings2 } from "lucide-react";

export interface ColumnDef {
    key: string;
    label: string;
    alwaysOn?: boolean;
    group?: string;
}

interface Props {
    columns: ColumnDef[];
    visible: Record<string, boolean>;
    onChange: (next: Record<string, boolean>) => void;
    onReset?: () => void;
}

export default function ColumnVisibilityMenu({ columns, visible, onChange, onReset }: Props) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, right: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Recalculate panel position whenever it opens
    useLayoutEffect(() => {
        if (!open || !btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        setPos({
            top: r.bottom + 4,
            right: window.innerWidth - r.right,
        });
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (
                btnRef.current?.contains(t) ||
                panelRef.current?.contains(t)
            ) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    const toggle = (key: string) => onChange({ ...visible, [key]: !visible[key] });

    const toggleGroup = (cols: ColumnDef[]) => {
        const togglable = cols.filter(c => !c.alwaysOn);
        const allOn = togglable.every(c => visible[c.key]);
        const next = { ...visible };
        for (const c of togglable) next[c.key] = !allOn;
        onChange(next);
    };

    // Group columns
    const groups: Record<string, ColumnDef[]> = {};
    for (const col of columns) {
        const g = col.group ?? "Columns";
        if (!groups[g]) groups[g] = [];
        groups[g].push(col);
    }

    const checkedCount = columns.filter((c) => visible[c.key]).length;

    return (
        <>
            <button
                ref={btnRef}
                className="btn btn-sm btn-ghost"
                onClick={() => setOpen((v) => !v)}
                title="Show / hide columns"
            >
                <Settings2 size={13} />
                Columns
                <span style={{ marginLeft: 4, fontSize: "0.625rem", opacity: 0.7, fontFamily: "var(--font-mono)" }}>
                    {checkedCount}/{columns.length}
                </span>
            </button>

            {open && typeof window !== "undefined" && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: "fixed",
                        top: pos.top,
                        right: pos.right,
                        zIndex: 9999,
                        minWidth: 270,
                        maxHeight: 440,
                        overflowY: "auto",
                        background: "var(--card-bg, #fff)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                        padding: "10px 12px",
                        fontSize: "0.75rem",
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: "1px solid var(--border)",
                    }}>
                        <strong style={{ fontSize: "0.8125rem" }}>Show / Hide Columns</strong>
                        {onReset && (
                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={onReset}
                                style={{ fontSize: "0.6875rem", padding: "2px 8px" }}
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Groups */}
                    {Object.entries(groups).map(([groupName, cols]) => {
                        const togglable = cols.filter(c => !c.alwaysOn);
                        const allOn = togglable.length > 0 && togglable.every(c => visible[c.key]);
                        return (
                        <div key={groupName} style={{ marginBottom: 10 }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 5,
                            }}>
                                <span style={{
                                    fontSize: "0.6rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.09em",
                                    color: "var(--text-muted)",
                                    fontWeight: 700,
                                }}>
                                    {groupName}
                                </span>
                                {togglable.length > 1 && (
                                    <button
                                        onClick={() => toggleGroup(cols)}
                                        style={{
                                            fontSize: "0.55rem",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.06em",
                                            color: allOn ? "var(--danger)" : "var(--gold-dark)",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: "1px 4px",
                                            borderRadius: 3,
                                            opacity: 0.8,
                                        }}
                                    >
                                        {allOn ? "Hide All" : "Show All"}
                                    </button>
                                )}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px" }}>
                                {cols.map((col) => (
                                    <label
                                        key={col.key}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 7,
                                            cursor: col.alwaysOn ? "not-allowed" : "pointer",
                                            opacity: col.alwaysOn ? 0.5 : 1,
                                            padding: "3px 5px",
                                            borderRadius: 4,
                                            userSelect: "none",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={!!visible[col.key]}
                                            disabled={col.alwaysOn}
                                            onChange={() => toggle(col.key)}
                                            style={{ cursor: col.alwaysOn ? "not-allowed" : "pointer" }}
                                        />
                                        <span>{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
}
