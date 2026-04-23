"use client";

import { useState, useEffect } from "react";
import { X, Layers } from "lucide-react";
import { loadBeadPresets, type BeadPreset } from "@/lib/beadRates";

interface BeadsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (beadsWeight: number, beadsAmount: number, note: string) => void;
}

export default function BeadsModal({ isOpen, onClose, onConfirm }: BeadsModalProps) {
    const [presets, setPresets] = useState<BeadPreset[]>([]);
    const [selected, setSelected] = useState<BeadPreset | null>(null);
    const [beadType, setBeadType] = useState("");
    const [weight, setWeight] = useState<number>(0);
    const [pricePerGram, setPricePerGram] = useState<number>(0);

    useEffect(() => {
        if (isOpen) setPresets(loadBeadPresets());
    }, [isOpen]);

    if (!isOpen) return null;

    const totalPrice = weight * pricePerGram;

    const selectPreset = (p: BeadPreset) => {
        setSelected(p);
        setBeadType(p.name);
        setPricePerGram(p.pricePerGram);
        setWeight(0);
    };

    const clearSelection = () => {
        setSelected(null);
        setBeadType("");
        setWeight(0);
        setPricePerGram(0);
    };

    const handleConfirm = () => {
        if (weight <= 0) return;
        const name = beadType.trim() || selected?.name || "Beads";
        onConfirm(weight, totalPrice, `${name} (${weight}g)`);
        clearSelection();
        onClose();
    };

    return (
        <div style={{
            position: "fixed", inset: 0,
            background: "rgba(26,18,8,0.55)",
            backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 210,
        }}>
            <div className="card animate-scale-in" style={{ width: "min(440px, 96vw)", padding: 0, overflow: "hidden" }}>
                {/* Header */}
                <div className="card-header" style={{
                    padding: "10px 14px",
                    background: "linear-gradient(135deg, #92400e 0%, #78350f 100%)",
                    borderBottom: "none",
                }}>
                    <h3 style={{ color: "#fef3c7", display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
                        <Layers size={15} /> Beads
                    </h3>
                    <button className="btn btn-icon btn-sm" onClick={onClose} style={{
                        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fef3c7",
                    }}>
                        <X size={14} />
                    </button>
                </div>

                <div className="card-body" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Preset tiles */}
                    {presets.length > 0 && (
                        <div>
                            <div style={{
                                fontSize: "0.575rem", fontWeight: 700, color: "var(--text-muted)",
                                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
                            }}>
                                Select Bead Type
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {presets.map(p => {
                                    const isActive = selected?.id === p.id;
                                    return (
                                        <button key={p.id}
                                            onClick={() => isActive ? clearSelection() : selectPreset(p)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: 6,
                                                padding: "5px 10px",
                                                borderRadius: "var(--radius-full)",
                                                border: isActive ? `2px solid ${p.color}` : "1.5px solid var(--border)",
                                                background: isActive ? `${p.color}18` : "var(--cream-light)",
                                                cursor: "pointer",
                                                fontWeight: isActive ? 700 : 500,
                                                fontSize: "0.75rem",
                                                color: isActive ? p.color : "var(--text-primary)",
                                                transition: "all var(--t-fast)",
                                            }}
                                        >
                                            <span style={{
                                                width: 10, height: 10, borderRadius: "50%",
                                                background: p.color, flexShrink: 0,
                                                boxShadow: isActive ? `0 0 5px ${p.color}80` : "none",
                                            }} />
                                            {p.name}
                                        </button>
                                    );
                                })}
                            </div>
                            {selected && (
                                <div style={{
                                    marginTop: 8, padding: "7px 10px",
                                    background: `${selected.color}12`,
                                    border: `1px solid ${selected.color}40`,
                                    borderRadius: 8, fontSize: "0.7rem",
                                    color: "var(--text-secondary)",
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                }}>
                                    <span>
                                        <strong style={{ color: selected.color }}>{selected.name}</strong>
                                        {" — "}
                                        Rs.&nbsp;{selected.pricePerGram.toLocaleString("en-PK")} / g
                                        {selected.notes && ` · ${selected.notes}`}
                                    </span>
                                    <button onClick={clearSelection} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2 }}>
                                        <X size={11} />
                                    </button>
                                </div>
                            )}
                            <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} />
                        </div>
                    )}

                    {/* Manual entry */}
                    <div className="form-group">
                        <label className="form-label">
                            Bead Type {!selected && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(or select above)</span>}
                        </label>
                        <input className="form-input"
                            placeholder={selected ? selected.name : "e.g. Gold Beads, Pearl Beads…"}
                            value={beadType}
                            onChange={e => setBeadType(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div className="form-group">
                            <label className="form-label">Weight (g)</label>
                            <input className="form-input" type="number" min={0} step={0.001}
                                value={weight || ""}
                                placeholder="0.000"
                                onChange={e => setWeight(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Price / Gram (PKR)</label>
                            <input className="form-input" type="number" min={0}
                                value={pricePerGram || ""}
                                placeholder="0"
                                onChange={e => setPricePerGram(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    {weight > 0 && (
                        <div style={{
                            background: "var(--cream)", borderRadius: "var(--radius-sm)",
                            padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
                        }}>
                            <div>
                                <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Weight</div>
                                <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.875rem", marginTop: 2 }}>{weight.toFixed(3)} g</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Price</div>
                                <div style={{ fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--maroon)", marginTop: 2 }}>
                                    Rs. {totalPrice.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={handleConfirm} disabled={weight <= 0}>
                            <Layers size={13} /> Apply to Item
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
