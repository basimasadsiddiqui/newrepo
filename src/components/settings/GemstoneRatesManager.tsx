"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X, Gem, RotateCcw } from "lucide-react";
import {
    loadGemstonePresets, saveGemstonePresets,
    DEFAULT_GEMSTONE_PRESETS,
    type GemstonePreset,
} from "@/lib/gemstoneRates";

const PRESET_COLORS = [
    "#DC2626", "#EA580C", "#D97706", "#F59E0B",
    "#16A34A", "#0D9488", "#2563EB", "#7C3AED",
    "#DB2777", "#6B7280", "#E2E8F0", "#92400E",
];

function mkId() { return `gem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

const EMPTY: Omit<GemstonePreset, "id"> = {
    name: "", color: "#F59E0B",
    pricePerCarat: 0, pricePerGram: 0,
    defaultUnit: "carats", notes: "",
};

export default function GemstoneRatesManager() {
    const [presets, setPresets] = useState<GemstonePreset[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<GemstonePreset, "id">>(EMPTY);
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState<Omit<GemstonePreset, "id">>({ ...EMPTY });
    const [saved, setSaved] = useState(false);

    useEffect(() => { setPresets(loadGemstonePresets()); }, []);

    const persist = (updated: GemstonePreset[]) => {
        setPresets(updated);
        saveGemstonePresets(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
    };

    const startEdit = (p: GemstonePreset) => {
        setEditingId(p.id);
        setEditForm({ name: p.name, color: p.color, pricePerCarat: p.pricePerCarat, pricePerGram: p.pricePerGram, defaultUnit: p.defaultUnit, notes: p.notes });
        setShowAddForm(false);
    };

    const saveEdit = (id: string) => {
        if (!editForm.name.trim()) return;
        persist(presets.map(p => p.id === id ? { ...p, ...editForm } : p));
        setEditingId(null);
    };

    const cancelEdit = () => setEditingId(null);

    const handleDelete = (id: string) => {
        persist(presets.filter(p => p.id !== id));
    };

    const handleAdd = () => {
        if (!addForm.name.trim()) return;
        persist([...presets, { id: mkId(), ...addForm }]);
        setAddForm({ ...EMPTY });
        setShowAddForm(false);
    };

    const handleReset = () => {
        if (!confirm("Reset gemstones to defaults? Your custom entries will be lost.")) return;
        persist([...DEFAULT_GEMSTONE_PRESETS]);
    };

    return (
        <div style={{ marginTop: 24 }}>
            {/* ── Section header ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14,
            }}>
                <div>
                    <h2 style={{
                        display: "flex", alignItems: "center", gap: 8,
                        fontSize: "0.9375rem", fontWeight: 800, color: "var(--maroon)", margin: 0,
                    }}>
                        <Gem size={16} />
                        Gemstone Rates
                    </h2>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0", fontWeight: 500 }}>
                        Saved presets auto-fill price &amp; unit when selecting a stone on an invoice.
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {saved && (
                        <span style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <Check size={12} /> Saved
                        </span>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={handleReset} title="Reset to defaults">
                        <RotateCcw size={13} /> Reset Defaults
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setShowAddForm(v => !v); setEditingId(null); }}>
                        <Plus size={13} /> Add Gemstone
                    </button>
                </div>
            </div>

            {/* ── Add form ── */}
            {showAddForm && (
                <div className="card animate-fade-in" style={{ marginBottom: 12, padding: 0 }}>
                    <div className="card-header" style={{ padding: "8px 14px" }}>
                        <h3 style={{ fontSize: "0.8125rem", fontWeight: 700 }}>New Gemstone Preset</h3>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setShowAddForm(false)}><X size={13} /></button>
                    </div>
                    <div className="card-body" style={{ padding: "10px 14px" }}>
                        <GemForm form={addForm} onChange={setAddForm} />
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!addForm.name.trim()}>
                                <Plus size={13} /> Add Gemstone
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Gems grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {presets.map(p => (
                    <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                        {editingId === p.id ? (
                            /* ── Edit mode ── */
                            <>
                                <div className="card-header" style={{ padding: "8px 12px" }}>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--maroon)" }}>Editing</span>
                                    <button className="btn btn-icon btn-ghost btn-sm" onClick={cancelEdit}><X size={13} /></button>
                                </div>
                                <div style={{ padding: "10px 12px" }}>
                                    <GemForm form={editForm} onChange={setEditForm} />
                                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(p.id)} disabled={!editForm.name.trim()}>
                                            <Check size={13} /> Save
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* ── View mode ── */
                            <>
                                {/* Color bar */}
                                <div style={{ height: 4, background: p.color }} />
                                <div style={{ padding: "10px 12px" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: "50%",
                                                background: p.color,
                                                boxShadow: `0 2px 8px ${p.color}60`,
                                                flexShrink: 0,
                                            }} />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>{p.name}</div>
                                                {p.notes && <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 1 }}>{p.notes}</div>}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 4 }}>
                                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => startEdit(p)} title="Edit">
                                                <Edit2 size={12} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleDelete(p.id)}
                                                style={{ color: "var(--danger)" }} title="Delete">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Price info */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                                        {[
                                            { label: "Per Carat", value: `Rs. ${p.pricePerCarat.toLocaleString("en-PK")}` },
                                            { label: "Per Gram", value: `Rs. ${p.pricePerGram.toLocaleString("en-PK")}` },
                                            { label: "Default Unit", value: p.defaultUnit === "carats" ? "Carats (ct)" : "Grams (g)" },
                                        ].map(item => (
                                            <div key={item.label} style={{
                                                background: "var(--cream-light)",
                                                borderRadius: 6, padding: "5px 8px",
                                                border: "1px solid var(--border)",
                                            }}>
                                                <div style={{ fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{item.label}</div>
                                                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--maroon)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {presets.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "32px", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                        No gemstone presets yet. Click &ldquo;Add Gemstone&rdquo; to create one.
                    </div>
                )}
            </div>
        </div>
    );
}

function GemForm({
    form,
    onChange,
}: {
    form: Omit<GemstonePreset, "id">;
    onChange: (f: Omit<GemstonePreset, "id">) => void;
}) {
    const set = (field: keyof Omit<GemstonePreset, "id">, value: unknown) =>
        onChange({ ...form, [field]: value });

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Gemstone Name</label>
                <input className="form-input" placeholder="e.g. Ruby, Emerald…"
                    value={form.name}
                    onChange={e => set("name", e.target.value)} />
            </div>

            <div className="form-group">
                <label className="form-label">Price per Carat (PKR)</label>
                <input className="form-input" type="number" min={0}
                    value={form.pricePerCarat || ""}
                    placeholder="0"
                    onChange={e => set("pricePerCarat", Number(e.target.value))} />
            </div>

            <div className="form-group">
                <label className="form-label">Price per Gram (PKR)</label>
                <input className="form-input" type="number" min={0}
                    value={form.pricePerGram || ""}
                    placeholder="0"
                    onChange={e => set("pricePerGram", Number(e.target.value))} />
            </div>

            <div className="form-group">
                <label className="form-label">Default Unit</label>
                <select className="form-select" value={form.defaultUnit}
                    onChange={e => set("defaultUnit", e.target.value)}>
                    <option value="carats">Carats (ct)</option>
                    <option value="grams">Grams (g)</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Colour</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingTop: 4 }}>
                    {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => set("color", c)}
                            style={{
                                width: 22, height: 22, borderRadius: "50%", background: c, border: "none",
                                cursor: "pointer",
                                outline: form.color === c ? `2px solid var(--maroon)` : "2px solid transparent",
                                outlineOffset: 2,
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" placeholder="Natural / synthetic, origin…"
                    value={form.notes}
                    onChange={e => set("notes", e.target.value)} />
            </div>
        </div>
    );
}
