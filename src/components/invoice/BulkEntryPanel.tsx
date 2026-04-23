"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
    Plus, Trash2, PackagePlus, AlertTriangle, CheckCircle2,
    Scale, Zap, LayoutList, FileText, Save,
} from "lucide-react";
import type { Category } from "@/types";
import { calculateLineItem, goldRateToPerGram } from "@/lib/calculationEngine";
import type { PolishLabourBasis, LabourBasis, KaatBasis } from "@/lib/calculationEngine";

export interface BulkRow {
    id: string;
    categoryId: string;
    description: string;
    carat: number;
    pieces: number;
    estimatedGoldWeight: number;
    stoneWeight: number;
    isBulkPurchase?: boolean;
}

interface BulkEntryPanelProps {
    onConfirm: (rows: BulkRow[]) => void;
    onSaveDraft?: () => Promise<void>;
    onGeneratePdf?: () => Promise<void>;
    categories: Category[];
    goldRate: number;
    polishBasis: PolishLabourBasis;
    polishRate: number;
    labourBasis: LabourBasis;
    labourRate: number;
    kaatBasis: KaatBasis;
    kaatRate: number;
}

let rowCounter = 0;
function mkRow(carat = 21): BulkRow {
    return {
        id: `bulk-${Date.now()}-${++rowCounter}`,
        categoryId: "",
        description: "",
        carat,
        pieces: 1,
        estimatedGoldWeight: 0,
        stoneWeight: 0,
    };
}

export default function BulkEntryPanel({
    onConfirm,
    onSaveDraft,
    onGeneratePdf,
    categories,
    goldRate,
    polishBasis, polishRate, labourBasis, labourRate, kaatBasis, kaatRate,
}: BulkEntryPanelProps) {
    const [mode, setMode] = useState<"quick" | "categorize">("quick");

    // ── Quick entry state ──
    const [quickDesc, setQuickDesc] = useState("Bulk Gold Purchase");
    const [quickWeight, setQuickWeight] = useState<number>(0);
    const [quickCarat, setQuickCarat] = useState<number>(21);
    const [quickStoneWeight, setQuickStoneWeight] = useState<number>(0);
    const [quickNotes, setQuickNotes] = useState("");

    // ── Categorize state ──
    const [totalBulkWeight, setTotalBulkWeight] = useState<number>(0);
    const [bulkCarat, setBulkCarat] = useState<number>(21);
    const [rows, setRows] = useState<BulkRow[]>([mkRow(21), mkRow(21), mkRow(21)]);

    // ── Loading states ──
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const goldRatePerGram = goldRateToPerGram(goldRate);

    // ── Quick mode calcs ──
    const quickPurity = quickCarat / 24;
    const quickPureGold = quickWeight * quickPurity;
    const quickAlloy = quickWeight - quickPureGold;
    const quickCalc = useMemo(() => {
        if (quickWeight <= 0) return null;
        return calculateLineItem({
            transactionType: "PURCHASE",
            estimatedGoldWeight: quickWeight,
            carat: quickCarat,
            goldRatePerGram,
            polishRate, polishBasis,
            labourRate, labourBasis,
            kaatBasis, kaatRate,
            stoneWeight: quickStoneWeight,
            beadsWeight: 0, diamondWeight: 0,
            stoneAmount: 0, beadsAmount: 0, diamondAmount: 0,
        });
    }, [quickWeight, quickCarat, quickStoneWeight, goldRatePerGram, polishRate, polishBasis, labourRate, labourBasis, kaatBasis, kaatRate]);

    // ── Categorize calcs ──
    const allocatedWeight = useMemo(
        () => rows.reduce((sum, r) => sum + (r.estimatedGoldWeight || 0), 0),
        [rows]
    );
    const remainingWeight = useMemo(
        () => totalBulkWeight > 0 ? totalBulkWeight - allocatedWeight : 0,
        [totalBulkWeight, allocatedWeight]
    );
    const allocationPct = useMemo(
        () => totalBulkWeight > 0 ? Math.min(100, (allocatedWeight / totalBulkWeight) * 100) : 0,
        [allocatedWeight, totalBulkWeight]
    );
    const isOverAllocated = totalBulkWeight > 0 && allocatedWeight > totalBulkWeight + 0.001;
    const isFullyAllocated = totalBulkWeight > 0 && Math.abs(remainingWeight) < 0.001;
    const validRows = rows.filter(r => r.estimatedGoldWeight > 0 || r.description.trim());

    const update = useCallback((id: string, field: keyof BulkRow, value: unknown) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    }, []);

    const remove = useCallback((id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
    }, []);

    const applyBulkCarat = () => setRows(prev => prev.map(r => ({ ...r, carat: bulkCarat })));

    const distributeRemaining = () => {
        const empty = rows.filter(r => r.estimatedGoldWeight === 0);
        if (empty.length === 0 || remainingWeight <= 0) return;
        const per = remainingWeight / empty.length;
        setRows(prev => prev.map(r =>
            r.estimatedGoldWeight === 0
                ? { ...r, estimatedGoldWeight: Math.round(per * 1000) / 1000 }
                : r
        ));
    };

    const resetAll = () => {
        setQuickDesc("Bulk Gold Purchase");
        setQuickWeight(0);
        setQuickCarat(21);
        setQuickStoneWeight(0);
        setQuickNotes("");
        setTotalBulkWeight(0);
        setBulkCarat(21);
        setRows([mkRow(21), mkRow(21), mkRow(21)]);
        setMode("quick");
    };

    const buildQuickRows = (): BulkRow[] => [{
        id: `bulk-quick-${Date.now()}`,
        categoryId: "",
        description: quickDesc || "Bulk Gold Purchase",
        carat: quickCarat,
        pieces: 1,
        estimatedGoldWeight: quickWeight,
        stoneWeight: quickStoneWeight,
        isBulkPurchase: true,
    }];

    const canConfirmQuick = quickWeight > 0;
    const canConfirmCategorize = validRows.length > 0 && !isOverAllocated;
    const canConfirm = mode === "quick" ? canConfirmQuick : canConfirmCategorize;

    const handleAddToInvoice = () => {
        if (!canConfirm) return;
        if (mode === "quick") onConfirm(buildQuickRows());
        else onConfirm(validRows);
        resetAll();
    };

    const handleSaveDraftAction = async () => {
        if (!canConfirm) return;
        if (mode === "quick") onConfirm(buildQuickRows());
        else onConfirm(validRows);
        setIsSaving(true);
        try { await onSaveDraft?.(); } finally { setIsSaving(false); }
        resetAll();
    };

    const handleSavePdfAction = async () => {
        if (!canConfirm) return;
        if (mode === "quick") onConfirm(buildQuickRows());
        else onConfirm(validRows);
        setIsGenerating(true);
        try { await onGeneratePdf?.(); } finally { setIsGenerating(false); }
        resetAll();
    };

    const barColor = isOverAllocated
        ? "var(--danger)"
        : isFullyAllocated
            ? "var(--success)"
            : "linear-gradient(90deg, var(--gold-dark), var(--gold))";

    return (
        <div className="card animate-fade-in" style={{ display: "flex", flexDirection: "column" }}>
            {/* ── Header ── */}
            <div className="card-header" style={{
                padding: "10px 16px",
                background: "linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%)",
                borderBottom: "none",
            }}>
                <h3 style={{ color: "var(--text-on-maroon)", display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
                    <PackagePlus size={15} />
                    Bulk Gold Purchase Entry
                </h3>
            </div>

            {/* ── Mode tabs ── */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--cream-light)" }}>
                {([
                    { key: "quick" as const, Icon: Zap, label: "Quick Entry", sub: "Record full bulk as 1 item" },
                    { key: "categorize" as const, Icon: LayoutList, label: "Categorize", sub: "Split into rings, necklaces…" },
                ] as const).map(tab => (
                    <button key={tab.key} onClick={() => setMode(tab.key)} style={{
                        flex: 1, padding: "8px 12px",
                        border: "none",
                        borderBottom: mode === tab.key ? "2px solid var(--maroon)" : "2px solid transparent",
                        background: "transparent",
                        color: mode === tab.key ? "var(--maroon)" : "var(--text-muted)",
                        fontWeight: mode === tab.key ? 700 : 500,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                        transition: "all var(--t-fast)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <tab.Icon size={12} />
                            {tab.label}
                        </div>
                        <div style={{ fontSize: "0.5625rem", opacity: 0.65 }}>{tab.sub}</div>
                    </button>
                ))}
            </div>

            {/* ── QUICK ENTRY ── */}
            {mode === "quick" && (
                <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                            <label className="form-label">Description</label>
                            <input className="form-input"
                                placeholder="e.g. Bulk Gold Stock — Batch #12"
                                value={quickDesc}
                                onChange={e => setQuickDesc(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Gold Weight (g)</label>
                            <div style={{ position: "relative" }}>
                                <input className="form-input" type="number" min={0} step={0.001}
                                    value={quickWeight || ""}
                                    onChange={e => setQuickWeight(Number(e.target.value))}
                                    placeholder="0.000"
                                    style={{ paddingRight: 28, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem" }}
                                />
                                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--text-muted)" }}>g</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Gold Purity (Carat)</label>
                            <input className="form-input" type="number" min={1} max={24} step={0.1}
                                value={quickCarat}
                                onChange={e => setQuickCarat(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Stone / Gem Weight (g)</label>
                            <input className="form-input" type="number" min={0} step={0.001}
                                value={quickStoneWeight || ""}
                                placeholder="0.000"
                                onChange={e => setQuickStoneWeight(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes / Reference</label>
                            <input className="form-input"
                                placeholder="Supplier ref, lot #, etc."
                                value={quickNotes}
                                onChange={e => setQuickNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {quickWeight > 0 && (
                        <div style={{
                            background: "var(--cream-light)",
                            border: "1px solid var(--gold-light)",
                            borderRadius: 10,
                            padding: "12px 14px",
                        }}>
                            <div style={{ fontSize: "0.575rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                                Purchase Preview
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                                {[
                                    { label: "Pure Gold", value: `${quickPureGold.toFixed(3)} g`, color: "var(--success)" },
                                    { label: "Alloy", value: `${quickAlloy.toFixed(3)} g`, color: "var(--text-secondary)" },
                                    { label: "Purity", value: `${(quickPurity * 100).toFixed(1)}%`, color: "var(--gold-dark)" },
                                    {
                                        label: "Est. Amount",
                                        value: quickCalc ? `Rs. ${quickCalc.totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` : "—",
                                        color: "var(--maroon)",
                                    },
                                ].map(s => (
                                    <div key={s.label} style={{ background: "white", borderRadius: 6, padding: "6px 10px", border: "1px solid rgba(0,0,0,0.05)" }}>
                                        <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 800, color: s.color, fontFamily: "var(--font-mono)", marginTop: 2 }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 10, fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                                <PackagePlus size={11} />
                                Added as 1 line item. Categorise into rings, necklaces etc. later.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── CATEGORIZE MODE ── */}
            {mode === "categorize" && (
                <>
                    {/* Bulk header */}
                    <div style={{ padding: "12px 18px", background: "var(--cream-light)", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.575rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
                            Total Bulk Weight
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                            <div className="form-group">
                                <label className="form-label">Total Weight (g)</label>
                                <div style={{ position: "relative" }}>
                                    <input className="form-input" type="number" min={0} step={0.001}
                                        value={totalBulkWeight || ""}
                                        onChange={e => setTotalBulkWeight(Number(e.target.value))}
                                        placeholder="e.g. 500.000"
                                        style={{ paddingRight: 36, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9375rem" }}
                                    />
                                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>g</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Carat</label>
                                <input className="form-input" type="number" min={1} max={24} step={0.1}
                                    value={bulkCarat}
                                    onChange={e => setBulkCarat(Number(e.target.value))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Purity</label>
                                <input className="form-input" readOnly
                                    value={(bulkCarat / 24).toFixed(4)}
                                    style={{ background: "var(--cream)", fontFamily: "var(--font-mono)" }}
                                />
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={applyBulkCarat} style={{ whiteSpace: "nowrap" }}>
                                <Scale size={13} /> Apply to All
                            </button>
                        </div>
                    </div>

                    {/* Allocation tracker */}
                    <div style={{ padding: "10px 18px", background: "white", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 8 }}>
                            {[
                                { label: "Total Bulk", value: totalBulkWeight > 0 ? `${totalBulkWeight.toFixed(3)} g` : "— g", color: "var(--text-secondary)" },
                                { label: "Allocated", value: `${allocatedWeight.toFixed(3)} g`, color: "var(--maroon)" },
                                { label: "Remaining", value: totalBulkWeight > 0 ? `${Math.abs(remainingWeight).toFixed(3)} g` : "— g", color: isOverAllocated ? "var(--danger)" : isFullyAllocated ? "var(--success)" : "var(--warning)" },
                                { label: "Allocated %", value: totalBulkWeight > 0 ? `${allocationPct.toFixed(1)}%` : "0%", color: isFullyAllocated ? "var(--success)" : isOverAllocated ? "var(--danger)" : "var(--gold-dark)" },
                            ].map(stat => (
                                <div key={stat.label} style={{ background: "var(--cream-light)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px" }}>
                                    <div style={{ fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{stat.label}</div>
                                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: stat.color, fontFamily: "var(--font-mono)", marginTop: 2 }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: "var(--cream-dark)", borderRadius: 99, height: 8, overflow: "hidden" }}>
                            <div style={{ width: `${allocationPct}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width 300ms ease" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 500 }}>
                                {isOverAllocated && (<><AlertTriangle size={13} style={{ color: "var(--danger)" }} /><span style={{ color: "var(--danger)" }}>Over by {(allocatedWeight - totalBulkWeight).toFixed(3)} g</span></>)}
                                {isFullyAllocated && (<><CheckCircle2 size={13} style={{ color: "var(--success)" }} /><span style={{ color: "var(--success)" }}>All {totalBulkWeight.toFixed(3)} g categorised</span></>)}
                                {!isOverAllocated && !isFullyAllocated && totalBulkWeight > 0 && (<span style={{ color: "var(--text-muted)" }}>{remainingWeight.toFixed(3)} g remaining</span>)}
                            </div>
                            {remainingWeight > 0.001 && !isOverAllocated && (
                                <button className="btn btn-xs btn-ghost" onClick={distributeRemaining}>Distribute Evenly</button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                            <thead>
                                <tr style={{ background: "linear-gradient(180deg, var(--maroon-light), var(--maroon))", color: "rgba(250,246,241,0.95)", position: "sticky", top: 0, zIndex: 2 }}>
                                    {["#", "Category", "Description", "Pcs", "Carat", "Gold Wt (g)", "Stone Wt (g)", "Est. Amount", ""].map(h => (
                                        <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => {
                                    const calc = row.estimatedGoldWeight > 0
                                        ? calculateLineItem({
                                            transactionType: "PURCHASE",
                                            estimatedGoldWeight: row.estimatedGoldWeight,
                                            carat: row.carat,
                                            goldRatePerGram,
                                            polishRate, polishBasis,
                                            labourRate, labourBasis,
                                            kaatBasis, kaatRate,
                                            stoneWeight: row.stoneWeight,
                                            beadsWeight: 0, diamondWeight: 0,
                                            stoneAmount: 0, beadsAmount: 0, diamondAmount: 0,
                                        })
                                        : null;
                                    const rowPct = totalBulkWeight > 0 && row.estimatedGoldWeight > 0
                                        ? (row.estimatedGoldWeight / totalBulkWeight * 100).toFixed(1)
                                        : null;
                                    return (
                                        <tr key={row.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: idx % 2 === 0 ? "white" : "rgba(251,245,238,0.4)" }}>
                                            <td style={{ padding: "5px 10px", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textAlign: "center" }}>{idx + 1}</td>
                                            <td style={{ padding: "5px 6px", minWidth: 140 }}>
                                                <select className="form-select" style={{ height: 32, fontSize: "0.75rem" }}
                                                    value={row.categoryId}
                                                    onChange={e => update(row.id, "categoryId", e.target.value)}>
                                                    <option value="">Select…</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: "5px 6px", minWidth: 180 }}>
                                                <input className="form-input" style={{ height: 32, fontSize: "0.75rem" }}
                                                    placeholder="e.g. Gold Rings 21K…"
                                                    value={row.description}
                                                    onChange={e => update(row.id, "description", e.target.value)}
                                                />
                                            </td>
                                            <td style={{ padding: "5px 6px", width: 64 }}>
                                                <input className="form-input" style={{ height: 32, fontSize: "0.75rem", width: 60 }}
                                                    type="number" min={0}
                                                    value={row.pieces}
                                                    onChange={e => update(row.id, "pieces", Number(e.target.value))}
                                                />
                                            </td>
                                            <td style={{ padding: "5px 6px", width: 72 }}>
                                                <input className="form-input" style={{ height: 32, fontSize: "0.75rem", width: 68 }}
                                                    type="number" min={1} max={24} step={0.1}
                                                    value={row.carat}
                                                    onChange={e => update(row.id, "carat", Number(e.target.value))}
                                                />
                                            </td>
                                            <td style={{ padding: "5px 6px", width: 130 }}>
                                                <div style={{ position: "relative" }}>
                                                    <input className="form-input"
                                                        style={{ height: 32, fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}
                                                        type="number" min={0} step={0.001}
                                                        value={row.estimatedGoldWeight || ""}
                                                        placeholder="0.000"
                                                        onChange={e => update(row.id, "estimatedGoldWeight", Number(e.target.value))}
                                                    />
                                                    {rowPct && (
                                                        <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: "0.5rem", fontWeight: 700, color: "var(--gold-dark)", background: "rgba(201,168,76,0.12)", padding: "1px 4px", borderRadius: 3, pointerEvents: "none" }}>
                                                            {rowPct}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: "5px 6px", width: 110 }}>
                                                <input className="form-input" style={{ height: 32, fontSize: "0.75rem" }}
                                                    type="number" min={0} step={0.001}
                                                    value={row.stoneWeight || ""}
                                                    placeholder="0.000"
                                                    onChange={e => update(row.id, "stoneWeight", Number(e.target.value))}
                                                />
                                            </td>
                                            <td style={{ padding: "5px 10px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: calc ? "var(--maroon)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                {calc ? `Rs. ${calc.totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` : "—"}
                                            </td>
                                            <td style={{ padding: "5px 6px", textAlign: "center" }}>
                                                <button className="btn btn-icon btn-ghost btn-sm" onClick={() => remove(row.id)} style={{ color: "var(--danger)" }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {rows.some(r => r.estimatedGoldWeight > 0) && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={5} style={{ padding: "8px 10px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontSize: "0.6875rem", fontWeight: 700, color: "var(--maroon)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Totals</td>
                                        <td style={{ padding: "8px 10px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 800, color: isOverAllocated ? "var(--danger)" : "var(--maroon)", fontSize: "0.8125rem" }}>{allocatedWeight.toFixed(3)} g</td>
                                        <td style={{ padding: "8px 10px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.8125rem" }}>{rows.reduce((s, r) => s + r.stoneWeight, 0).toFixed(3)} g</td>
                                        <td colSpan={2} style={{ padding: "8px 10px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 800, color: "var(--maroon)", fontSize: "0.8125rem" }}>—</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </>
            )}

            {/* ── Footer ── */}
            <div style={{
                padding: "10px 18px",
                borderTop: "1px solid var(--border)",
                background: "var(--cream-light)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
                {mode === "categorize" ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => setRows(p => [...p, mkRow(bulkCarat)])}>
                        <Plus size={13} /> Add Row
                    </button>
                ) : (
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Zap size={11} />
                        Quick: adds 1 line item · categorise later
                    </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {onSaveDraft && (
                        <button className="btn btn-ghost btn-sm" onClick={handleSaveDraftAction}
                            disabled={isSaving || !canConfirm}>
                            <Save size={13} />
                            {isSaving ? "Saving…" : "Save Draft"}
                        </button>
                    )}

                    {onGeneratePdf && (
                        <button className="btn btn-secondary btn-sm" onClick={handleSavePdfAction}
                            disabled={isGenerating || !canConfirm}>
                            <FileText size={13} />
                            {isGenerating ? "Generating…" : "Save + PDF"}
                        </button>
                    )}

                    <button className="btn btn-primary btn-sm" onClick={handleAddToInvoice}
                        disabled={!canConfirm}
                        title={isOverAllocated ? "Reduce weights — total exceeds bulk weight" : ""}>
                        <PackagePlus size={13} />
                        Add to Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}
