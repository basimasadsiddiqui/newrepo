"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search, X, Pencil, Check } from "lucide-react";

// Jewellery-specific category taxonomy with emoji, description, associated metals
const JEWELLERY_CATEGORIES = [
    { emoji: "💍", name: "Rings", desc: "Engagement, wedding & fashion rings", metals: ["Gold", "Silver", "Platinum"] },
    { emoji: "📿", name: "Necklaces & Chains", desc: "Neck chains, layered & pendant necklaces", metals: ["Gold", "Silver"] },
    { emoji: "👂", name: "Earrings", desc: "Studs, hoops, drops & jhumkas", metals: ["Gold", "Silver"] },
    { emoji: "🪬", name: "Bangles & Kadas", desc: "Traditional & modern bangles", metals: ["Gold", "Silver"] },
    { emoji: "⌚", name: "Bracelets", desc: "Charm, tennis & chain bracelets", metals: ["Gold", "Silver", "Platinum"] },
    { emoji: "🏷️", name: "Pendants & Lockets", desc: "Religious, designer & custom pendants", metals: ["Gold", "Silver"] },
    { emoji: "🦶", name: "Anklets (Payal)", desc: "Traditional foot anklets & pajeb", metals: ["Silver"] },
    { emoji: "👑", name: "Tikka & Head Jewelry", desc: "Maang tikka, jhoomar & passa", metals: ["Gold"] },
    { emoji: "👃", name: "Nose Pins & Rings", desc: "Nath, nose stud & nose ring", metals: ["Gold", "Silver"] },
    { emoji: "🎀", name: "Bridal Sets", desc: "Complete matching bridal jewellery sets", metals: ["Gold"] },
    { emoji: "🖤", name: "Mangalsutra", desc: "Traditional marriage necklace", metals: ["Gold"] },
    { emoji: "👔", name: "Men's Jewelry", desc: "Rings, chains & bracelets for men", metals: ["Gold", "Silver"] },
    { emoji: "💎", name: "Diamond Jewelry", desc: "Diamond-set pieces & solitaires", metals: ["Gold", "Platinum"] },
    { emoji: "🔮", name: "Gemstone Jewelry", desc: "Ruby, emerald, sapphire & other gemstones", metals: ["Gold", "Silver"] },
    { emoji: "🧿", name: "Amulets & Charms", desc: "Taweez, evil eye & protective charms", metals: ["Gold", "Silver"] },
    { emoji: "👓", name: "Other Accessories", desc: "Pins, clips, hair accessories & misc", metals: ["Gold", "Silver"] },
];

type CategoryDisplay = {
    id: string;
    name: string;
    isActive: boolean;
};

export default function CategoriesManager({ categories }: { categories: CategoryDisplay[] }) {
    const [allCategories, setAllCategories] = useState<CategoryDisplay[]>(categories);
    const [search, setSearch] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    // Inline rename (client #8 — fix a mis-spelled custom category)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);

    const filtered = allCategories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = async () => {
        const name = newName.trim();
        if (!name) { toast.error("Enter a category name"); return; }
        if (allCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            toast.error("Category already exists"); return;
        }
        setIsSaving(true);
        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json() as { success?: boolean; data?: CategoryDisplay; error?: string };
            if (data.success && data.data) {
                setAllCategories((prev) => [...prev, data.data as CategoryDisplay]);
                toast.success(`Category "${name}" created`);
                setNewName("");
                setIsAdding(false);
            } else {
                toast.error(data.error || "Failed to create");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setIsSaving(false);
        }
    };

    const startRename = (cat: CategoryDisplay) => {
        setEditingId(cat.id);
        setEditingName(cat.name);
    };

    const cancelRename = () => {
        setEditingId(null);
        setEditingName("");
    };

    const handleRename = async (cat: CategoryDisplay) => {
        const name = editingName.trim();
        if (!name) { toast.error("Enter a category name"); return; }
        if (name === cat.name) { cancelRename(); return; }
        // Same duplicate guard as handleAdd — the API enforces it server-side too
        if (allCategories.some((c) => c.id !== cat.id && c.name.toLowerCase() === name.toLowerCase())) {
            toast.error("Category already exists"); return;
        }
        setIsRenaming(true);
        try {
            const res = await fetch("/api/categories", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: cat.id, name }),
            });
            const data = await res.json() as { success?: boolean; data?: CategoryDisplay; error?: string };
            if (data.success && data.data) {
                const updated = data.data;
                setAllCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, name: updated.name } : c)));
                toast.success(`Renamed to "${updated.name}"`);
                cancelRename();
            } else {
                toast.error(data.error || "Failed to rename");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setIsRenaming(false);
        }
    };

    // Find which preset categories are already created
    const existingNames = new Set(allCategories.map((c) => c.name.toLowerCase()));

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
                    <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                        type="text"
                        placeholder="Search categories…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: "32px" }}
                    />
                </div>
                <span className="badge badge-gold">{allCategories.length} total</span>
                <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
                    <Plus size={13} /> New Category
                </button>
            </div>

            {/* Add New Form */}
            {isAdding && (
                <div className="card animate-slide-down">
                    <div className="card-body" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                            type="text"
                            placeholder="Category name…"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="form-input"
                            style={{ maxWidth: "280px" }}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAdd();
                                if (e.key === "Escape") { setIsAdding(false); setNewName(""); }
                            }}
                        />
                        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={isSaving}>
                            {isSaving ? "Saving…" : "Create"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setIsAdding(false); setNewName(""); }}>
                            <X size={13} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Active Categories */}
            <div className="card">
                <div className="card-header">
                    <h3>📁 Active Categories</h3>
                    <span className="badge badge-active">{filtered.length}</span>
                </div>
                <div className="card-body" style={{ padding: "10px" }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                            No categories found
                        </div>
                    ) : (
                        <div className="category-grid animate-stagger">
                            {filtered.map((cat) => {
                                const preset = JEWELLERY_CATEGORIES.find(
                                    (p) => p.name.toLowerCase() === cat.name.toLowerCase()
                                );
                                const isEditing = editingId === cat.id;
                                return (
                                    <div key={cat.id} className="category-card" style={{ position: "relative" }}>
                                        <div className="category-icon">
                                            {preset?.emoji || "🏷️"}
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            {isEditing ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        className="form-input"
                                                        style={{ height: "28px", fontSize: "0.75rem", minWidth: 0 }}
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleRename(cat);
                                                            if (e.key === "Escape") cancelRename();
                                                        }}
                                                    />
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        style={{ padding: "2px 6px" }}
                                                        title="Save name"
                                                        disabled={isRenaming}
                                                        onClick={() => handleRename(cat)}
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ padding: "2px 6px" }}
                                                        title="Cancel"
                                                        onClick={cancelRename}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="category-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                    {cat.name}
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ padding: "1px 4px", color: "var(--text-muted)" }}
                                                        title="Rename category"
                                                        aria-label={`Rename ${cat.name}`}
                                                        onClick={() => startRename(cat)}
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                </div>
                                            )}
                                            {preset && (
                                                <div className="category-desc">{preset.desc}</div>
                                            )}
                                            {preset && (
                                                <div style={{ display: "flex", gap: "3px", marginTop: "4px", flexWrap: "wrap" }}>
                                                    {preset.metals.map((m) => (
                                                        <span key={m} style={{
                                                            fontSize: "0.5625rem",
                                                            fontWeight: 600,
                                                            background: m === "Gold" ? "#FDF8EE"
                                                                : m === "Silver" ? "#F0F4F8" : "#F5F3FF",
                                                            color: m === "Gold" ? "#7A5200"
                                                                : m === "Silver" ? "#4A5568" : "#553C9A",
                                                            padding: "1px 5px",
                                                            borderRadius: "3px",
                                                            border: `1px solid ${m === "Gold" ? "#E8D4A0"
                                                                : m === "Silver" ? "#CBD5E0" : "#D6BCFA"}`,
                                                        }}>{m}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Jewellery Category Reference */}
            <div className="card">
                <div className="card-header">
                    <h3>✨ Standard Jewellery Categories</h3>
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>Quick reference — click to add</span>
                </div>
                <div className="card-body" style={{ padding: "10px" }}>
                    <div className="category-grid">
                        {JEWELLERY_CATEGORIES.map((cat) => {
                            const exists = existingNames.has(cat.name.toLowerCase());
                            return (
                                <div
                                    key={cat.name}
                                    className="category-card"
                                    style={{
                                        opacity: exists ? 0.5 : 1,
                                        cursor: exists ? "default" : "pointer",
                                    }}
                                    onClick={async () => {
                                        if (exists) return;
                                        setNewName(cat.name);
                                        setIsAdding(true);
                                    }}
                                >
                                    <div className="category-icon">{cat.emoji}</div>
                                    <div>
                                        <div className="category-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            {cat.name}
                                            {exists && <span className="badge badge-active" style={{ fontSize: "0.5rem" }}>✓ Added</span>}
                                        </div>
                                        <div className="category-desc">{cat.desc}</div>
                                        <div style={{ display: "flex", gap: "3px", marginTop: "4px" }}>
                                            {cat.metals.map((m) => (
                                                <span key={m} style={{
                                                    fontSize: "0.5625rem", fontWeight: 600,
                                                    background: m === "Gold" ? "#FDF8EE" : m === "Silver" ? "#F0F4F8" : "#F5F3FF",
                                                    color: m === "Gold" ? "#7A5200" : m === "Silver" ? "#4A5568" : "#553C9A",
                                                    padding: "1px 5px", borderRadius: "3px",
                                                    border: `1px solid ${m === "Gold" ? "#E8D4A0" : m === "Silver" ? "#CBD5E0" : "#D6BCFA"}`,
                                                }}>{m}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
