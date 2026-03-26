/**
 * ============================================================================
 * DIAMOND PURCHASE DETAILS DIALOG
 * ============================================================================
 *
 * Modal dialog for entering diamond purchase details.
 * Opens automatically when category = "Diamond" during Purchase.
 *
 * Features:
 * - Rule type dropdown (Per Carat, Per Cent, Lump-Sum)
 * - Rate, Tag Caption, Weight, Detail inputs
 * - Add/Clear/Exit buttons
 * - Table of added entries with delete
 * - Auto-calculated totals
 * ============================================================================
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, RotateCcw, X, Trash2, Diamond } from "lucide-react";
import type { DiamondEntry, DiamondRuleType } from "@/types";

// ─── Props ──────────────────────────────────────────────────────

interface DiamondDetailsDialogProps {
    isOpen: boolean;
    initialEntries: DiamondEntry[];
    onConfirm: (entries: DiamondEntry[], totalWeight: number, totalAmount: number) => void;
    onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────

let diamondIdCounter = 0;
function generateDiamondId(): string {
    return `diamond_${Date.now()}_${++diamondIdCounter}`;
}

function calcDiamondTotal(ruleType: DiamondRuleType, rate: number, weight: number): number {
    switch (ruleType) {
        case "Per Carat":
            return parseFloat((weight * rate).toFixed(2));
        case "Per Cent":
            return parseFloat(rate.toFixed(2));
        case "Lump-Sum":
            return parseFloat(rate.toFixed(2));
        default:
            return 0;
    }
}

// ─── Component ──────────────────────────────────────────────────

export default function DiamondDetailsDialog({
    isOpen,
    initialEntries,
    onConfirm,
    onClose,
}: DiamondDetailsDialogProps) {
    // ── Local state ──
    const [entries, setEntries] = useState<DiamondEntry[]>(initialEntries);
    const [ruleType, setRuleType] = useState<DiamondRuleType>("Per Carat");
    const [rate, setRate] = useState<number>(0);
    const [tagCaption, setTagCaption] = useState<string>("");
    const [weight, setWeight] = useState<number>(0);
    const [detail, setDetail] = useState<string>("");

    // ── Derived ──
    const grandTotal = useMemo(
        () => entries.reduce((sum, e) => sum + e.total, 0),
        [entries]
    );

    const totalWeight = useMemo(
        () => entries.reduce((sum, e) => sum + e.weight, 0),
        [entries]
    );

    // ── Handlers ──
    const clearForm = useCallback(() => {
        setRuleType("Per Carat");
        setRate(0);
        setTagCaption("");
        setWeight(0);
        setDetail("");
    }, []);

    const handleAdd = useCallback(() => {
        if (rate <= 0) return;
        if (ruleType === "Per Carat" && weight <= 0) return;

        const total = calcDiamondTotal(ruleType, rate, weight);
        const newEntry: DiamondEntry = {
            id: generateDiamondId(),
            type: "Diamond",
            ruleType,
            rate,
            tagCaption,
            weight: ruleType === "Per Carat" ? weight : weight,
            detail,
            total,
        };
        setEntries((prev) => [...prev, newEntry]);
        clearForm();
    }, [ruleType, rate, tagCaption, weight, detail, clearForm]);

    const handleDelete = useCallback((id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const handleExit = useCallback(() => {
        onConfirm(entries, totalWeight, grandTotal);
    }, [entries, totalWeight, grandTotal, onConfirm]);

    // ── Early return ──
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(2px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) handleExit(); }}
        >
            <div
                className="card animate-fade-in"
                style={{
                    width: "820px",
                    maxHeight: "85vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {/* ── Header ── */}
                <div
                    className="card-header"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderBottom: "2px solid var(--gold-light)",
                        background: "linear-gradient(135deg, #fff8f0 0%, #fff 100%)",
                    }}
                >
                    <h3
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            margin: 0,
                            fontSize: "1rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                        }}
                    >
                        <Diamond size={18} style={{ color: "#e53e3e" }} />
                        Diamond Purchase Details
                    </h3>
                    <button
                        onClick={handleExit}
                        className="btn btn-sm btn-ghost"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Input Section: Diamond Rules ── */}
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div
                        style={{
                            fontSize: "0.8125rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            marginBottom: "10px",
                        }}
                    >
                        Diamond Rules
                    </div>

                    {/* Row 1: Rule Type + Rate + Tag Caption + Weight */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "100px 140px 100px 170px 100px",
                            gap: "8px",
                            alignItems: "end",
                            marginBottom: "8px",
                        }}
                    >
                        {/* Type label */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.6875rem" }}>Type</label>
                            <input
                                className="form-input"
                                value="Diamond"
                                readOnly
                                style={{
                                    background: "var(--cream)",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    height: "32px",
                                }}
                            />
                        </div>

                        {/* Rule Type dropdown */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.6875rem" }}>On</label>
                            <select
                                className="form-select"
                                value={ruleType}
                                onChange={(e) => setRuleType(e.target.value as DiamondRuleType)}
                                style={{ height: "32px", fontSize: "0.75rem" }}
                            >
                                <option value="Per Carat">Per Carat</option>
                                <option value="Per Cent">Per Cent</option>
                                <option value="Lump-Sum">Lump-Sum</option>
                            </select>
                        </div>

                        {/* Rate */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.6875rem" }}>@ Rate</label>
                            <input
                                className="form-input"
                                type="number"
                                min={0}
                                step={0.01}
                                value={rate || ""}
                                onChange={(e) => setRate(Number(e.target.value))}
                                placeholder="0.00"
                                style={{ height: "32px", fontSize: "0.75rem" }}
                            />
                        </div>

                        {/* Tag Caption */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.6875rem" }}>Tag Caption</label>
                            <input
                                className="form-input"
                                value={tagCaption}
                                onChange={(e) => setTagCaption(e.target.value)}
                                placeholder="e.g. K/CENT"
                                style={{ height: "32px", fontSize: "0.75rem" }}
                            />
                        </div>

                        {/* Weight */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.6875rem" }}>Weight (ct)</label>
                            <input
                                className="form-input"
                                type="number"
                                min={0}
                                step={0.01}
                                value={weight || ""}
                                onChange={(e) => setWeight(Number(e.target.value))}
                                placeholder="0.00"
                                style={{ height: "32px", fontSize: "0.75rem" }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Detail + Buttons */}
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "end",
                        }}
                    >
                        {/* Detail */}
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.6875rem" }}>Detail</label>
                            <input
                                className="form-input"
                                value={detail}
                                onChange={(e) => setDetail(e.target.value)}
                                placeholder="Additional details..."
                                style={{ height: "32px", fontSize: "0.75rem" }}
                            />
                        </div>

                        {/* Add Button */}
                        <button
                            className="btn btn-sm"
                            onClick={handleAdd}
                            title="Add entry"
                            style={{
                                background: "#38a169",
                                color: "#fff",
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "0 12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                border: "none",
                                borderRadius: "var(--radius-sm)",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <Plus size={14} />
                            Add
                        </button>

                        {/* Clear/New Button */}
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={clearForm}
                            title="Clear inputs"
                            style={{
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "0 12px",
                                fontSize: "0.75rem",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <RotateCcw size={12} />
                            Clear/New
                        </button>
                    </div>
                </div>

                {/* ── Entry Table ── */}
                <div style={{ flex: 1, overflow: "auto", padding: "0 16px" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.75rem",
                            marginTop: "8px",
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    background: "var(--cream)",
                                    borderBottom: "2px solid var(--gold-light)",
                                }}
                            >
                                <th style={thStyle}>S.No</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Rule</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
                                <th style={thStyle}>Tag Caption</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Weight</th>
                                <th style={thStyle}>Detail</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                                <th style={{ ...thStyle, textAlign: "center", width: "40px" }}>Del</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        style={{
                                            textAlign: "center",
                                            padding: "24px",
                                            color: "var(--text-muted)",
                                            fontSize: "0.8125rem",
                                        }}
                                    >
                                        No diamond entries yet. Use the form above to add entries.
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry, idx) => (
                                    <tr
                                        key={entry.id}
                                        style={{
                                            borderBottom: "1px solid var(--border)",
                                            transition: "background 0.15s",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.background = "#fffde7")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.background = "transparent")
                                        }
                                    >
                                        <td style={tdStyle}>{idx + 1}</td>
                                        <td style={tdStyle}>{entry.type}</td>
                                        <td style={tdStyle}>{entry.ruleType}</td>
                                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>
                                            {entry.rate.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={tdStyle}>{entry.tagCaption}</td>
                                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)" }}>
                                            {entry.weight.toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {entry.detail}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                                            {entry.total.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "center" }}>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="btn btn-icon btn-ghost btn-sm"
                                                title="Delete entry"
                                                style={{
                                                    width: "24px",
                                                    height: "24px",
                                                    color: "#e53e3e",
                                                    padding: 0,
                                                }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Footer: Total + Exit ── */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderTop: "2px solid var(--gold-light)",
                        background: "linear-gradient(135deg, #fff8f0 0%, #fff 100%)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                        }}
                    >
                        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>
                            Total Weight: <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{totalWeight.toFixed(2)} ct</span>
                        </span>
                        <span style={{ color: "var(--border)" }}>|</span>
                        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            Total:{" "}
                            <span
                                style={{
                                    fontSize: "1rem",
                                    color: "var(--gold-dark)",
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                {grandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                            </span>
                        </span>
                    </div>

                    <button
                        className="btn btn-sm"
                        onClick={handleExit}
                        style={{
                            background: "var(--gold-dark)",
                            color: "#fff",
                            height: "34px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "0 18px",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                        }}
                    >
                        Confirm & Exit
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Shared Styles ──────────────────────────────────────────────

const thStyle: React.CSSProperties = {
    padding: "8px 6px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: "0.6875rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
    padding: "8px 6px",
    fontSize: "0.75rem",
    whiteSpace: "nowrap",
    color: "var(--text-primary)",
};
