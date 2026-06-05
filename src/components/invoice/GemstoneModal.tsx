"use client";

import { useState } from "react";
import { X, Plus, Trash2, Gem } from "lucide-react";

type RateBasis = "Per Gram" | "Per Carat" | "Per Piece" | "Lumpsum";

interface StoneRow {
    id: string;
    type: string;
    pieces: number;
    value: number;
    unit: "ct" | "g";
    rateBasis: RateBasis;
    rate: number;
}

interface GemstoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (stoneWeight: number, stoneAmount: number, note: string) => void;
}

let counter = 0;
function mkRow(): StoneRow {
    return {
        id: `stone-${Date.now()}-${++counter}`,
        type: "", pieces: 1, value: 0, unit: "g",
        rateBasis: "Per Gram", rate: 0,
    };
}

const sel = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

function calcAmount(r: StoneRow): number {
    const wG  = r.unit === "ct" ? r.value * 0.2 : r.value;
    const wCt = r.unit === "g"  ? r.value / 0.2 : r.value;
    if (r.rateBasis === "Per Carat") return wCt * r.rate;
    if (r.rateBasis === "Per Gram")  return wG  * r.rate;
    if (r.rateBasis === "Per Piece") return r.pieces * r.rate;
    return r.rate; // Lumpsum
}

export default function GemstoneModal({ isOpen, onClose, onConfirm }: GemstoneModalProps) {
    const [rows, setRows] = useState<StoneRow[]>([mkRow()]);
    const [draft, setDraft] = useState<StoneRow>(() => mkRow());
    const [editingId, setEditingId] = useState<string | null>(null);

    if (!isOpen) return null;

    const totalWeightG  = rows.reduce((s, r) => s + (r.unit === "ct" ? r.value * 0.2 : r.value), 0);
    const totalWeightCt = rows.reduce((s, r) => s + (r.unit === "g"  ? r.value / 0.2 : r.value), 0);
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
                width: "min(800px, 96vw)", maxHeight: "90vh",
                display: "flex", flexDirection: "column",
                boxShadow: "0 24px 64px rgba(0,0,0,0.38)",
                overflow: "hidden",
            }}>
                {/* Header */}
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

                {/* Add-row form */}
                <div style={{ padding: "10px 14px", background: "var(--cream-light)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                        Add New Stone / Gem
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.5fr 0.9fr 0.7fr 0.8fr 0.8fr auto", gap: 6, alignItems: "end" }}>
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
                                <option value="Per Piece">Per Piece</option>
                                <option value="Lumpsum">Lumpsum</option>
                            </select>
                        </div>
                        {/* Rate */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.7rem" }}>
                                Rate ({draft.rateBasis === "Lumpsum" ? "flat" : draft.rateBasis === "Per Carat" ? "Rs/ct" : draft.rateBasis === "Per Piece" ? "Rs/pc" : "Rs/g"})
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
                        {/* Add button */}
                        <button onClick={addDraft} style={{
                            height: 34, padding: "0 14px", border: "none", borderRadius: 6,
                            background: "var(--maroon)", color: "white", cursor: "pointer",
                            fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5,
                            whiteSpace: "nowrap", marginTop: 18,
                        }}>
                            <Plus size={13} /> Add
                        </button>
                    </div>
                </div>

                {/* Stone table */}
                <div style={{ overflowY: "auto", flex: 1 }}>
                    {rows.length === 0 ? (
                        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px 0", fontSize: "0.82rem" }}>
                            No stones added — fill the form above and click Add
                        </div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                            <thead>
                                <tr style={{ background: "var(--cream-light)", borderBottom: "2px solid var(--border)" }}>
                                    {["S.No", "Type", "Pcs", "Weight", "Unit", "Basis", "Rate", "Amount", ""].map(h => (
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
                                                        {(["Per Gram", "Per Carat", "Per Piece", "Lumpsum"] as RateBasis[]).map(b => <option key={b} value={b}>{b}</option>)}
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
                                {totalPieces} pcs · {totalWeightCt.toFixed(2)} ct / {totalWeightG.toFixed(3)} g
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
