"use client";

import { useState, useCallback, useMemo } from "react";
import {
    Plus, Trash2, PackagePlus, CheckCircle2, AlertTriangle,
    Scale, Zap, LayoutList, FileText, Save,
    Gem,
} from "lucide-react";
import type { Category } from "@/types";
import { calculateLineItem, goldRateToPerGram, goldRateToPerGramPakka, gramsToPakkaTola, gramsToKachaTola, gramsToTolaMashaRatti } from "@/lib/calculationEngine";
import type { PolishLabourBasis, LabourBasis, KaatBasis } from "@/lib/calculationEngine";
import { useProductTagSuggestions, assignProductTag } from "@/hooks/useProductTags";

export interface BulkRow {
    id: string;
    categoryId: string;
    description: string;
    tagCaption?: string;
    metalName?: string;
    carat: number;
    pieces: number;
    estimatedGoldWeight: number;
    grossWeight?: number;
    adjustedGoldWeight?: number;  // pre-calculated net weight after kaat
    kaatWeight?: number;          // pre-calculated kaat deduction (g)
    kaatBasis?: string;
    kaatRate?: number;
    stoneWeight: number;
    stoneAmount?: number;         // pre-calculated stone total
    goldAmount?: number;          // pre-calculated gold value
    labourAmount?: number;        // pre-calculated labour
    totalAmount?: number;         // pre-calculated total
    notes?: string;
    isBulkPurchase?: boolean;
}

type LocalKaatBasis = "Ratti Kaat" | "Purity" | "None";
type StoneRateBasis = "Per Carat" | "Per Gram" | "Per Piece" | "Per Cent" | "Lumpsum";
type LocalLabourBasis = "Per Tola" | "Per Gram" | "Per Piece" | "Lump Sum";

interface StoneRow {
    id: string;
    type: string;
    pieces: number;
    value: number;   // total weight in selected unit
    unit: "ct" | "g";
    rateBasis: StoneRateBasis;
    rate: number;
    tagCaption: string;
    detail: string;
}

let stoneCounter = 0;
function mkStoneRow(): StoneRow {
    return { id: `stone-${Date.now()}-${++stoneCounter}`, type: "", pieces: 1, value: 0, unit: "g", rateBasis: "Per Gram", rate: 0, tagCaption: "", detail: "" };
}

interface BulkEntryPanelProps {
    onConfirm: (rows: BulkRow[]) => void;
    onModeChange?: (mode: "quick" | "categorize") => void;
    onSaveDraft?: () => Promise<void>;
    onGeneratePdf?: () => Promise<void>;
    categories: Category[];
    metals?: string[];
    onAddMetal?: (name: string) => void;
    onRemoveMetal?: (name: string) => void;
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
        tagCaption: "",
        metalName: "Gold",
        carat,
        pieces: 0,
        estimatedGoldWeight: 0,
        grossWeight: 0,
        stoneWeight: 0,
        notes: "",
    };
}

const sel = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

export default function BulkEntryPanel({
    onConfirm,
    onModeChange,
    onSaveDraft,
    onGeneratePdf,
    categories,
    metals = [],
    onAddMetal,
    onRemoveMetal,
    goldRate,
    polishBasis, polishRate, labourBasis, labourRate, kaatBasis, kaatRate,
}: BulkEntryPanelProps) {
    const [mode, setMode] = useState<"quick" | "categorize">("quick");

    const switchMode = (m: "quick" | "categorize") => {
        setMode(m);
        onModeChange?.(m);
    };

    // ── Quick entry state ──
    const [quickDesc, setQuickDesc] = useState("");
    const [quickMetal, setQuickMetal] = useState("Gold");
    const [quickTagCaption, setQuickTagCaption] = useState("");
    const [quickWeight, setQuickWeight] = useState<number>(0);
    const [quickLocalRate, setQuickLocalRate] = useState<number>(0);
    const [quickPieces, setQuickPieces] = useState<number>(1);
    const [quickCarat, setQuickCarat] = useState<number>(21);
    const [gRatti, setGRatti] = useState<number>(0);   // supplier's guaranteed ratti kaat
    const [hasStone, setHasStone] = useState(false);
    const [stoneRows, setStoneRows] = useState<StoneRow[]>([]);
    const [stoneDraft, setStoneDraft] = useState<StoneRow>(() => mkStoneRow());
    const [editingStoneId, setEditingStoneId] = useState<string | null>(null);
    const [showStoneModal, setShowStoneModal] = useState(false);

    // Base metal name (Gold/Silver/…); carat is entered separately. Defaults to Gold.
    const quickMetalSel = quickMetal || metals[0] || "Gold";

    // tag caption autocomplete — suggest category names (e.g. "Ban" → "Bangles")
    const tagCaptionSuggestions = Array.from(new Set(categories.map(c => c.name)));

    // Description autocomplete — product catalog suggestions for the typed item name
    const productSuggestions = useProductTagSuggestions(quickDesc);
    const descSuggestions = Array.from(new Set(productSuggestions.map(p => p.name)));

    // Auto-load a unique tag caption once the item name is finalized
    const handleQuickDescBlur = async () => {
        const desc = quickDesc.trim();
        if (!desc || quickTagCaption) return;
        const tag = await assignProductTag(desc);
        if (tag) setQuickTagCaption(tag);
    };

    // derived from stone rows
    const totalStoneWeightG  = stoneRows.reduce((sum, r) => sum + (r.unit === "ct" ? r.value * 0.2 : r.value), 0);
    const gramStoneRowsTotalG = stoneRows.filter(r => r.unit === "g").reduce((sum, r) => sum + r.value, 0);
    const caratStoneRowsTotalCt = stoneRows.filter(r => r.unit === "ct").reduce((sum, r) => sum + r.value, 0);
    const totalStoneAmount = stoneRows.reduce((sum, r) => {
        const wG  = r.unit === "ct" ? r.value * 0.2 : r.value;       // always in grams
        const wCt = r.unit === "g"  ? r.value / 0.2 : r.value;       // always in carats (1g = 5ct)
        if (r.rateBasis === "Per Carat") return sum + wCt * r.rate;
        if (r.rateBasis === "Per Cent")  return sum + wCt * 100 * r.rate;
        if (r.rateBasis === "Per Gram")  return sum + wG  * r.rate;
        if (r.rateBasis === "Per Piece") return sum + r.pieces * r.rate;
        return sum + r.rate; // Lumpsum — flat
    }, 0);
    const [quickNotes, setQuickNotes] = useState("");

    // ── Kaat — inline with Carat (not in a collapsible, not duplicated) ──
    const [localKaatBasis, setLocalKaatBasis] = useState<LocalKaatBasis>("Ratti Kaat");
    const [localKaatRate, setLocalKaatRate] = useState<number>(0);

    // ── Labour ──
    const [localLabourBasis, setLocalLabourBasis] = useState<LocalLabourBasis>("Per Gram");
    const [localLabourRate, setLocalLabourRate] = useState<number>(labourRate);


    // ── Categorize state ──
    const [totalBulkWeight, setTotalBulkWeight] = useState<number>(0);
    const [bulkCarat, setBulkCarat] = useState<number>(0);
    const [rows, setRows] = useState<BulkRow[]>([mkRow(0), mkRow(0), mkRow(0)]);

    // ── Loading states ──
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // intentionally not syncing goldRate prop to local rate — user enters it fresh

    // Purchase gold/kaat amounts use Pakka Tola (12.150g), not Kacha Tola (11.664g)
    const goldRatePerGram = goldRateToPerGramPakka(quickLocalRate || goldRate);

    // ── Pure weight after kaat ──
    // Pasa    = auto from carat, no manual entry: weight × (carat/24)
    // Purity  = user enters purity as a decimal:   weight × rate
    // Ratti   = user enters ratti count:           weight × (96−ratti)/96
    const kaatPureWeight = useMemo(() => {
        if (quickWeight <= 0) return null;
        // Ratti: Weight × (96 − ratti) / 96
        if (localKaatBasis === "Ratti Kaat" && localKaatRate > 0)
            return Math.round(quickWeight * (96 - localKaatRate) / 96 * 1000) / 1000;
        // Purity: Weight × purity (decimal), e.g. 200 × 0.88 = 176
        if (localKaatBasis === "Purity" && localKaatRate > 0)
            return Math.round(quickWeight * localKaatRate * 1000) / 1000;
        // Pasa (None): no deduction
        return null;
    }, [quickWeight, localKaatBasis, localKaatRate]);

    const kaatDeduction = kaatPureWeight !== null ? quickWeight - kaatPureWeight : 0;

    // ── Map local kaat basis to engine KaatBasis ──
    // Pasa and Purity both resolve via carat purity — engine handles with undefined kaatBasis
    const effectiveKaatBasis: KaatBasis | undefined =
        localKaatBasis === "Ratti Kaat" ? "Ratti Kaat" : undefined;

    // ── Quick mode calcs ──
    const quickCalc = useMemo(() => {
        if (quickWeight <= 0) return null;
        return calculateLineItem({
            transactionType: "PURCHASE",
            estimatedGoldWeight: quickWeight,
            carat: quickCarat,
            goldRatePerGram,
            polishRate: 0, polishBasis: "Per Tola",
            labourRate: localLabourRate,
            labourBasis: localLabourBasis as import("@/lib/calculationEngine").LabourBasis,
            pieces: quickPieces,
            kaatBasis: effectiveKaatBasis, kaatRate: localKaatRate,
            stoneWeight: hasStone ? totalStoneWeightG : 0,
            beadsWeight: 0, diamondWeight: 0,
            stoneAmount: hasStone ? totalStoneAmount : 0, beadsAmount: 0, diamondAmount: 0,
        });
    }, [quickWeight, quickCarat, goldRatePerGram,
        localLabourRate, localLabourBasis, quickPieces, effectiveKaatBasis, localKaatRate,
        hasStone, totalStoneWeightG, totalStoneAmount]);

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
        setQuickMetal("Gold");
        setQuickTagCaption("");
        setQuickWeight(0);
        setQuickLocalRate(0);
        setQuickPieces(1);
        setQuickCarat(21);
        setGRatti(0);
        setHasStone(false);
        setStoneRows([]);
        setStoneDraft(mkStoneRow());
        setEditingStoneId(null);
        setShowStoneModal(false);
        setQuickNotes("");
        setLocalKaatBasis("Ratti Kaat");
        setLocalKaatRate(0);
        setLocalLabourBasis("Per Gram");
        setLocalLabourRate(labourRate);
        setTotalBulkWeight(0);
        setBulkCarat(0);
        setRows([mkRow(0), mkRow(0), mkRow(0)]);
        switchMode("quick");
    };

    const buildQuickRows = (): BulkRow[] => {
        const adjWt  = kaatPureWeight ?? quickWeight;
        const kaatWt = kaatPureWeight !== null ? quickWeight - kaatPureWeight : 0;
        return [{
            id: `bulk-quick-${Date.now()}`,
            categoryId: "",
            description: quickDesc || "Bulk Metal Purchase",
            tagCaption: quickTagCaption,
            metalName: quickMetalSel,
            carat: quickCarat,
            pieces: quickPieces,
            estimatedGoldWeight: quickWeight,
            grossWeight: quickWeight,
            adjustedGoldWeight: adjWt,
            kaatWeight: kaatWt,
            kaatBasis: localKaatBasis,
            kaatRate: localKaatRate,
            stoneWeight: hasStone ? totalStoneWeightG : 0,
            stoneAmount: hasStone ? totalStoneAmount : 0,
            goldAmount: quickCalc?.goldAmount ?? 0,
            labourAmount: quickCalc?.labourAmount ?? 0,
            totalAmount: quickCalc?.totalAmount ?? 0,
            notes: [gRatti > 0 ? `Guarantee: ${gRatti} ratti` : "", quickNotes].filter(Boolean).join(" | "),
            isBulkPurchase: true,
        }];
    };

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

    const updateStoneRow = (id: string, field: keyof StoneRow, value: unknown) =>
        setStoneRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    const removeStoneRow = (id: string) =>
        setStoneRows(prev => prev.filter(r => r.id !== id));

    return (
        <>
        {/* ══ Gemstone Modal ══════════════════════════════════════════════════ */}
        {showStoneModal && (
            <div style={{
                position: "fixed", inset: 0, zIndex: 1100,
                background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "16px",
            }}>
                <div style={{
                    background: "white", borderRadius: 12,
                    width: "min(780px, 96vw)", maxHeight: "88vh",
                    display: "flex", flexDirection: "column",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.38)",
                    overflow: "hidden",
                }}>
                    <datalist id="bulk-tag-caption-suggestions">
                        {tagCaptionSuggestions.map(name => <option key={name} value={name} />)}
                    </datalist>

                    {/* Modal header */}
                    <div style={{
                        padding: "12px 16px",
                        background: "linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Gem size={16} style={{ color: "rgba(250,246,241,0.9)" }} />
                            <span style={{ color: "var(--text-on-maroon)", fontWeight: 700, fontSize: "0.95rem" }}>Gemstones &amp; Stones</span>
                            <span style={{ fontSize: "0.7rem", color: "rgba(250,246,241,0.65)", marginLeft: 4 }}>Add each stone separately</span>
                        </div>
                        <button onClick={() => setShowStoneModal(false)} style={{
                            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6,
                            color: "white", cursor: "pointer", width: 28, height: 28,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "1rem", fontWeight: 700, lineHeight: 1,
                        }}>×</button>
                    </div>

                    {/* Modal body — Add-row form + table */}
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

                        {/* ── Top add-row form (like old software) ── */}
                        <div style={{ padding: "10px 14px", background: "var(--cream-light)", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                                Add New Stone / Gem
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.5fr 0.9fr 0.7fr 0.8fr 0.8fr auto", gap: 6, alignItems: "end" }}>
                                {/* Type */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.7rem" }}>Stone / Gem Type</label>
                                    <input className="form-input"
                                        placeholder="Ruby, Pearl, Emerald…"
                                        value={stoneDraft.type}
                                        onChange={e => setStoneDraft(d => ({ ...d, type: e.target.value }))}
                                        onFocus={sel}
                                        style={{ fontSize: "0.82rem" }}
                                    />
                                </div>
                                {/* Pcs */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.7rem" }}>Pcs</label>
                                    <input className="form-input" type="number" min={1} step={1}
                                        value={stoneDraft.pieces || ""}
                                        onChange={e => setStoneDraft(d => ({ ...d, pieces: Number(e.target.value) }))}
                                        onFocus={sel}
                                        placeholder="1"
                                        style={{ fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "center" }}
                                    />
                                </div>
                                {/* Weight + unit toggle */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span>Weight</span>
                                        <span style={{ display: "flex", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border)", fontSize: "0.6rem" }}>
                                            {(["g", "ct"] as const).map(u => (
                                                <button key={u} onClick={() => setStoneDraft(d => ({ ...d, unit: u }))} style={{
                                                    padding: "1px 5px", border: "none", cursor: "pointer",
                                                    background: stoneDraft.unit === u ? "var(--maroon)" : "var(--cream)",
                                                    color: stoneDraft.unit === u ? "white" : "var(--text-muted)",
                                                    fontWeight: stoneDraft.unit === u ? 700 : 400,
                                                }}>{u === "ct" ? "ct" : "g"}</button>
                                            ))}
                                        </span>
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <input className="form-input" type="number" min={0} step={0.001}
                                            value={stoneDraft.value || ""}
                                            onChange={e => setStoneDraft(d => ({ ...d, value: Number(e.target.value) }))}
                                            onFocus={sel}
                                            placeholder="0.000"
                                            style={{ paddingRight: 24, fontFamily: "var(--font-mono)", fontWeight: 600 }}
                                        />
                                        <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: "0.62rem", color: "var(--text-muted)" }}>{stoneDraft.unit}</span>
                                    </div>
                                </div>
                                {/* Rate Basis */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.7rem" }}>Basis</label>
                                    <select className="form-select" style={{ fontSize: "0.75rem" }}
                                        value={stoneDraft.rateBasis}
                                        onChange={e => setStoneDraft(d => ({ ...d, rateBasis: e.target.value as StoneRateBasis }))}>
                                        <option value="Per Gram">Per Gram</option>
                                        <option value="Per Carat">Per Carat</option>
                                        <option value="Per Cent">Per Cent</option>
                                        <option value="Per Piece">Per Piece</option>
                                        <option value="Lumpsum">Lumpsum</option>
                                    </select>
                                </div>
                                {/* Rate */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.7rem" }}>
                                        Rate ({stoneDraft.rateBasis === "Lumpsum" ? "flat" : stoneDraft.rateBasis === "Per Carat" ? "Rs/ct" : stoneDraft.rateBasis === "Per Cent" ? "Rs/cent" : stoneDraft.rateBasis === "Per Piece" ? "Rs/pc" : "Rs/g"})
                                    </label>
                                    <input className="form-input" type="number" min={0} step={0.01}
                                        value={stoneDraft.rate || ""}
                                        onChange={e => setStoneDraft(d => ({ ...d, rate: Number(e.target.value) }))}
                                        onFocus={sel}
                                        placeholder="0"
                                        style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
                                    />
                                </div>
                                {/* Preview amount */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.7rem" }}>Amount</label>
                                    <div style={{ height: 34, display: "flex", alignItems: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.82rem", color: "var(--maroon)", paddingLeft: 4 }}>
                                        {(() => {
                                            const wG  = stoneDraft.unit === "ct" ? stoneDraft.value * 0.2 : stoneDraft.value;
                                            const wCt = stoneDraft.unit === "g"  ? stoneDraft.value / 0.2 : stoneDraft.value;
                                            const amt = stoneDraft.rateBasis === "Per Carat" ? wCt * stoneDraft.rate :
                                                        stoneDraft.rateBasis === "Per Cent"  ? wCt * 100 * stoneDraft.rate :
                                                        stoneDraft.rateBasis === "Per Gram"  ? wG  * stoneDraft.rate :
                                                        stoneDraft.rateBasis === "Per Piece" ? stoneDraft.pieces * stoneDraft.rate :
                                                        stoneDraft.rate;
                                            return amt > 0 ? `Rs.${amt.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` : "—";
                                        })()}
                                    </div>
                                </div>
                                {/* Add button */}
                                <button onClick={() => {
                                    setStoneRows(p => [...p, { ...stoneDraft, id: `stone-${Date.now()}-${++stoneCounter}` }]);
                                    setStoneDraft(mkStoneRow());
                                }} style={{
                                    height: 34, padding: "0 14px", border: "none", borderRadius: 6,
                                    background: "var(--maroon)", color: "white", cursor: "pointer",
                                    fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5,
                                    whiteSpace: "nowrap", marginTop: 18,
                                }}>
                                    <Plus size={13} /> Add
                                </button>
                            </div>
                            {/* Tag Caption / Detail (for printed tags) */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.7rem" }}>Tag Caption</label>
                                    <input className="form-input"
                                        placeholder="e.g. Ruby, Ban…"
                                        value={stoneDraft.tagCaption}
                                        onChange={e => setStoneDraft(d => ({ ...d, tagCaption: e.target.value }))}
                                        onFocus={sel}
                                        list="bulk-tag-caption-suggestions"
                                        style={{ fontSize: "0.82rem" }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: "0.7rem" }}>Detail</label>
                                    <input className="form-input"
                                        placeholder="e.g. Burma Ruby, oval cut"
                                        value={stoneDraft.detail}
                                        onChange={e => setStoneDraft(d => ({ ...d, detail: e.target.value }))}
                                        onFocus={sel}
                                        style={{ fontSize: "0.82rem" }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Stone table (spreadsheet style, each row editable) ── */}
                        <div style={{ overflowY: "auto", flex: 1 }}>
                            {stoneRows.length === 0 ? (
                                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px 0", fontSize: "0.82rem" }}>
                                    No stones added yet — fill the form above and click Add
                                </div>
                            ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                                    <thead>
                                        <tr style={{ background: "var(--cream-light)", borderBottom: "2px solid var(--border)" }}>
                                            {["S.No", "Type", "Tag Caption", "Detail", "Pcs", "Weight", "Unit", "Basis", "Rate", "Amount", ""].map(h => (
                                                <th key={h} style={{ padding: "6px 8px", textAlign: h === "Amount" || h === "Rate" ? "right" : "left", fontWeight: 700, fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stoneRows.map((sr, idx) => {
                                            const srWeightG  = sr.unit === "ct" ? sr.value * 0.2 : sr.value;
                                            const srWeightCt = sr.unit === "g"  ? sr.value / 0.2 : sr.value;
                                            const srAmount =
                                                sr.rateBasis === "Per Carat" ? srWeightCt * sr.rate :
                                                sr.rateBasis === "Per Cent"  ? srWeightCt * 100 * sr.rate :
                                                sr.rateBasis === "Per Gram"  ? srWeightG  * sr.rate :
                                                sr.rateBasis === "Per Piece" ? sr.pieces  * sr.rate :
                                                sr.rate;
                                            const isEditing = editingStoneId === sr.id;
                                            const rowBg = isEditing ? "rgba(92,10,10,0.04)" : idx % 2 === 0 ? "white" : "var(--cream-light)";
                                            return (
                                                <tr key={sr.id} style={{ background: rowBg, borderBottom: "1px solid var(--border)" }}>
                                                    {/* S.No */}
                                                    <td style={{ padding: "4px 8px", color: "var(--text-muted)", fontWeight: 600, width: 36 }}>{idx + 1}</td>
                                                    {/* Type */}
                                                    <td style={{ padding: "4px 6px", minWidth: 100 }}>
                                                        {isEditing
                                                            ? <input className="form-input" value={sr.type} onChange={e => updateStoneRow(sr.id, "type", e.target.value)} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28 }} />
                                                            : <span style={{ cursor: "pointer" }} onClick={() => setEditingStoneId(sr.id)}>{sr.type || <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
                                                        }
                                                    </td>
                                                    {/* Tag Caption */}
                                                    <td style={{ padding: "4px 6px", minWidth: 90 }}>
                                                        {isEditing
                                                            ? <input className="form-input" value={sr.tagCaption} onChange={e => updateStoneRow(sr.id, "tagCaption", e.target.value)} onFocus={sel} list="bulk-tag-caption-suggestions" style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28 }} />
                                                            : <span style={{ cursor: "pointer" }} onClick={() => setEditingStoneId(sr.id)}>{sr.tagCaption || <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
                                                        }
                                                    </td>
                                                    {/* Detail */}
                                                    <td style={{ padding: "4px 6px", minWidth: 110 }}>
                                                        {isEditing
                                                            ? <input className="form-input" value={sr.detail} onChange={e => updateStoneRow(sr.id, "detail", e.target.value)} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28 }} />
                                                            : <span style={{ cursor: "pointer" }} onClick={() => setEditingStoneId(sr.id)}>{sr.detail || <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
                                                        }
                                                    </td>
                                                    {/* Pcs */}
                                                    <td style={{ padding: "4px 6px", width: 52 }}>
                                                        {isEditing
                                                            ? <input className="form-input" type="number" min={1} value={sr.pieces || ""} onChange={e => updateStoneRow(sr.id, "pieces", Number(e.target.value))} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28, width: 48, textAlign: "center" }} />
                                                            : <span style={{ cursor: "pointer" }} onClick={() => setEditingStoneId(sr.id)}>{sr.pieces}</span>
                                                        }
                                                    </td>
                                                    {/* Weight */}
                                                    <td style={{ padding: "4px 6px", width: 80 }}>
                                                        {isEditing
                                                            ? <input className="form-input" type="number" min={0} step={0.001} value={sr.value || ""} onChange={e => updateStoneRow(sr.id, "value", Number(e.target.value))} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28, width: 74, fontFamily: "var(--font-mono)" }} />
                                                            : <span style={{ cursor: "pointer", fontFamily: "var(--font-mono)" }} onClick={() => setEditingStoneId(sr.id)}>{sr.value > 0 ? sr.value.toFixed(3) : "—"}</span>
                                                        }
                                                    </td>
                                                    {/* Unit toggle */}
                                                    <td style={{ padding: "4px 6px", width: 58 }}>
                                                        <span style={{ display: "inline-flex", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border)", fontSize: "0.62rem" }}>
                                                            {(["g", "ct"] as const).map(u => (
                                                                <button key={u} onClick={() => updateStoneRow(sr.id, "unit", u)} style={{
                                                                    padding: "2px 5px", border: "none", cursor: "pointer",
                                                                    background: sr.unit === u ? "var(--maroon)" : "transparent",
                                                                    color: sr.unit === u ? "white" : "var(--text-muted)",
                                                                    fontWeight: sr.unit === u ? 700 : 400,
                                                                }}>{u}</button>
                                                            ))}
                                                        </span>
                                                    </td>
                                                    {/* Basis */}
                                                    <td style={{ padding: "4px 6px", width: 90 }}>
                                                        {isEditing
                                                            ? <select className="form-select" value={sr.rateBasis} onChange={e => updateStoneRow(sr.id, "rateBasis", e.target.value as StoneRateBasis)} style={{ fontSize: "0.72rem", padding: "2px 4px", height: 28 }}>
                                                                {(["Per Gram", "Per Carat", "Per Cent", "Per Piece", "Lumpsum"] as StoneRateBasis[]).map(b => <option key={b} value={b}>{b}</option>)}
                                                              </select>
                                                            : <span style={{ cursor: "pointer", fontSize: "0.72rem", color: "var(--text-secondary)" }} onClick={() => setEditingStoneId(sr.id)}>{sr.rateBasis}</span>
                                                        }
                                                    </td>
                                                    {/* Rate */}
                                                    <td style={{ padding: "4px 6px", textAlign: "right", width: 72 }}>
                                                        {isEditing
                                                            ? <input className="form-input" type="number" min={0} value={sr.rate || ""} onChange={e => updateStoneRow(sr.id, "rate", Number(e.target.value))} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28, width: 66, fontFamily: "var(--font-mono)", textAlign: "right" }} />
                                                            : <span style={{ cursor: "pointer", fontFamily: "var(--font-mono)" }} onClick={() => setEditingStoneId(sr.id)}>{sr.rate > 0 ? sr.rate.toLocaleString("en-PK") : "—"}</span>
                                                        }
                                                    </td>
                                                    {/* Amount */}
                                                    <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--maroon)", width: 80 }}>
                                                        {srAmount > 0 ? `Rs.${srAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` : "—"}
                                                    </td>
                                                    {/* Actions */}
                                                    <td style={{ padding: "4px 6px", width: 60 }}>
                                                        <div style={{ display: "flex", gap: 3 }}>
                                                            {isEditing
                                                                ? <button onClick={() => setEditingStoneId(null)} style={{ padding: "2px 7px", border: "1px solid var(--success)", borderRadius: 4, background: "transparent", color: "var(--success)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>✓</button>
                                                                : <button onClick={() => setEditingStoneId(sr.id)} style={{ padding: "2px 7px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.72rem" }}>Edit</button>
                                                            }
                                                            <button onClick={() => { removeStoneRow(sr.id); if (editingStoneId === sr.id) setEditingStoneId(null); }} style={{ padding: "2px 5px", border: "none", borderRadius: 4, background: "transparent", color: "var(--danger)", cursor: "pointer" }}>
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Modal footer — totals + Done */}
                    <div style={{
                        padding: "10px 16px",
                        borderTop: "2px solid var(--gold-light)",
                        background: "var(--cream-light)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    }}>
                        <div style={{ display: "flex", gap: 20 }}>
                            <div>
                                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Stones</div>
                                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                                    {stoneRows.reduce((s, r) => s + r.pieces, 0)} pcs · {[
                                        gramStoneRowsTotalG > 0 ? `${gramStoneRowsTotalG.toFixed(3)} g` : null,
                                        caratStoneRowsTotalCt > 0 ? `${caratStoneRowsTotalCt.toFixed(2)} ct` : null,
                                    ].filter(Boolean).join(" + ") || "0.000 g"}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Amount</div>
                                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.95rem", color: "var(--maroon)" }}>
                                    Rs. {totalStoneAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowStoneModal(false)} style={{ minWidth: 90 }}>
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="card animate-fade-in" style={{ display: "flex", flexDirection: "column" }}>
            {/* ── Header ── */}
            <div className="card-header" style={{
                padding: "9px 14px",
                background: "linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%)",
                borderBottom: "none",
            }}>
                <h3 style={{ color: "var(--text-on-maroon)", display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
                    <PackagePlus size={15} />
                    Bulk Metal Purchase Entry
                </h3>
            </div>

            {/* ── Mode tabs ── */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--cream-light)" }}>
                {([
                    { key: "quick" as const, Icon: Zap, label: "Quick Entry", sub: "Record full bulk as 1 item" },
                    { key: "categorize" as const, Icon: LayoutList, label: "Categorize", sub: "Split into rings, necklaces…" },
                ] as const).map(tab => (
                    <button key={tab.key} onClick={() => switchMode(tab.key)} style={{
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
                <div style={{ padding: "12px 14px", overflowY: "auto" }}>

                    {/* 1. Metal + Tag Caption + Description */}
                    <div style={{ display: "grid", gridTemplateColumns: "0.7fr 0.6fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Metal</label>
                            <div style={{ display: "flex", gap: 4 }}>
                                <select className="form-select" style={{ flex: 1, fontSize: "0.9rem" }}
                                    value={quickMetalSel}
                                    onChange={e => {
                                        const v = e.target.value;
                                        if (v === "__add__") {
                                            const name = window.prompt("New metal name (e.g. Palladium)")?.trim();
                                            if (name) { onAddMetal?.(name); setQuickMetal(name); }
                                            return;
                                        }
                                        setQuickMetal(v);
                                    }}>
                                    {metals.map(m => <option key={m} value={m}>{m}</option>)}
                                    {!metals.some(m => m.toLowerCase() === quickMetalSel.toLowerCase()) && (
                                        <option value={quickMetalSel}>{quickMetalSel}</option>
                                    )}
                                    <option value="__add__">+ Add metal…</option>
                                </select>
                                <button type="button" className="btn btn-ghost btn-icon"
                                    title={`Remove "${quickMetalSel}" from the metal list`}
                                    disabled={metals.length <= 1}
                                    onClick={() => {
                                        if (window.confirm(`Remove "${quickMetalSel}" from the metal list?`)) {
                                            onRemoveMetal?.(quickMetalSel);
                                            const next = metals.find(m => m.toLowerCase() !== quickMetalSel.toLowerCase());
                                            setQuickMetal(next ?? "");
                                        }
                                    }}
                                    style={{ width: 30, minWidth: 30, padding: 0 }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Tag Caption</label>
                            <input className="form-input"
                                placeholder="e.g. Ban…"
                                value={quickTagCaption}
                                onChange={e => setQuickTagCaption(e.target.value)}
                                onFocus={sel}
                                list="bulk-quick-tagcaption-list"
                                style={{ fontSize: "0.9rem" }}
                            />
                            <datalist id="bulk-quick-tagcaption-list">
                                {tagCaptionSuggestions.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Description</label>
                            <input className="form-input" list="bulk-quick-desc-list"
                                placeholder="e.g. Bulk Gold Stock — Batch #12"
                                value={quickDesc}
                                onChange={e => setQuickDesc(e.target.value)}
                                onFocus={sel}
                                onBlur={handleQuickDescBlur}
                                style={{ fontSize: "0.9rem" }}
                            />
                            <datalist id="bulk-quick-desc-list">
                                {descSuggestions.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* 2. Weight + Pcs + Rate — always 3-column */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>{quickMetalSel} Weight (g)</label>
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
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>PCS</label>
                            <input className="form-input" type="number" min={1} step={1}
                                value={quickPieces || ""}
                                onChange={e => setQuickPieces(Number(e.target.value))}
                                onFocus={sel}
                                placeholder="1"
                                style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9375rem", textAlign: "center" }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Rate (Rs/Tola)</label>
                            <div style={{ position: "relative" }}>
                                <input className="form-input" type="number" min={0} step={100}
                                    value={quickLocalRate || ""}
                                    onChange={e => setQuickLocalRate(Number(e.target.value))}
                                    onFocus={sel}
                                    placeholder="e.g. 270000"
                                    style={{ paddingRight: 32, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
                                />
                                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", color: "var(--text-muted)" }}>Rs</span>
                            </div>
                        </div>
                    </div>

                    {/* Gold Weight — Pakka / Kacha Tola conversion */}
                    {quickWeight > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "4px 6px", background: "rgba(201,168,76,0.08)", borderRadius: 5, marginBottom: 8 }}>
                            <div>
                                <div style={{ fontSize: "0.58rem", color: "var(--gold-dark)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pakka Tola (÷12.150)</div>
                                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.82rem", color: "var(--maroon)" }}>{gramsToPakkaTola(quickWeight).toFixed(4)}<span style={{ fontSize: "0.62rem", fontWeight: 500, marginLeft: 3 }}>tola</span></div>
                            </div>
                            <div>
                                <div style={{ fontSize: "0.58rem", color: "var(--gold-dark)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Kacha Tola (÷11.664)</div>
                                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.82rem", color: "var(--text-secondary)" }}>{gramsToKachaTola(quickWeight).toFixed(4)}<span style={{ fontSize: "0.62rem", fontWeight: 500, marginLeft: 3 }}>tola</span></div>
                            </div>
                        </div>
                    )}

                    {/* 3. Purity & Kaat */}
                    <div style={{ padding: "8px 10px", background: "var(--cream-light)", border: "1px solid var(--gold-light)", borderRadius: 8, marginBottom: 8 }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                            Purity &amp; Kaat
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: "0.78rem" }}>Carat</label>
                                <input className="form-input" type="number" min={0} max={24} step={0.5}
                                    value={quickCarat || ""}
                                    onChange={e => setQuickCarat(Number(e.target.value))}
                                    onFocus={sel}
                                    placeholder="e.g. 21"
                                    style={{ fontSize: "0.9rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                                />
                                {quickCarat > 0 && (
                                    <div style={{ marginTop: 2, fontSize: "0.68rem", color: "var(--gold-dark)", fontWeight: 600 }}>
                                        {((quickCarat / 24) * 100).toFixed(1)}% pure
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: "0.78rem" }}>Kaat Basis</label>
                                <select className="form-select" style={{ fontSize: "0.8rem" }}
                                    value={localKaatBasis}
                                    onChange={e => setLocalKaatBasis(e.target.value as LocalKaatBasis)}>
                                    <option value="Ratti Kaat">Ratti</option>
                                    <option value="None">Pasa</option>
                                    <option value="Purity">Purity</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: "0.78rem" }}>
                                    {localKaatBasis === "Ratti Kaat"
                                        ? "Ratti  —  Wt × (96 − ratti) / 96"
                                        : localKaatBasis === "Purity"
                                        ? "Purity  —  Wt × purity"
                                        : "Pasa  —  No Cutting"}
                                </label>
                                <input className="form-input" type="number" min={0} step={localKaatBasis === "Purity" ? 0.001 : 0.1}
                                    max={localKaatBasis === "Purity" ? 1 : undefined}
                                    value={localKaatRate || ""}
                                    onChange={e => setLocalKaatRate(Number(e.target.value))}
                                    onFocus={sel}
                                    placeholder={localKaatBasis === "None" ? "—" : localKaatBasis === "Purity" ? "e.g. .88" : "e.g. 4"}
                                    disabled={localKaatBasis === "None"}
                                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", opacity: localKaatBasis === "None" ? 0.4 : 1 }}
                                />
                            </div>
                        </div>
                        {kaatPureWeight !== null && quickWeight > 0 && (
                            <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem" }}>
                                <span style={{ color: "var(--text-muted)" }}>{quickWeight.toFixed(3)} g</span>
                                <span style={{ color: "var(--text-muted)" }}>−</span>
                                <span style={{ color: "var(--danger)", fontWeight: 600 }}>{(quickWeight - kaatPureWeight).toFixed(3)} g {localKaatBasis === "Purity" ? "deducted" : "kaat"}</span>
                                <span style={{ color: "var(--text-muted)" }}>=</span>
                                <span style={{ color: "var(--success)", fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{kaatPureWeight.toFixed(3)} g pure</span>
                                {localKaatBasis === "Ratti Kaat" && localKaatRate > 0 && (
                                    <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--text-muted)" }}>Wt × (96−{localKaatRate}) / 96</span>
                                )}
                                {localKaatBasis === "Purity" && localKaatRate > 0 && (
                                    <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--text-muted)" }}>{quickWeight} × {localKaatRate.toFixed(3)} = {(quickWeight * localKaatRate).toFixed(3)} g</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 4. Labour */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Labour Basis</label>
                            <select className="form-select" value={localLabourBasis} onChange={e => setLocalLabourBasis(e.target.value as LocalLabourBasis)}>
                                <option value="Per Tola">Per Tola</option>
                                <option value="Per Gram">Per Gram</option>
                                <option value="Per Piece">Per Piece</option>
                                <option value="Lump Sum">Lump Sum</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>
                                Labour Rate {localLabourBasis === "Per Tola" ? "(Rs/Tola)" : localLabourBasis === "Per Gram" ? "(Rs/g)" : localLabourBasis === "Per Piece" ? "(Rs/Pc)" : "(Rs flat)"}
                            </label>
                            <input className="form-input" type="number" min={0} step={1}
                                value={localLabourRate || ""}
                                onChange={e => setLocalLabourRate(Number(e.target.value))}
                                onFocus={sel}
                                placeholder="0"
                                style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
                            />
                        </div>
                    </div>

                    {/* Per Tola labour — Pakka vs Kacha comparison */}
                    {localLabourBasis === "Per Tola" && localLabourRate > 0 && quickWeight > 0 && (
                        <div style={{
                            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
                            padding: "7px 10px", marginBottom: 8,
                            background: "rgba(201,168,76,0.07)",
                            border: "1px solid var(--gold-light)", borderRadius: 7,
                        }}>
                            <div style={{ gridColumn: "1 / -1", fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                                Labour Rates
                            </div>
                            <div>
                                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Labour Rate (Kacha Tola)</div>
                                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: 2 }}>
                                    {gramsToKachaTola(quickWeight).toFixed(4)} tola × Rs.{localLabourRate}
                                </div>
                                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                                    Rs. {(gramsToKachaTola(quickWeight) * localLabourRate).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Labour Rate (Pakka Tola)</div>
                                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: 2 }}>
                                    {gramsToPakkaTola(quickWeight).toFixed(4)} tola × Rs.{localLabourRate}
                                </div>
                                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.88rem", color: "var(--maroon)" }}>
                                    Rs. {(gramsToPakkaTola(quickWeight) * localLabourRate).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div style={{ gridColumn: "1 / -1", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 1 }}>
                                ↑ On gross weight ({quickWeight.toFixed(3)} g) — engine uses Kacha Tola by default
                            </div>
                        </div>
                    )}

                    {/* 5. Supplier Guarantee — ratti kaat only, no verification */}
                    <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>Guaranteed Ratti Kaat (Supplier's claim)</label>
                        <input className="form-input" type="number" min={0} step={0.5}
                            value={gRatti || ""}
                            onChange={e => setGRatti(Number(e.target.value))}
                            onFocus={sel}
                            placeholder="e.g. 12"
                            style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
                        />
                    </div>

                    {/* 6. Stone / Gemstone — checkbox opens modal for multi-stone entry */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{
                            display: "flex", alignItems: "center",
                            padding: "7px 10px",
                            background: hasStone ? "rgba(92,10,10,0.05)" : "var(--cream-light)",
                            border: `1px solid ${hasStone ? "var(--maroon)" : "var(--border)"}`,
                            borderRadius: 8,
                            gap: 8,
                        }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", flex: 1 }}>
                                <input type="checkbox"
                                    checked={hasStone}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setHasStone(checked);
                                        if (checked) {
                                            if (stoneRows.length === 0) setStoneRows([mkStoneRow()]);
                                            setShowStoneModal(true);
                                        } else {
                                            setStoneRows([]);
                                        }
                                    }}
                                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--maroon)" }}
                                />
                                <Gem size={14} style={{ color: hasStone ? "var(--maroon)" : "var(--text-muted)" }} />
                                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: hasStone ? "var(--maroon)" : "var(--text-secondary)" }}>
                                    Gemstone / Stone purchased
                                </span>
                            </label>
                            {!hasStone && (
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>tick to add details</span>
                            )}
                            {hasStone && (
                                <button onClick={() => setShowStoneModal(true)} style={{
                                    background: "var(--maroon)", border: "none", borderRadius: 6,
                                    color: "white", cursor: "pointer", padding: "3px 10px",
                                    fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap",
                                    display: "flex", alignItems: "center", gap: 5,
                                }}>
                                    <Gem size={11} />
                                    {stoneRows.length > 0
                                        ? `${stoneRows.reduce((s, r) => s + r.pieces, 0)} pcs · ${totalStoneWeightG.toFixed(2)} g · Rs. ${totalStoneAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })} · Edit`
                                        : "Add Stones"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 6. Notes */}
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

                    {/* 8. Total Summary — weight breakdown + charges */}
                    {quickCalc && quickWeight > 0 && (
                        <div style={{
                            marginTop: 8, padding: "10px 12px",
                            background: "linear-gradient(135deg, rgba(92,10,10,0.04), rgba(201,168,76,0.06))",
                            border: "1px solid var(--gold-light)", borderRadius: 8,
                        }}>
                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                                Calculation Summary
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {/* Weight rows */}
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Gold Weight (Gross)</span>
                                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontWeight: 600 }}>
                                        {quickWeight.toFixed(3)} g
                                    </span>
                                </div>
                                {kaatDeduction > 0 && (
                                    <>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.78rem" }}>
                                            <span style={{ color: "var(--danger)" }}>
                                                Kaat ({localKaatBasis === "Ratti Kaat" ? `${localKaatRate} ratti` : `Purity ${localKaatRate}`})
                                            </span>
                                            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                                                <span style={{ fontFamily: "var(--font-mono)", color: "var(--danger)", fontWeight: 600 }}>
                                                    − {kaatDeduction.toFixed(3)} g
                                                </span>
                                                <span style={{ fontFamily: "var(--font-mono)", color: "var(--danger)", fontSize: "0.68rem", opacity: 0.85 }}>
                                                    = −Rs. {(kaatDeduction * goldRatePerGram).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                                </span>
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", borderBottom: "1px dashed var(--border)", paddingBottom: 4, marginBottom: 2 }}>
                                            <span style={{ color: "var(--success)", fontWeight: 700 }}>Net Gold Weight</span>
                                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 800 }}>
                                                {kaatPureWeight!.toFixed(3)} g
                                            </span>
                                        </div>
                                    </>
                                )}
                                {/* Gold Amount — both Pakka and Kacha tola, based on entered Gold Wt */}
                                {quickWeight > 0 && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "4px 6px", background: "rgba(201,168,76,0.08)", borderRadius: 5, margin: "2px 0" }}>
                                        <div>
                                            <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Gold (Pakka ÷12.150)</div>
                                            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.82rem", color: "var(--maroon)" }}>
                                                Rs. {(quickWeight * goldRateToPerGramPakka(quickLocalRate || goldRate)).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Gold (Kacha ÷11.664)</div>
                                            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                                                Rs. {(quickWeight * goldRateToPerGram(quickLocalRate || goldRate)).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Tola / Masha / Ratti breakdown of Pure Wt */}
                                {quickCalc.adjustedGoldWeight > 0 && (() => {
                                    const tmr = gramsToTolaMashaRatti(quickCalc.adjustedGoldWeight);
                                    return (
                                        <div style={{ background: "rgba(92,10,10,0.04)", borderRadius: 5, padding: "4px 6px", margin: "2px 0", textAlign: "center" }}>
                                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.75rem", color: "var(--maroon)" }}>
                                                {tmr.tola} Tola {tmr.masha} Masha {tmr.ratti.toFixed(2)} Ratti
                                            </span>
                                        </div>
                                    );
                                })()}
                                {/* Amount rows */}
                                {[
                                    { label: "Labour", value: quickCalc.labourAmount, show: (quickCalc.labourAmount ?? 0) !== 0 },
                                ].filter(r => r.show).map(r => (
                                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                                        <span style={{ color: "var(--text-muted)" }}>{r.label}</span>
                                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                                            Rs. {(r.value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                ))}
                                {hasStone && totalStoneAmount > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", alignItems: "flex-end" }}>
                                        <span style={{ color: "var(--text-muted)" }}>Stone / Gem</span>
                                        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                                            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                                {[
                                                    gramStoneRowsTotalG > 0 ? `${gramStoneRowsTotalG.toFixed(3)} g` : null,
                                                    caratStoneRowsTotalCt > 0 ? `${caratStoneRowsTotalCt.toFixed(2)} ct` : null,
                                                ].filter(Boolean).join(" + ") || "0.000 g"}
                                            </span>
                                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                                                Rs. {totalStoneAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                            </span>
                                        </span>
                                    </div>
                                )}
                                <div style={{ borderTop: "1px solid var(--gold-light)", marginTop: 3, paddingTop: 4, display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--maroon)" }}>Total</span>
                                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.9rem", color: "var(--maroon)" }}>
                                        Rs. {quickCalc.totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                CATEGORIZE MODE
            ══════════════════════════════════════════════════════════ */}
            {mode === "categorize" && (
                <>
                    {/* Bulk header — removed Purity field */}
                    <div style={{ padding: "10px 14px", background: "var(--cream-light)", borderBottom: "1px solid var(--border)" }}>
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
                    <div style={{ padding: "8px 14px", background: "white", borderBottom: "1px solid var(--border)" }}>
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

                    {/* Table — new columns: Gross Wt, Notes; removed Purity */}
                    <datalist id="bulk-row-tagcaption-list">
                        {tagCaptionSuggestions.map(name => <option key={name} value={name} />)}
                    </datalist>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                            <thead>
                                <tr style={{ background: "linear-gradient(180deg, var(--maroon-light), var(--maroon))", color: "rgba(250,246,241,0.95)", position: "sticky", top: 0, zIndex: 2 }}>
                                    {["#", "Category", "Tag Caption", "Description", "Pcs", "Carat", "Gross Wt (g)", "Gold Wt (g)", "Stone Wt (g)", "Notes", ""].map(h => (
                                        <th key={h} style={{ padding: "8px 9px", textAlign: "left", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => {
                                    const rowPct = totalBulkWeight > 0 && row.estimatedGoldWeight > 0
                                        ? (row.estimatedGoldWeight / totalBulkWeight * 100).toFixed(1)
                                        : null;
                                    return (
                                        <tr key={row.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: idx % 2 === 0 ? "white" : "rgba(251,245,238,0.4)" }}>
                                            <td style={{ padding: "4px 9px", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textAlign: "center" }}>{idx + 1}</td>
                                            <td style={{ padding: "4px 5px", minWidth: 130 }}>
                                                <select className="form-select" style={{ height: 30, fontSize: "0.75rem" }}
                                                    value={row.categoryId}
                                                    onChange={e => update(row.id, "categoryId", e.target.value)}>
                                                    <option value="">Select…</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: "4px 5px", minWidth: 90 }}>
                                                <input className="form-input" style={{ height: 30, fontSize: "0.75rem" }}
                                                    placeholder="e.g. Ban…"
                                                    value={row.tagCaption || ""}
                                                    onFocus={sel}
                                                    list="bulk-row-tagcaption-list"
                                                    onChange={e => update(row.id, "tagCaption", e.target.value)}
                                                />
                                            </td>
                                            <td style={{ padding: "4px 5px", minWidth: 160 }}>
                                                <input className="form-input" style={{ height: 30, fontSize: "0.75rem" }}
                                                    placeholder="e.g. Gold Rings 21K…"
                                                    value={row.description}
                                                    onFocus={sel}
                                                    onChange={e => update(row.id, "description", e.target.value)}
                                                />
                                            </td>
                                            <td style={{ padding: "4px 5px", width: 58 }}>
                                                <input className="form-input" style={{ height: 30, fontSize: "0.75rem", width: 54 }}
                                                    type="number" min={0}
                                                    value={row.pieces || ""}
                                                    onFocus={sel}
                                                    onChange={e => update(row.id, "pieces", Number(e.target.value))}
                                                />
                                            </td>
                                            <td style={{ padding: "4px 5px", width: 68 }}>
                                                <input className="form-input" style={{ height: 30, fontSize: "0.75rem", width: 64 }}
                                                    type="number" min={0} max={24} step={0.5}
                                                    value={row.carat || ""}
                                                    placeholder="21"
                                                    onFocus={sel}
                                                    onChange={e => update(row.id, "carat", Number(e.target.value))}
                                                />
                                            </td>
                                            <td style={{ padding: "4px 5px", width: 110 }}>
                                                <input className="form-input" style={{ height: 30, fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                                                    type="number" min={0} step={0.001}
                                                    value={row.grossWeight || ""}
                                                    placeholder="0.000"
                                                    onFocus={sel}
                                                    onChange={e => update(row.id, "grossWeight", Number(e.target.value))}
                                                />
                                            </td>
                                            <td style={{ padding: "4px 5px", width: 120 }}>
                                                <div style={{ position: "relative" }}>
                                                    <input className="form-input"
                                                        style={{ height: 30, fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}
                                                        type="number" min={0} step={0.001}
                                                        value={row.estimatedGoldWeight || ""}
                                                        placeholder="0.000"
                                                        onFocus={sel}
                                                        onChange={e => update(row.id, "estimatedGoldWeight", Number(e.target.value))}
                                                    />
                                                    {rowPct && (
                                                        <span style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", fontSize: "0.5rem", fontWeight: 700, color: "var(--gold-dark)", background: "rgba(201,168,76,0.12)", padding: "1px 3px", borderRadius: 3, pointerEvents: "none" }}>
                                                            {rowPct}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: "4px 5px", width: 100 }}>
                                                <input className="form-input" style={{ height: 30, fontSize: "0.75rem" }}
                                                    type="number" min={0} step={0.001}
                                                    value={row.stoneWeight || ""}
                                                    placeholder="0.000"
                                                    onFocus={sel}
                                                    onChange={e => update(row.id, "stoneWeight", Number(e.target.value))}
                                                />
                                            </td>
                                            <td style={{ padding: "4px 5px", minWidth: 130 }}>
                                                <input className="form-input" style={{ height: 30, fontSize: "0.72rem", color: "var(--text-muted)" }}
                                                    placeholder="Internal note…"
                                                    value={row.notes ?? ""}
                                                    onFocus={sel}
                                                    onChange={e => update(row.id, "notes", e.target.value)}
                                                />
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
                                        <td colSpan={6} style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontSize: "0.6875rem", fontWeight: 700, color: "var(--maroon)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Totals</td>
                                        <td style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                                            {rows.reduce((s, r) => s + (r.grossWeight || 0), 0).toFixed(3)} g
                                        </td>
                                        <td style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 800, color: isOverAllocated ? "var(--danger)" : "var(--maroon)", fontSize: "0.8125rem" }}>
                                            {allocatedWeight.toFixed(3)} g
                                        </td>
                                        <td style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                                            {rows.reduce((s, r) => s + r.stoneWeight, 0).toFixed(3)} g
                                        </td>
                                        <td colSpan={2} style={{ padding: "7px 9px", background: "linear-gradient(to right, var(--cream), rgba(201,168,76,0.08))", borderTop: "2px solid var(--gold)" }} />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </>
            )}

            {/* ── Footer ── */}
            <div style={{
                padding: "9px 14px",
                borderTop: "1px solid var(--border)",
                background: "var(--cream-light)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
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
        </>
    );
}
