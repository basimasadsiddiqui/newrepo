"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Gem, Settings } from "lucide-react";
import { loadGemstonePresets, type GemstonePreset } from "@/lib/gemstoneRates";
import { stoneRowAmount } from "@/shared/utils/stone";
import type { Category } from "@/types";

type RateBasis = "Per Gram" | "Per Carat" | "Per Piece" | "Per Cent" | "Lumpsum";

interface StoneRow {
    id: string;
    type: string;
    pieces: number;
    value: number;
    unit: "ct" | "g";
    rateBasis: RateBasis;
    rate: number;
    tagCaption: string;
    detail: string;
}

interface GemstoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (stoneWeight: number, stoneAmount: number, note: string) => void;
    categories?: Category[];
}

let counter = 0;
function mkRow(): StoneRow {
    return {
        id: `stone-${Date.now()}-${++counter}`,
        type: "", pieces: 1, value: 0, unit: "g",
        rateBasis: "Per Gram", rate: 0,
        tagCaption: "", detail: "",
    };
}

const sel = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

function calcAmount(r: StoneRow): number {
    return stoneRowAmount(r);
}

export default function GemstoneModal({ isOpen, onClose, onConfirm, categories = [] }: GemstoneModalProps) {
    const [rows, setRows] = useState<StoneRow[]>([]);
    const [draft, setDraft] = useState<StoneRow>(() => mkRow());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [presets, setPresets] = useState<GemstonePreset[]>([]);

    useEffect(() => {
        if (isOpen) setPresets(loadGemstonePresets());
    }, [isOpen]);

    if (!isOpen) return null;

    // Click a preset tile → instantly add a row pre-filled with its rate (weight = 0, user fills it)
    const addPreset = (p: GemstonePreset) => {
        const isPerCarat = p.defaultUnit === "carats";
        const newRow: StoneRow = {
            id: `stone-${Date.now()}-${++counter}`,
            type: p.name,
            pieces: 1,
            value: 0,
            unit: isPerCarat ? "ct" : "g",
            rateBasis: isPerCarat ? "Per Carat" : "Per Gram",
            rate: isPerCarat ? p.pricePerCarat : p.pricePerGram,
            tagCaption: "", detail: "",
        };
        setRows(prev => [...prev, newRow]);
        setEditingId(newRow.id); // open it for weight entry immediately
    };

    const tagCaptionSuggestions = Array.from(new Set(categories.map(c => c.name)));

    const totalWeightG   = rows.reduce((s, r) => s + (r.unit === "ct" ? r.value * 0.2 : r.value), 0);
    const gramRowsTotalG  = rows.filter(r => r.unit === "g").reduce((s, r) => s + r.value, 0);
    const caratRowsTotalCt = rows.filter(r => r.unit === "ct").reduce((s, r) => s + r.value, 0);
    const totalAmount   = rows.reduce((s, r) => s + calcAmount(r), 0);
    const totalPieces   = rows.reduce((s, r) => s + r.pieces, 0);

    const updateRow = (id: string, field: keyof StoneRow, val: unknown) =>
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
    const removeRow = (id: string) =>
        setRows(prev => prev.filter(r => r.id !== id));

    const addDraft = () => {
        setRows(p => [...p, { ...draft, id: `stone-${Date.now()}-${++counter}` }]);
        setDraft(mkRow());
    };

    const handleConfirm = () => {
        const note = rows
            .filter(r => r.type.trim())
            .map(r => `${r.type} ${r.pieces}pc ${r.value}${r.unit}`)
            .join(", ");
        onConfirm(totalWeightG, totalAmount, note || "Gemstones");
        setRows([mkRow()]);
        setDraft(mkRow());
        setEditingId(null);
        onClose();
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
        }}>
            <div style={{
                background: "white", borderRadius: 12,
                width: "min(1000px, 96vw)", maxHeight: "90vh",
                display: "flex", flexDirection: "column",
                boxShadow: "0 24px 64px rgba(0,0,0,0.38)",
                overflow: "hidden",
            }}>
                {/* Header */}
                <datalist id="gemstone-tag-caption-suggestions">
                    {tagCaptionSuggestions.map(name => <option key={name} value={name} />)}
                </datalist>

                <div style={{
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexShrink: 0,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Gem size={16} style={{ color: "rgba(250,246,241,0.9)" }} />
                        <span style={{ color: "var(--text-on-maroon)", fontWeight: 700, fontSize: "0.95rem" }}>
                            Gemstones &amp; Stones
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "rgba(250,246,241,0.6)", marginLeft: 4 }}>
                            Add each stone separately
                        </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6,
                        color: "white", cursor: "pointer", width: 28, height: 28,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1rem", fontWeight: 700,
                    }}>×</button>
                </div>

                {/* ── Preset tiles from Settings ── */}
                {presets.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "var(--cream)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Quick Add from Settings
                            </div>
                            <a href="/settings/rates" target="_blank" rel="noopener noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: "var(--text-muted)", textDecoration: "none" }}>
                                <Settings size={10} /> Manage rates
                            </a>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {presets.map(p => (
                                <button key={p.id} onClick={() => addPreset(p)} style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    padding: "5px 12px",
                                    borderRadius: "var(--radius-full)",
                                    border: `1.5px solid ${p.color}60`,
                                    background: `${p.color}12`,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "0.78rem",
                                    color: p.color,
                                    transition: "all var(--t-fast)",
                                }}>
                                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                                    {p.name}
                                    <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 400 }}>
                                        {p.defaultUnit === "carats"
                                            ? `Rs.${p.pricePerCarat.toLocaleString("en-PK")}/ct`
                                            : `Rs.${p.pricePerGram.toLocaleString("en-PK")}/g`}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 5 }}>
                            Click any gemstone to add it to the table below — then enter the weight
                        </div>
                    </div>
                )}

                {/* Add-row form */}
                <div style={{ padding: "10px 14px", background: "var(--cream-light)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                        Add New Stone / Gem
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.5fr 0.9fr 0.7fr 0.8fr 0.8fr", gap: 6, alignItems: "end" }}>
                        {/* Type */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.7rem" }}>Stone / Gem Type</label>
                            <input className="form-input"
                                placeholder="Ruby, Pearl, Emerald…"
                                value={draft.type}
                                onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}
                                onFocus={sel}
                                style={{ fontSize: "0.82rem" }}
                            />
                        </div>
                        {/* Pcs */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.7rem" }}>Pcs</label>
                            <input className="form-input" type="number" min={1} step={1}
                                value={draft.pieces || ""}
                                onChange={e => setDraft(d => ({ ...d, pieces: Number(e.target.value) }))}
                                onFocus={sel} placeholder="1"
                                style={{ fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "center" }}
                            />
                        </div>
                        {/* Weight + unit toggle */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span>Weight</span>
                                <span style={{ display: "flex", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border)", fontSize: "0.6rem" }}>
                                    {(["g", "ct"] as const).map(u => (
                                        <button key={u} onClick={() => setDraft(d => ({ ...d, unit: u }))} style={{
                                            padding: "1px 5px", border: "none", cursor: "pointer",
                                            background: draft.unit === u ? "var(--maroon)" : "var(--cream)",
                                            color: draft.unit === u ? "white" : "var(--text-muted)",
                                            fontWeight: draft.unit === u ? 700 : 400,
                                        }}>{u}</button>
                                    ))}
                                </span>
                            </label>
                            <div style={{ position: "relative" }}>
                                <input className="form-input" type="number" min={0} step={0.001}
                                    value={draft.value || ""}
                                    onChange={e => setDraft(d => ({ ...d, value: Number(e.target.value) }))}
                                    onFocus={sel} placeholder="0.000"
                                    style={{ paddingRight: 24, fontFamily: "var(--font-mono)", fontWeight: 600 }}
                                />
                                <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: "0.62rem", color: "var(--text-muted)" }}>{draft.unit}</span>
                            </div>
                        </div>
                        {/* Rate Basis */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.7rem" }}>Basis</label>
                            <select className="form-select" style={{ fontSize: "0.75rem" }}
                                value={draft.rateBasis}
                                onChange={e => setDraft(d => ({ ...d, rateBasis: e.target.value as RateBasis }))}>
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
                                Rate ({draft.rateBasis === "Lumpsum" ? "flat" : draft.rateBasis === "Per Carat" ? "Rs/ct" : draft.rateBasis === "Per Cent" ? "Rs/cent" : draft.rateBasis === "Per Piece" ? "Rs/pc" : "Rs/g"})
                            </label>
                            <input className="form-input" type="number" min={0} step={0.01}
                                value={draft.rate || ""}
                                onChange={e => setDraft(d => ({ ...d, rate: Number(e.target.value) }))}
                                onFocus={sel} placeholder="0"
                                style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
                            />
                        </div>
                        {/* Preview amount */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.7rem" }}>Amount</label>
                            <div style={{ height: 34, display: "flex", alignItems: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.82rem", color: "var(--maroon)", paddingLeft: 4 }}>
                                {(() => {
                                    const amt = calcAmount(draft);
                                    return amt > 0 ? `Rs.${amt.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` : "—";
                                })()}
                            </div>
                        </div>
                    </div>
                    {/* Tag Caption / Detail (for printed tags) — Add button comes AFTER details */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.7rem" }}>Tag Caption</label>
                            <input className="form-input"
                                placeholder="e.g. Ruby, Ban…"
                                value={draft.tagCaption}
                                onChange={e => setDraft(d => ({ ...d, tagCaption: e.target.value }))}
                                onFocus={sel}
                                list="gemstone-tag-caption-suggestions"
                                style={{ fontSize: "0.82rem" }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.7rem" }}>Detail</label>
                            <input className="form-input"
                                placeholder="e.g. Burma Ruby, oval cut"
                                value={draft.detail}
                                onChange={e => setDraft(d => ({ ...d, detail: e.target.value }))}
                                onFocus={sel}
                                style={{ fontSize: "0.82rem" }}
                            />
                        </div>
                    </div>
                    {/* Add button — placed after all detail fields */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                        <button onClick={addDraft} style={{
                            height: 34, padding: "0 18px", border: "none", borderRadius: 6,
                            background: "var(--maroon)", color: "white", cursor: "pointer",
                            fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5,
                            whiteSpace: "nowrap",
                        }}>
                            <Plus size={13} /> Add
                        </button>
                    </div>
                </div>

                {/* Stone table */}
                <div style={{ overflowY: "auto", flex: 1 }}>
                    {rows.length === 0 ? (
                        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px 0", fontSize: "0.82rem" }}>
                            Click a gemstone above or fill the form and click Add
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
                                {rows.map((r, idx) => {
                                    const amt = calcAmount(r);
                                    const isEditing = editingId === r.id;
                                    const bg = isEditing ? "rgba(92,10,10,0.04)" : idx % 2 === 0 ? "white" : "var(--cream-light)";
                                    return (
                                        <tr key={r.id} style={{ background: bg, borderBottom: "1px solid var(--border)" }}>
                                            <td style={{ padding: "4px 8px", color: "var(--text-muted)", fontWeight: 600, width: 36 }}>{idx + 1}</td>
                                            <td style={{ padding: "4px 6px", minWidth: 100 }}>
                                                {isEditing
                                                    ? <input className="form-input" value={r.type} onChange={e => updateRow(r.id, "type", e.target.value)} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28 }} />
                                                    : <span style={{ cursor: "pointer" }} onClick={() => setEditingId(r.id)}>{r.type || <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
                                                }
                                            </td>
                                            <td style={{ padding: "4px 6px", minWidth: 90 }}>
                                                {isEditing
                                                    ? <input className="form-input" value={r.tagCaption} onChange={e => updateRow(r.id, "tagCaption", e.target.value)} onFocus={sel} list="gemstone-tag-caption-suggestions" style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28 }} />
                                                    : <span style={{ cursor: "pointer" }} onClick={() => setEditingId(r.id)}>{r.tagCaption || <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
                                                }
                                            </td>
                                            <td style={{ padding: "4px 6px", minWidth: 110 }}>
                                                {isEditing
                                                    ? <input className="form-input" value={r.detail} onChange={e => updateRow(r.id, "detail", e.target.value)} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28 }} />
                                                    : <span style={{ cursor: "pointer" }} onClick={() => setEditingId(r.id)}>{r.detail || <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
                                                }
                                            </td>
                                            <td style={{ padding: "4px 6px", width: 52 }}>
                                                {isEditing
                                                    ? <input className="form-input" type="number" min={1} value={r.pieces || ""} onChange={e => updateRow(r.id, "pieces", Number(e.target.value))} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28, width: 48, textAlign: "center" }} />
                                                    : <span style={{ cursor: "pointer" }} onClick={() => setEditingId(r.id)}>{r.pieces}</span>
                                                }
                                            </td>
                                            <td style={{ padding: "4px 6px", width: 80 }}>
                                                {isEditing
                                                    ? <input className="form-input" type="number" min={0} step={0.001} value={r.value || ""} onChange={e => updateRow(r.id, "value", Number(e.target.value))} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28, width: 74, fontFamily: "var(--font-mono)" }} />
                                                    : <span style={{ cursor: "pointer", fontFamily: "var(--font-mono)" }} onClick={() => setEditingId(r.id)}>{r.value > 0 ? r.value.toFixed(3) : "—"}</span>
                                                }
                                            </td>
                                            <td style={{ padding: "4px 6px", width: 58 }}>
                                                <span style={{ display: "inline-flex", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border)", fontSize: "0.62rem" }}>
                                                    {(["g", "ct"] as const).map(u => (
                                                        <button key={u} onClick={() => updateRow(r.id, "unit", u)} style={{
                                                            padding: "2px 5px", border: "none", cursor: "pointer",
                                                            background: r.unit === u ? "var(--maroon)" : "transparent",
                                                            color: r.unit === u ? "white" : "var(--text-muted)",
                                                            fontWeight: r.unit === u ? 700 : 400,
                                                        }}>{u}</button>
                                                    ))}
                                                </span>
                                            </td>
                                            <td style={{ padding: "4px 6px", width: 90 }}>
                                                {isEditing
                                                    ? <select className="form-select" value={r.rateBasis} onChange={e => updateRow(r.id, "rateBasis", e.target.value as RateBasis)} style={{ fontSize: "0.72rem", padding: "2px 4px", height: 28 }}>
                                                        {(["Per Gram", "Per Carat", "Per Cent", "Per Piece", "Lumpsum"] as RateBasis[]).map(b => <option key={b} value={b}>{b}</option>)}
                                                      </select>
                                                    : <span style={{ cursor: "pointer", fontSize: "0.72rem", color: "var(--text-secondary)" }} onClick={() => setEditingId(r.id)}>{r.rateBasis}</span>
                                                }
                                            </td>
                                            <td style={{ padding: "4px 6px", textAlign: "right", width: 72 }}>
                                                {isEditing
                                                    ? <input className="form-input" type="number" min={0} value={r.rate || ""} onChange={e => updateRow(r.id, "rate", Number(e.target.value))} onFocus={sel} style={{ fontSize: "0.78rem", padding: "3px 6px", height: 28, width: 66, fontFamily: "var(--font-mono)", textAlign: "right" }} />
                                                    : <span style={{ cursor: "pointer", fontFamily: "var(--font-mono)" }} onClick={() => setEditingId(r.id)}>{r.rate > 0 ? r.rate.toLocaleString("en-PK") : "—"}</span>
                                                }
                                            </td>
                                            <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--maroon)", width: 80 }}>
                                                {amt > 0 ? `Rs.${amt.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` : "—"}
                                            </td>
                                            <td style={{ padding: "4px 6px", width: 60 }}>
                                                <div style={{ display: "flex", gap: 3 }}>
                                                    {isEditing
                                                        ? <button onClick={() => setEditingId(null)} style={{ padding: "2px 7px", border: "1px solid var(--success)", borderRadius: 4, background: "transparent", color: "var(--success)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>✓</button>
                                                        : <button onClick={() => setEditingId(r.id)} style={{ padding: "2px 7px", border: "1px solid var(--border)", borderRadius: 4, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.72rem" }}>Edit</button>
                                                    }
                                                    <button onClick={() => { removeRow(r.id); if (editingId === r.id) setEditingId(null); }} style={{ padding: "2px 5px", border: "none", borderRadius: 4, background: "transparent", color: "var(--danger)", cursor: "pointer" }}>
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

                {/* Footer — totals + Done */}
                <div style={{
                    padding: "10px 16px",
                    borderTop: "2px solid var(--gold-light)",
                    background: "var(--cream-light)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    flexShrink: 0,
                }}>
                    <div style={{ display: "flex", gap: 20 }}>
                        <div>
                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Stones</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                                {totalPieces} pcs · {[
                                    gramRowsTotalG > 0 ? `${gramRowsTotalG.toFixed(3)} g` : null,
                                    caratRowsTotalCt > 0 ? `${caratRowsTotalCt.toFixed(2)} ct` : null,
                                ].filter(Boolean).join(" + ") || "0.000 g"}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Amount</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.95rem", color: "var(--maroon)" }}>
                                Rs. {totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleConfirm} style={{ minWidth: 90 }}>
                            <Gem size={13} /> Apply to Item
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
