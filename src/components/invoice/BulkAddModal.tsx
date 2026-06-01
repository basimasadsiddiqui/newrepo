"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
    X, Plus, Trash2, PackagePlus, AlertTriangle, CheckCircle2,
    Scale, Zap, LayoutList, FileText, Save, ChevronDown, ChevronRight,
    Gem,
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
    grossWeight?: number;
    stoneWeight: number;
    notes?: string;
    isBulkPurchase?: boolean;
}

type LocalKaatBasis = KaatBasis | "None" | "Pasa" | "Purity";
type StoneRateBasis = "Ratti" | "Purity" | "Direct";

interface BulkAddModalProps {
    isOpen: boolean;
    onClose: () => void;
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
    initialMode?: "quick" | "categorize";
    initialWeight?: number;
    initialCarat?: number;
    categorizeTitle?: string;
}

let rowCounter = 0;
function mkRow(carat = 21): BulkRow {
    return {
        id: `bulk-${Date.now()}-${++rowCounter}`,
        categoryId: "",
        description: "",
        carat,
        pieces: 0,
        estimatedGoldWeight: 0,
        grossWeight: 0,
        stoneWeight: 0,
        notes: "",
    };
}

const sel = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

export default function BulkAddModal({
    isOpen, onClose, onConfirm,
    onSaveDraft, onGeneratePdf,
    categories, goldRate,
    polishBasis, polishRate, labourBasis, labourRate, kaatBasis, kaatRate,
    initialMode, initialWeight, initialCarat, categorizeTitle,
}: BulkAddModalProps) {
    const [mode, setMode] = useState<"quick" | "categorize">(initialMode ?? "quick");

    // ── Quick entry state ──
    const [quickDesc, setQuickDesc] = useState("");
    const [quickWeight, setQuickWeight] = useState<number>(0);
    const [quickRatti, setQuickRatti] = useState<number>(0);
    const [quickLocalRate, setQuickLocalRate] = useState<number>(0);
    const [quickCarat, setQuickCarat] = useState<number>(0);
    const [hasStone, setHasStone] = useState(false);
    const [quickStoneWeight, setQuickStoneWeight] = useState<number>(0);
    const [stoneRateBasis, setStoneRateBasis] = useState<StoneRateBasis>("Direct");
    const [stoneRate, setStoneRate] = useState<number>(0);
    // Guarantee calculator (mirrors purchase invoice ItemEntryForm)
    const guaranteePurity = quickCarat / 24;
    const guaranteePureGold = quickWeight * guaranteePurity;
    const guaranteeAlloy = quickWeight - guaranteePureGold;
    const [quickNotes, setQuickNotes] = useState("");

    // ── Inline Jewellery Rules state ──
    const [showJewelleryRules, setShowJewelleryRules] = useState(false);
    const [localKaatBasis, setLocalKaatBasis] = useState<LocalKaatBasis>(kaatBasis ?? "None");
    const [localKaatRate, setLocalKaatRate] = useState<number>(kaatRate);
    const [localPolishBasis, setLocalPolishBasis] = useState<PolishLabourBasis>(polishBasis);
    const [localPolishRate, setLocalPolishRate] = useState<number>(polishRate);
    const [localLabourBasis, setLocalLabourBasis] = useState<LabourBasis>(labourBasis);
    const [localLabourRate, setLocalLabourRate] = useState<number>(labourRate);

    // ── Categorize state ──
    const [totalBulkWeight, setTotalBulkWeight] = useState<number>(0);
    const [bulkCarat, setBulkCarat] = useState<number>(0);
    const [rows, setRows] = useState<BulkRow[]>([mkRow(0), mkRow(0), mkRow(0)]);

    // ── Loading states ──
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // ── Seed from props when modal opens (re-categorise flow) ──
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!isOpen) return;
        if (initialMode) setMode(initialMode);
        if (initialWeight !== undefined) {
            setTotalBulkWeight(initialWeight);
            setQuickWeight(initialWeight);
        }
        if (initialCarat !== undefined && initialCarat > 0) {
            setBulkCarat(initialCarat);
            setQuickCarat(initialCarat);
            setRows([mkRow(initialCarat), mkRow(initialCarat), mkRow(initialCarat)]);
        }
    }, [isOpen]);

    const goldRatePerGram = goldRateToPerGram(quickLocalRate || goldRate);

    // ── Ratti Kal calculation ──
    const rattiKalWeight = quickWeight > 0 && quickRatti > 0
        ? Math.round(quickWeight * (96 - quickRatti) / 96 * 1000) / 1000
        : null;

    // ── Map local kaat basis to engine KaatBasis ──
    const effectiveKaatBasis: KaatBasis | undefined =
        localKaatBasis === "Pasa" || localKaatBasis === "Purity" || localKaatBasis === "None"
            ? undefined
            : localKaatBasis as KaatBasis;

    // ── Stone amount based on basis ──
    const stoneAmount = useMemo(() => {
        if (!hasStone || quickStoneWeight <= 0 || stoneRate <= 0) return 0;
        if (stoneRateBasis === "Ratti") return quickStoneWeight * stoneRate;
        if (stoneRateBasis === "Purity") return quickStoneWeight * (quickCarat / 24) * stoneRate;
        return stoneRate;
    }, [hasStone, quickStoneWeight, stoneRate, stoneRateBasis, quickCarat]);

    // ── Quick mode calcs ──
    const quickCalc = useMemo(() => {
        if (quickWeight <= 0) return null;
        return calculateLineItem({
            transactionType: "PURCHASE",
            estimatedGoldWeight: quickWeight,
            carat: quickCarat,
            goldRatePerGram,
            polishRate: localPolishRate, polishBasis: localPolishBasis,
            labourRate: localLabourRate, labourBasis: localLabourBasis,
            kaatBasis: effectiveKaatBasis, kaatRate: localKaatRate,
            stoneWeight: hasStone ? quickStoneWeight : 0,
            beadsWeight: 0, diamondWeight: 0,
            stoneAmount, beadsAmount: 0, diamondAmount: 0,
        });
    }, [quickWeight, quickCarat, goldRatePerGram, localPolishRate, localPolishBasis,
        localLabourRate, localLabourBasis, effectiveKaatBasis, localKaatRate,
        hasStone, quickStoneWeight, stoneAmount]);

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
        setQuickDesc("");
        setQuickWeight(0);
        setQuickRatti(0);
        setQuickCarat(0);
        setHasStone(false);
        setQuickStoneWeight(0);
        setStoneRateBasis("Direct");
        setStoneRate(0);
        setQuickNotes("");
        setShowJewelleryRules(false);
        setLocalKaatBasis(kaatBasis ?? "None");
        setLocalKaatRate(kaatRate);
        setLocalPolishBasis(polishBasis);
        setLocalPolishRate(polishRate);
        setLocalLabourBasis(labourBasis);
        setLocalLabourRate(labourRate);
        setTotalBulkWeight(0);
        setBulkCarat(0);
        setRows([mkRow(0), mkRow(0), mkRow(0)]);
        setMode("quick");
    };

    const buildQuickRows = (): BulkRow[] => [{
        id: `bulk-quick-${Date.now()}`,
        categoryId: "",
        description: quickDesc || "Bulk Gold Purchase",
        carat: quickCarat,
        pieces: 1,
        estimatedGoldWeight: quickWeight,
        grossWeight: quickWeight,
        stoneWeight: hasStone ? quickStoneWeight : 0,
        notes: quickNotes,
        isBulkPurchase: true,
    }];

    const canConfirmQuick = quickWeight > 0;
    const canConfirmCategorize = validRows.length > 0 && !isOverAllocated;
    const canConfirm = mode === "quick" ? canConfirmQuick : canConfirmCategorize;

    const addAndClose = () => {
        if (mode === "quick") onConfirm(buildQuickRows());
        else onConfirm(validRows);
        resetAll();
        onClose();
    };

    const handleAddToInvoice = () => { if (!canConfirm) return; addAndClose(); };

    const handleSaveDraftAction = async () => {
        if (!canConfirm) return;
        if (mode === "quick") onConfirm(buildQuickRows());
        else onConfirm(validRows);
        setIsSaving(true);
        try { await onSaveDraft?.(); } finally { setIsSaving(false); }
        resetAll(); onClose();
    };

    const handleSavePdfAction = async () => {
        if (!canConfirm) return;
        if (mode === "quick") onConfirm(buildQuickRows());
        else onConfirm(validRows);
        setIsGenerating(true);
        try { await onGeneratePdf?.(); } finally { setIsGenerating(false); }
        resetAll(); onClose();
    };

    if (!isOpen) return null;

    const barColor = isOverAllocated
        ? "var(--danger)"
        : isFullyAllocated
            ? "var(--success)"
            : "linear-gradient(90deg, var(--gold-dark), var(--gold))";

    const stoneRateLabel =
        stoneRateBasis === "Ratti" ? "Rs / Ratti" :
        stoneRateBasis === "Purity" ? "% of Purity" : "Rs (Direct)";

    return (
        <div style={{
            position: "fixed", inset: 0,
            background: "rgba(26,18,8,0.6)",
            backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: 16,
        }}>
            <div className="card animate-scale-in" style={{
                width: mode === "categorize" ? "min(1080px, 96vw)" : "min(580px, 96vw)",
                maxHeight: "92vh",
                display: "flex", flexDirection: "column",
                overflow: "hidden",
                borderRadius: 16,
                boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
                transition: "width 300ms ease",
            }}>
                {/* ── Header ── */}
                <div className="card-header" style={{
                    padding: "10px 16px",
                    background: "linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%)",
                    borderBottom: "none",
                    flexShrink: 0,
                }}>
                    <h3 style={{ color: "var(--text-on-maroon)", display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
                        <PackagePlus size={16} />
                        {categorizeTitle ?? "Bulk Gold Purchase"}
                    </h3>
                    <button className="btn btn-icon btn-sm" onClick={onClose} style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "var(--text-on-maroon)",
                    }}>
                        <X size={14} />
                    </button>
                </div>

                {/* ── Mode tabs ── */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--cream-light)", flexShrink: 0 }}>
                    {([
                        { key: "quick" as const, Icon: Zap, label: "Quick Entry", sub: "Record full bulk as 1 item" },
                        { key: "categorize" as const, Icon: LayoutList, label: "Categorize", sub: "Split into rings, necklaces…" },
                    ] as const).map(tab => (
                        <button key={tab.key} onClick={() => setMode(tab.key)} style={{
                            flex: 1, padding: "7px 12px",
                            border: "none",
                            borderBottom: mode === tab.key ? "2px solid var(--maroon)" : "2px solid transparent",
                            background: "transparent",
                            color: mode === tab.key ? "var(--maroon)" : "var(--text-muted)",
                            fontWeight: mode === tab.key ? 700 : 500,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                            transition: "all var(--t-fast)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <tab.Icon size={13} />
                                {tab.label}
                            </div>
                            <div style={{ fontSize: "0.6rem", opacity: 0.65 }}>{tab.sub}</div>
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════════════
                    QUICK ENTRY
                ══════════════════════════════════════════════════════════ */}
                {mode === "quick" && (
                    <div style={{ padding: "12px 16px", overflowY: "auto" }}>
                        {/* Description */}
                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Description</label>
                            <input className="form-input"
                                placeholder="e.g. Bulk Gold Stock — Batch #12"
                                value={quickDesc}
                                onChange={e => setQuickDesc(e.target.value)}
                                onFocus={sel}
                                style={{ fontSize: "0.9rem" }}
                            />
                        </div>

                        {/* Weight + Rate */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: "0.8rem" }}>Gold Weight (g)</label>
                                <div style={{ position: "relative" }}>
                                    <input className="form-input" type="number" min={0} step={0.001}
                                        value={quickWeight || ""}
                                        onChange={e => setQuickWeight(Number(e.target.value))}
                                        onFocus={sel}
                                        placeholder="0.000"
                                        style={{ paddingRight: 26, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9375rem" }}
                                    />
                                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--text-muted)" }}>g</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: "0.8rem" }}>Rate (Rs/Tola)</label>
                                <div style={{ position: "relative" }}>
                                    <input className="form-input" type="number" min={0} step={100}
                                        value={quickLocalRate || ""}
                                        onChange={e => setQuickLocalRate(Number(e.target.value))}
                                        onFocus={sel}
                                        placeholder="e.g. 270000"
                                        style={{ paddingRight: 36, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
                                    />
                                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", color: "var(--text-muted)" }}>Rs</span>
                                </div>
                            </div>
                        </div>

                        {/* Ratti + Carat */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: "0.8rem" }}>
                                    Ratti (Kaat)
                                    <span style={{ marginLeft: 6, fontWeight: 400, fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                        Wt × (96−ratti) / 96
                                    </span>
                                </label>
                                <input className="form-input" type="number" min={0} max={96} step={0.5}
                                    value={quickRatti || ""}
                                    onChange={e => setQuickRatti(Number(e.target.value))}
                                    onFocus={sel}
                                    placeholder="e.g. 1"
                                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}
                                />
                                {rattiKalWeight !== null && (
                                    <div style={{ marginTop: 3, fontSize: "0.72rem", color: "var(--success)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                                        = {rattiKalWeight.toFixed(3)} g pure
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: "0.8rem" }}>Purity (Carat)</label>
                                <input className="form-input" type="number" min={1} max={24} step={0.5}
                                    value={quickCarat || ""}
                                    onChange={e => setQuickCarat(Number(e.target.value))}
                                    onFocus={sel}
                                    placeholder="e.g. 21"
                                    style={{ fontSize: "0.9rem" }}
                                />
                                <div style={{ marginTop: 3, fontSize: "0.72rem", color: "var(--gold-dark)", fontWeight: 600 }}>
                                    {quickCarat ? `${((quickCarat / 24) * 100).toFixed(1)}% pure` : ""}
                                </div>
                            </div>
                        </div>

                        {/* Stone checkbox */}
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                <input type="checkbox"
                                    checked={hasStone}
                                    onChange={e => setHasStone(e.target.checked)}
                                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--maroon)" }}
                                />
                                <Gem size={13} style={{ color: hasStone ? "var(--maroon)" : "var(--text-muted)" }} />
                                Has Stone / Gem
                            </label>

                            {hasStone && (
                                <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--cream-light)", border: "1px solid var(--gold-light)", borderRadius: 8 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: "0.78rem" }}>Stone Weight (g)</label>
                                            <div style={{ position: "relative" }}>
                                                <input className="form-input" type="number" min={0} step={0.001}
                                                    value={quickStoneWeight || ""}
                                                    onChange={e => setQuickStoneWeight(Number(e.target.value))}
                                                    onFocus={sel}
                                                    placeholder="0.000"
                                                    style={{ paddingRight: 24, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
                                                />
                                                <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", color: "var(--text-muted)" }}>g</span>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: "0.78rem" }}>{stoneRateLabel}</label>
                                            <input className="form-input" type="number" min={0} step={0.01}
                                                value={stoneRate || ""}
                                                onChange={e => setStoneRate(Number(e.target.value))}
                                                onFocus={sel}
                                                placeholder="0"
                                                style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Rate Basis:</span>
                                        {(["Ratti", "Purity", "Direct"] as StoneRateBasis[]).map(b => (
                                            <label key={b} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: "0.8rem", fontWeight: stoneRateBasis === b ? 700 : 500, color: stoneRateBasis === b ? "var(--maroon)" : "var(--text-secondary)" }}>
                                                <input type="radio"
                                                    checked={stoneRateBasis === b}
                                                    onChange={() => setStoneRateBasis(b)}
                                                    style={{ accentColor: "var(--maroon)", cursor: "pointer" }}
                                                />
                                                {b}
                                            </label>
                                        ))}
                                        {stoneAmount > 0 && (
                                            <span style={{ marginLeft: "auto", fontSize: "0.75rem", fontWeight: 700, color: "var(--maroon)", fontFamily: "var(--font-mono)" }}>
                                                Rs. {stoneAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Notes / Reference (internal)</label>
                            <input className="form-input"
                                placeholder="Supplier ref, lot #, etc."
                                value={quickNotes}
                                onChange={e => setQuickNotes(e.target.value)}
                                onFocus={sel}
                                style={{ fontSize: "0.875rem" }}
                            />
                        </div>

                        {/* Total Summary */}
                        {quickWeight > 0 && (
                            <div style={{ background: "var(--cream-light)", border: "1px solid var(--gold-light)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                                    Total Summary
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 6 }}>
                                    {[
                                        { label: "Gross Weight", value: `${quickWeight.toFixed(3)} g` },
                                        { label: "Ratti Kal (Pure Wt)", value: rattiKalWeight !== null ? `${rattiKalWeight.toFixed(3)} g` : "— (no ratti)", highlight: rattiKalWeight !== null },
                                        { label: "Net Gold (after Kaat)", value: quickCalc ? `${quickCalc.adjustedGoldWeight.toFixed(3)} g` : `${quickWeight.toFixed(3)} g` },
                                        { label: "Purity", value: quickCarat ? `${((quickCarat / 24) * 100).toFixed(1)}%` : "—" },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: "white", borderRadius: 6, padding: "5px 9px", border: "1px solid rgba(0,0,0,0.05)" }}>
                                            <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                                            <div style={{ fontSize: "0.875rem", fontWeight: 800, color: s.highlight ? "var(--success)" : "var(--maroon)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                                {quickCalc && (
                                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Est. Total Amount</span>
                                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--maroon)", fontFamily: "var(--font-mono)" }}>
                                            Rs. {quickCalc.totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Guarantee (exact same as purchase invoice ItemEntryForm) ── */}
                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label className="form-label" style={{
                                color: "var(--gold-dark)", fontWeight: 700,
                                borderLeft: "2px solid var(--gold)", paddingLeft: 5,
                            }}>
                                Guarantee
                            </label>
                            <div style={{
                                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4,
                                background: "var(--cream)",
                                border: "1px solid var(--gold-light)",
                                borderRadius: "var(--radius-sm)",
                                padding: "5px",
                            }}>
                                <div>
                                    <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: 2, paddingLeft: 2 }}>Purity</div>
                                    <input className="form-input" type="number"
                                        min={0} max={1} step={0.001}
                                        value={guaranteePurity.toFixed(3)}
                                        onFocus={sel}
                                        onChange={e => {
                                            const p = Math.min(1, Math.max(0, Number(e.target.value)));
                                            setQuickCarat(Number((p * 24).toFixed(3)));
                                        }}
                                        style={{ height: 28, fontSize: "0.7rem" }}
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.55rem", color: "var(--success)", marginBottom: 2, paddingLeft: 2 }}>Pure (g)</div>
                                    <input className="form-input" readOnly
                                        value={guaranteePureGold.toFixed(3)}
                                        style={{ height: 28, fontSize: "0.7rem", background: "var(--success-bg)", color: "var(--success)", fontWeight: 700, fontFamily: "var(--font-mono)" }}
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: 2, paddingLeft: 2 }}>Alloy (g)</div>
                                    <input className="form-input" readOnly
                                        value={guaranteeAlloy.toFixed(3)}
                                        style={{ height: 28, fontSize: "0.7rem", background: "var(--cream)", fontFamily: "var(--font-mono)" }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Inline Jewellery Rules */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                            <button onClick={() => setShowJewelleryRules(p => !p)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "var(--cream-light)", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                <span>Jewellery Rules (Kaat · Polish · Labour)</span>
                                {showJewelleryRules ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            {showJewelleryRules && (
                                <div style={{ padding: "10px 12px", background: "white", display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div>
                                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Kaat</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: "0.75rem" }}>Basis</label>
                                                <select className="form-select" style={{ fontSize: "0.8rem", height: 32 }} value={localKaatBasis} onChange={e => setLocalKaatBasis(e.target.value as LocalKaatBasis)}>
                                                    <option value="None">None</option>
                                                    <option value="Ratti Kaat">Ratti Kaat</option>
                                                    <option value="Direct Weight">Direct Weight</option>
                                                    <option value="Pasa">Pasa (%)</option>
                                                    <option value="Purity">Purity</option>
                                                </select>
                                            </div>
                                            {localKaatBasis !== "None" && (
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label className="form-label" style={{ fontSize: "0.75rem" }}>
                                                        {localKaatBasis === "Ratti Kaat" ? "Ratti Count" : localKaatBasis === "Direct Weight" ? "Weight (g)" : localKaatBasis === "Pasa" ? "Pasa %" : "Purity %"}
                                                    </label>
                                                    <input className="form-input" type="number" min={0} step={0.1} value={localKaatRate || ""} onChange={e => setLocalKaatRate(Number(e.target.value))} onFocus={sel} style={{ height: 32, fontSize: "0.8rem", fontFamily: "var(--font-mono)" }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Polish</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: "0.75rem" }}>Basis</label>
                                                <select className="form-select" style={{ fontSize: "0.8rem", height: 32 }} value={localPolishBasis} onChange={e => setLocalPolishBasis(e.target.value as PolishLabourBasis)}>
                                                    <option value="Per Tola">Per Tola</option>
                                                    <option value="Pasa">Pasa (%)</option>
                                                    <option value="Ratti Cut">Ratti Cut</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: "0.75rem" }}>Rate</label>
                                                <input className="form-input" type="number" min={0} step={0.1} value={localPolishRate || ""} onChange={e => setLocalPolishRate(Number(e.target.value))} onFocus={sel} style={{ height: 32, fontSize: "0.8rem", fontFamily: "var(--font-mono)" }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Labour</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: "0.75rem" }}>Basis</label>
                                                <select className="form-select" style={{ fontSize: "0.8rem", height: 32 }} value={localLabourBasis} onChange={e => setLocalLabourBasis(e.target.value as LabourBasis)}>
                                                    <option value="Per Tola">Per Tola</option>
                                                    <option value="Per Gram">Per Gram</option>
                                                    <option value="Per Piece">Per Piece</option>
                                                    <option value="Lump Sum">Lump Sum</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: "0.75rem" }}>Rate</label>
                                                <input className="form-input" type="number" min={0} step={0.1} value={localLabourRate || ""} onChange={e => setLocalLabourRate(Number(e.target.value))} onFocus={sel} style={{ height: 32, fontSize: "0.8rem", fontFamily: "var(--font-mono)" }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    CATEGORIZE MODE
                ══════════════════════════════════════════════════════════ */}
                {mode === "categorize" && (
                    <>
                        {/* Bulk header — no Purity field */}
                        <div style={{ padding: "10px 16px", background: "var(--cream-light)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                            <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
                                Total Bulk Weight
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr auto", gap: 8, alignItems: "end" }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.8rem" }}>Total Weight (g)</label>
                                    <div style={{ position: "relative" }}>
                                        <input className="form-input" type="number" min={0} step={0.001}
                                            value={totalBulkWeight || ""}
                                            onChange={e => setTotalBulkWeight(Number(e.target.value))}
                                            onFocus={sel}
                                            placeholder="e.g. 500.000"
                                            style={{ paddingRight: 30, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9375rem" }}
                                        />
                                        <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>g</span>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.8rem" }}>Carat</label>
                                    <input className="form-input" type="number" min={1} max={24} step={0.5}
                                        value={bulkCarat || ""}
                                        onChange={e => setBulkCarat(Number(e.target.value))}
                                        onFocus={sel}
                                        style={{ fontSize: "0.9rem" }}
                                    />
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={applyBulkCarat} style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                                    <Scale size={13} /> Apply to All
                                </button>
                            </div>
                        </div>

                        {/* Allocation tracker */}
                        <div style={{ padding: "8px 16px", background: "white", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 6 }}>
                                {[
                                    { label: "Total Bulk", value: totalBulkWeight > 0 ? `${totalBulkWeight.toFixed(3)} g` : "— g", color: "var(--text-secondary)" },
                                    { label: "Allocated", value: `${allocatedWeight.toFixed(3)} g`, color: "var(--maroon)" },
                                    { label: "Remaining", value: totalBulkWeight > 0 ? `${Math.abs(remainingWeight).toFixed(3)} g` : "— g", color: isOverAllocated ? "var(--danger)" : isFullyAllocated ? "var(--success)" : "var(--warning)" },
                                    { label: "Allocated %", value: totalBulkWeight > 0 ? `${allocationPct.toFixed(1)}%` : "0%", color: isFullyAllocated ? "var(--success)" : isOverAllocated ? "var(--danger)" : "var(--gold-dark)" },
                                ].map(stat => (
                                    <div key={stat.label} style={{ background: "var(--cream-light)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 9px" }}>
                                        <div style={{ fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{stat.label}</div>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 800, color: stat.color, fontFamily: "var(--font-mono)", marginTop: 2 }}>{stat.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: "var(--cream-dark)", borderRadius: 99, height: 7, overflow: "hidden" }}>
                                <div style={{ width: `${allocationPct}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width 300ms ease" }} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 500 }}>
                                    {isOverAllocated && (<><AlertTriangle size={12} style={{ color: "var(--danger)" }} /><span style={{ color: "var(--danger)" }}>Over by {(allocatedWeight - totalBulkWeight).toFixed(3)} g</span></>)}
                                    {isFullyAllocated && (<><CheckCircle2 size={12} style={{ color: "var(--success)" }} /><span style={{ color: "var(--success)" }}>All {totalBulkWeight.toFixed(3)} g categorised</span></>)}
                                    {!isOverAllocated && !isFullyAllocated && totalBulkWeight > 0 && (<span style={{ color: "var(--text-muted)" }}>{remainingWeight.toFixed(3)} g remaining</span>)}
                                </div>
                                {remainingWeight > 0.001 && !isOverAllocated && (
                                    <button className="btn btn-xs btn-ghost" onClick={distributeRemaining}>Distribute Evenly</button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflow: "auto", flex: 1 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                                <thead>
                                    <tr style={{ background: "linear-gradient(180deg, var(--maroon-light), var(--maroon))", color: "rgba(250,246,241,0.95)", position: "sticky", top: 0, zIndex: 2 }}>
                                        {["#", "Category", "Description", "Pcs", "Carat", "Gross Wt (g)", "Gold Wt (g)", "Stone Wt (g)", "Notes", "Est. Amount", ""].map(h => (
                                            <th key={h} style={{ padding: "8px 9px", textAlign: "left", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
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
                                                goldRatePerGram: goldRateToPerGram(goldRate),
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
                                                <td style={{ padding: "4px 9px", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textAlign: "center" }}>{idx + 1}</td>
                                                <td style={{ padding: "4px 5px", minWidth: 130 }}>
                                                    <select className="form-select" style={{ height: 30, fontSize: "0.75rem" }} value={row.categoryId} onChange={e => update(row.id, "categoryId", e.target.value)}>
                                                        <option value="">Select…</option>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: "4px 5px", minWidth: 160 }}>
                                                    <input className="form-input" style={{ height: 30, fontSize: "0.75rem" }} placeholder="e.g. Gold Rings 21K…" value={row.description} onFocus={sel} onChange={e => update(row.id, "description", e.target.value)} />
                                                </td>
                                                <td style={{ padding: "4px 5px", width: 58 }}>
                                                    <input className="form-input" style={{ height: 30, fontSize: "0.75rem", width: 54 }} type="number" min={0} value={row.pieces || ""} onFocus={sel} onChange={e => update(row.id, "pieces", Number(e.target.value))} />
                                                </td>
                                                <td style={{ padding: "4px 5px", width: 68 }}>
                                                    <input className="form-input" style={{ height: 30, fontSize: "0.75rem", width: 64 }} type="number" min={1} max={24} step={0.5} value={row.carat || ""} onFocus={sel} onChange={e => update(row.id, "carat", Number(e.target.value))} />
                                                </td>
                                                <td style={{ padding: "4px 5px", width: 110 }}>
                                                    <input className="form-input" style={{ height: 30, fontSize: "0.8rem", fontFamily: "var(--font-mono)" }} type="number" min={0} step={0.001} value={row.grossWeight || ""} placeholder="0.000" onFocus={sel} onChange={e => update(row.id, "grossWeight", Number(e.target.value))} />
                                                </td>
                                                <td style={{ padding: "4px 5px", width: 120 }}>
                                                    <div style={{ position: "relative" }}>
                                                        <input className="form-input" style={{ height: 30, fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 600 }} type="number" min={0} step={0.001} value={row.estimatedGoldWeight || ""} placeholder="0.000" onFocus={sel} onChange={e => update(row.id, "estimatedGoldWeight", Number(e.target.value))} />
                                                        {rowPct && (
                                                            <span style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", fontSize: "0.5rem", fontWeight: 700, color: "var(--gold-dark)", background: "rgba(201,168,76,0.12)", padding: "1px 3px", borderRadius: 3, pointerEvents: "none" }}>
                                                                {rowPct}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "4px 5px", width: 100 }}>
                                                    <input className="form-input" style={{ height: 30, fontSize: "0.75rem" }} type="number" min={0} step={0.001} value={row.stoneWeight || ""} placeholder="0.000" onFocus={sel} onChange={e => update(row.id, "stoneWeight", Number(e.target.value))} />
                                                </td>
                                                <td style={{ padding: "4px 5px", minWidth: 130 }}>
                                                    <input className="form-input" style={{ height: 30, fontSize: "0.72rem", color: "var(--text-muted)" }} placeholder="Internal note…" value={row.notes ?? ""} onFocus={sel} onChange={e => update(row.id, "notes", e.target.value)} />
                                                </td>
                                                <td style={{ padding: "4px 9px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: calc ? "var(--maroon)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                    {calc ? `Rs. ${calc.totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` : "—"}
                                                </td>
                                                <td style={{ padding: "4px 5px", textAlign: "center" }}>
                                                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => remove(row.id)} style={{ color: "var(--danger)" }}>
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {rows.some(r => r.estimatedGoldWeight > 0) && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={5} style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontSize: "0.6875rem", fontWeight: 700, color: "var(--maroon)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Totals</td>
                                            <td style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                                                {rows.reduce((s, r) => s + (r.grossWeight || 0), 0).toFixed(3)} g
                                            </td>
                                            <td style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 800, color: isOverAllocated ? "var(--danger)" : "var(--maroon)", fontSize: "0.8125rem" }}>
                                                {allocatedWeight.toFixed(3)} g
                                            </td>
                                            <td style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                                                {rows.reduce((s, r) => s + r.stoneWeight, 0).toFixed(3)} g
                                            </td>
                                            <td colSpan={3} style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)" }} />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </>
                )}

                {/* ── Footer ── */}
                <div style={{ flexShrink: 0, padding: "9px 16px", borderTop: "1px solid var(--border)", background: "var(--cream-light)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    {mode === "categorize" ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => setRows(p => [...p, mkRow(bulkCarat)])}>
                            <Plus size={13} /> Add Row
                        </button>
                    ) : (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Zap size={11} />
                            Quick: adds 1 line item · categorise later
                        </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                        {onSaveDraft && (
                            <button className="btn btn-ghost btn-sm" onClick={handleSaveDraftAction} disabled={isSaving || !canConfirm}>
                                <Save size={13} />
                                {isSaving ? "Saving…" : "Save Draft"}
                            </button>
                        )}
                        {onGeneratePdf && (
                            <button className="btn btn-secondary btn-sm" onClick={handleSavePdfAction} disabled={isGenerating || !canConfirm}>
                                <FileText size={13} />
                                {isGenerating ? "Generating…" : "Save + PDF"}
                            </button>
                        )}
                        <button className="btn btn-primary btn-sm" onClick={handleAddToInvoice} disabled={!canConfirm} title={isOverAllocated ? "Reduce weights — total exceeds bulk weight" : ""}>
                            <PackagePlus size={13} />
                            Add to Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
