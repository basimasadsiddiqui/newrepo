"use client";

import { Plus, RotateCcw, Package, X, Gem } from "lucide-react";
import type { Category, ItemEntryFormData, MetalTypeOption } from "@/types";
import { useRef, useState, type ChangeEvent } from "react";
import StockSelectionModal from "./StockSelectionModal";
import GemstoneModal from "./GemstoneModal";
import BeadsModal from "./BeadsModal";
import CameraCapture from "./CameraCapture";

const ITEM_SHORTCUTS: Record<string, string[]> = {
    rings: ["Gold Ring 21K", "Gold Ring 18K", "Diamond Ring", "Stone Ring", "Wedding Band", "Engagement Ring", "Signet Ring", "Plain Band"],
    necklaces: ["Gold Necklace 21K", "Gold Chain 21K", "Diamond Necklace", "Pearl Necklace", "Pendant Set", "Choker", "Layered Chain"],
    earrings: ["Gold Earrings 21K", "Diamond Stud Earrings", "Stone Earrings", "Hoop Earrings", "Jhoomka", "Chandbali", "Drop Earrings"],
    bangles: ["Gold Bangles 21K", "Stone Bangles Set", "Diamond Bangles", "Kundan Bangles", "Bridal Bangles Set"],
    bracelets: ["Gold Bracelet 21K", "Diamond Bracelet", "Stone Bracelet", "Charm Bracelet", "Bangle Bracelet"],
    pendants: ["Gold Pendant 21K", "Diamond Pendant", "Stone Pendant", "Religious Pendant", "Heart Pendant"],
    tikka: ["Bridal Tikka 21K", "Maang Tikka", "Diamond Tikka", "Kundan Tikka"],
    "nose pins": ["Nose Pin 21K", "Diamond Nose Pin", "Stone Nose Pin", "Nath"],
    "bridal sets": ["Full Bridal Set 21K", "Gold Bridal Set", "Diamond Bridal Set", "Kundan Bridal Set"],
    mangalsutra: ["Gold Mangalsutra 21K", "Diamond Mangalsutra", "Black Bead Mangalsutra"],
    "men's": ["Men's Ring 21K", "Men's Bracelet", "Men's Chain 21K", "Kada", "Men's Pendant"],
    diamond: ["Diamond Ring", "Diamond Necklace", "Diamond Bracelet", "Diamond Earrings", "Diamond Pendant", "Diamond Set"],
    gemstone: ["Ruby Ring", "Emerald Ring", "Sapphire Ring", "Stone Necklace", "Gemstone Set"],
};

function getShortcuts(categories: Category[], categoryId: string, customName: string): string[] {
    const name = customName || categories.find(c => c.id === categoryId)?.name || "";
    const lower = name.toLowerCase();
    const entry = Object.entries(ITEM_SHORTCUTS).find(([key]) => lower.includes(key));
    return entry?.[1] ?? [];
}

interface ItemEntryFormProps {
    categories: Category[];
    metalTypes: MetalTypeOption[];
    goldRate: number;
    formData: ItemEntryFormData;
    isEditing: boolean;
    transactionType?: import("@/types").TransactionType;
    kaatWeightPreview?: number;
    pureWeightPreview?: number;
    onFormChange: (field: keyof ItemEntryFormData, value: unknown) => void;
    onAddItem: () => void;
    onReset: () => void;
    onBulkPurchase?: () => void;
    onGoldRateChange?: (rate: number) => void;
}

interface StockSelectionItem {
    id: string;
    netWeight: number;
    stoneWeight: number;
    metalType?: { id?: string; purity?: string | null } | null;
    product?: {
        name?: string;
        imageUrl?: string | null;
        category?: { name?: string | null } | null;
        metalType?: { id?: string; purity?: string | null } | null;
    } | null;
}

export default function ItemEntryForm({
    categories,
    metalTypes,
    goldRate,
    formData,
    isEditing,
    transactionType = "SALE",
    kaatWeightPreview = 0,
    pureWeightPreview = 0,
    onFormChange,
    onAddItem,
    onReset,
    onBulkPurchase,
    onGoldRateChange,
}: ItemEntryFormProps) {
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isGemstoneModalOpen, setIsGemstoneModalOpen] = useState(false);
    const [isBeadsModalOpen, setIsBeadsModalOpen] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [hasGemstone, setHasGemstone] = useState(false);
    const [hasBeads, setHasBeads] = useState(false);
    const itemImageInputRef = useRef<HTMLInputElement>(null);

    const customCategoryName = formData.categoryId.startsWith("__new__:")
        ? formData.categoryId.replace("__new__:", "")
        : "";

    const isDiamondCategory = (() => {
        let catName = customCategoryName;
        if (!catName && formData.categoryId && !formData.categoryId.startsWith("__new__:_")) {
            catName = categories.find(c => c.id === formData.categoryId)?.name || "";
        }
        return catName.toLowerCase().includes("diamond");
    })();

    const hasDiamondCategory = categories.some(c => c.name.toLowerCase().includes("diamond"));
    const shortcuts = getShortcuts(categories, formData.categoryId, customCategoryName);
    const listId = "item-desc-list";

    // Guarantee calculator values
    const purity = formData.carat / 24;
    const pureGold = formData.estimatedGoldWeight * purity;
    const alloyWt = formData.estimatedGoldWeight - pureGold;

    // Stone amount preview: if rate > 0, compute from rate×weight; else manual amount
    const effectiveStoneAmt = formData.stoneRate > 0 && formData.stoneWeight > 0
        ? formData.stoneRate * formData.stoneWeight
        : formData.stoneAmount;

    const handleStockSelect = (item: StockSelectionItem) => {
        onFormChange("inventoryItemId", item.id);
        onFormChange("description", item.product?.name || "Stock Item");
        onFormChange("imageUrl", item.product?.imageUrl || null);
        onFormChange("metalTypeId", item.metalType?.id || item.product?.metalType?.id || null);
        const catName = item.product?.category?.name;
        if (catName) {
            const cat = categories.find(c => c.name === catName);
            if (cat) onFormChange("categoryId", cat.id);
        }
        const purityStr = item.metalType?.purity || item.product?.metalType?.purity;
        if (purityStr) {
            const p = parseFloat(purityStr);
            if (!isNaN(p)) onFormChange("carat", p);
        }
        onFormChange("estimatedGoldWeight", item.netWeight || 0);
        onFormChange("stoneWeight", item.stoneWeight || 0);
        onFormChange("pieces", 1);
        setIsStockModalOpen(false);
    };

    const handleCategorySelectChange = (value: string) => {
        if (value === "__new__") {
            onFormChange("categoryId", "__new__:");
            return;
        }
        onFormChange("categoryId", value);
    };

    const handleCustomCategoryNameChange = (value: string) => {
        onFormChange("categoryId", `__new__:${value}`);
    };

    const handleImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") onFormChange("imageUrl", reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleGemstoneConfirm = (stoneWeight: number, stoneAmount: number) => {
        setHasGemstone(true);
        onFormChange("stoneWeight", stoneWeight);
        onFormChange("stoneAmount", stoneAmount);
        onFormChange("stoneRate", 0);
    };

    const handleBeadsConfirm = (beadsWeight: number, beadsAmount: number) => {
        setHasBeads(true);
        onFormChange("beadsWeight", beadsWeight);
        onFormChange("beadsAmount", beadsAmount);
    };

    return (
        <div className="card animate-fade-in" data-item-form>
            {/* ── Header ── */}
            <div className="card-header" style={{ padding: "8px 14px" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Plus size={15} />
                    {isEditing ? "Edit Item" : "Add Item"}
                </h3>
                <div style={{ display: "flex", gap: 6 }}>
                    {transactionType !== "PURCHASE" && (
                        <button className="btn btn-sm btn-ghost" onClick={() => setIsStockModalOpen(true)}>
                            <Package size={13} /> Stock
                        </button>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={onReset}>
                        <RotateCcw size={13} /> Reset
                    </button>
                </div>
            </div>

            <div className="card-body" style={{ padding: "10px 14px" }}>
                {/* ── Row 1: Category, Metal, Description, Rate, Carat, Pieces, Size ── */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.9fr 2fr 0.9fr 0.7fr 0.55fr 0.55fr",
                    gap: "6px",
                    marginBottom: "6px",
                }}>
                    {/* Category */}
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <select className="form-select"
                            value={formData.categoryId}
                            onChange={e => handleCategorySelectChange(e.target.value)}>
                            <option value="">Select…</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                            {!hasDiamondCategory && <option value="__new__:Diamond">Diamond</option>}
                            <option value="__new__">+ New Category</option>
                        </select>
                        {(formData.categoryId === "__new__" || formData.categoryId.startsWith("__new__:")) && (
                            <input className="form-input" placeholder="Category name…"
                                value={customCategoryName}
                                onChange={e => handleCustomCategoryNameChange(e.target.value)}
                                style={{ marginTop: 4 }} />
                        )}
                    </div>

                    {/* Metal Type */}
                    <div className="form-group">
                        <label className="form-label">Metal</label>
                        <select className="form-select"
                            value={formData.metalTypeId || ""}
                            onChange={e => onFormChange("metalTypeId", e.target.value || null)}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.5 } : {}}>
                            <option value="">Auto</option>
                            {metalTypes.map(mt => (
                                <option key={mt.id} value={mt.id}>{mt.name} ({mt.purity})</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label">Item Detail</label>
                        <input className="form-input" list={listId}
                            placeholder="Describe the item…"
                            value={formData.description}
                            onChange={e => onFormChange("description", e.target.value)} />
                        <datalist id={listId}>
                            {shortcuts.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>

                    {/* Gold Rate */}
                    <div className="form-group">
                        <label className="form-label">
                            Rate
                            {transactionType === "PURCHASE" && <span style={{ marginLeft: 4, fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 400 }}>(edit)</span>}
                        </label>
                        <input className="form-input" type="number" value={goldRate}
                            readOnly={transactionType !== "PURCHASE" || !onGoldRateChange}
                            onChange={e => onGoldRateChange?.(Number(e.target.value))}
                            style={{
                                fontWeight: 700,
                                color: "var(--gold-dark)",
                                background: transactionType === "PURCHASE" && onGoldRateChange ? "var(--cream-light)" : "var(--cream)",
                                cursor: transactionType === "PURCHASE" && onGoldRateChange ? "text" : "default",
                            }} />
                    </div>

                    {/* Carat */}
                    <div className="form-group">
                        <label className="form-label">Carat (K)</label>
                        <input className="form-input" type="number" min={1} max={24} step={0.001}
                            value={formData.carat}
                            onChange={e => onFormChange("carat", Number(e.target.value))}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.5 } : {}} />
                    </div>

                    {/* Pieces */}
                    <div className="form-group">
                        <label className="form-label">Pcs</label>
                        <input className="form-input" type="number" min={1}
                            value={formData.pieces}
                            onChange={e => onFormChange("pieces", Number(e.target.value))}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.5 } : {}} />
                    </div>

                    {/* Size */}
                    <div className="form-group">
                        <label className="form-label">Size</label>
                        <input className="form-input" placeholder="—"
                            value={formData.size}
                            onChange={e => onFormChange("size", e.target.value)}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.5 } : {}} />
                    </div>
                </div>

                {/* ── Row 2: Guarantee, Weights, Stone Rate/Amt, Actions ── */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: transactionType === "PURCHASE"
                        ? "1.4fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr"
                        : "1.4fr 1fr 1fr 1fr 1fr 1fr 1.5fr",
                    gap: "6px",
                    alignItems: "end",
                }}>
                    {/* Guarantee calculator */}
                    <div className="form-group">
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
                                    value={purity.toFixed(3)}
                                    onChange={e => {
                                        const p = Math.min(1, Math.max(0, Number(e.target.value)));
                                        onFormChange("carat", Number((p * 24).toFixed(3)));
                                    }}
                                    disabled={isDiamondCategory}
                                    style={{ height: 28, fontSize: "0.7rem", ...(isDiamondCategory ? { opacity: 0.5 } : {}) }}
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: "0.55rem", color: "var(--success)", marginBottom: 2, paddingLeft: 2 }}>Pure (g)</div>
                                <input className="form-input" readOnly
                                    value={pureGold.toFixed(3)}
                                    style={{ height: 28, fontSize: "0.7rem", background: "var(--success-bg)", color: "var(--success)", fontWeight: 700, fontFamily: "var(--font-mono)" }}
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: 2, paddingLeft: 2 }}>Alloy (g)</div>
                                <input className="form-input" readOnly
                                    value={alloyWt.toFixed(3)}
                                    style={{ height: 28, fontSize: "0.7rem", background: "var(--cream)", fontFamily: "var(--font-mono)" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Gold Weight */}
                    <div className="form-group">
                        <label className="form-label">Gold Wt (g)</label>
                        <input className="form-input" type="number" min={0} step={0.001}
                            value={formData.estimatedGoldWeight}
                            onChange={e => onFormChange("estimatedGoldWeight", Number(e.target.value))}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.5 } : {}} />
                    </div>

                    {/* PURCHASE only: Kaat + Pure preview */}
                    {transactionType === "PURCHASE" && (
                        <div style={{ display: "flex", gap: 4 }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label" style={{ color: "var(--danger)" }}>Kaat Wt</label>
                                <input className="form-input" readOnly
                                    value={kaatWeightPreview > 0 ? kaatWeightPreview.toFixed(3) : "—"}
                                    style={{ background: "var(--cream)", color: "var(--danger)", fontWeight: 600 }} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label" style={{ color: "var(--success)" }}>Pure Wt</label>
                                <input className="form-input" readOnly
                                    value={pureWeightPreview > 0 ? pureWeightPreview.toFixed(3) : "—"}
                                    style={{ background: "var(--cream)", color: "var(--success)", fontWeight: 700 }} />
                            </div>
                        </div>
                    )}

                    {/* Stone Weight + Rate */}
                    <div className="form-group">
                        <label className="form-label">Stone Wt (g)</label>
                        <input className="form-input" type="number" min={0} step={0.001}
                            value={formData.stoneWeight}
                            onChange={e => onFormChange("stoneWeight", Number(e.target.value))}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.5 } : {}} />
                    </div>

                    {/* Stone Rate */}
                    <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span>St. Rate /g</span>
                            {effectiveStoneAmt > 0 && (
                                <span style={{ fontSize: "0.55rem", fontFamily: "var(--font-mono)", color: "var(--maroon)", fontWeight: 700 }}>
                                    ={effectiveStoneAmt.toFixed(0)}
                                </span>
                            )}
                        </label>
                        <input className="form-input" type="number" min={0} step={1}
                            placeholder="Rate per gram"
                            value={formData.stoneRate || ""}
                            onChange={e => {
                                onFormChange("stoneRate", Number(e.target.value));
                            }}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.5 } : { color: "var(--maroon)" }} />
                    </div>

                    {/* Beads Weight */}
                    <div className="form-group">
                        <label className="form-label">Beads Wt (g)</label>
                        <input className="form-input" type="number" min={0} step={0.001}
                            value={formData.beadsWeight}
                            onChange={e => onFormChange("beadsWeight", Number(e.target.value))}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.5 } : {}} />
                    </div>

                    {/* Diamond Weight */}
                    <div className="form-group">
                        <label className="form-label">Diamond Wt (g)</label>
                        <input className="form-input" type="number" min={0} step={0.001}
                            value={formData.diamondWeight}
                            onChange={e => onFormChange("diamondWeight", Number(e.target.value))} />
                    </div>

                    {/* Checkboxes + Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {transactionType !== "PURCHASE" && (
                            <label className="form-checkbox">
                                <input type="checkbox"
                                    checked={formData.isRepairingOrder}
                                    onChange={e => onFormChange("isRepairingOrder", e.target.checked)}
                                    disabled={isDiamondCategory} />
                                Repairing
                            </label>
                        )}
                        <label className="form-checkbox">
                            <input type="checkbox"
                                checked={formData.isSampleGold}
                                onChange={e => onFormChange("isSampleGold", e.target.checked)}
                                disabled={isDiamondCategory} />
                            Sample Gold
                        </label>
                        <label className="form-checkbox" style={{ color: hasGemstone ? "var(--maroon)" : undefined }}>
                            <input type="checkbox"
                                checked={hasGemstone}
                                onChange={e => {
                                    if (e.target.checked) {
                                        setIsGemstoneModalOpen(true);
                                    } else {
                                        setHasGemstone(false);
                                        onFormChange("stoneWeight", 0);
                                        onFormChange("stoneAmount", 0);
                                        onFormChange("stoneRate", 0);
                                    }
                                }}
                                disabled={isDiamondCategory} />
                            {hasGemstone && formData.stoneWeight > 0
                                ? `Gem (${formData.stoneWeight.toFixed(2)}g)`
                                : "Gemstone"}
                        </label>
                        <label className="form-checkbox" style={{ color: hasBeads ? "#92400e" : undefined }}>
                            <input type="checkbox"
                                checked={hasBeads}
                                onChange={e => {
                                    if (e.target.checked) {
                                        setIsBeadsModalOpen(true);
                                    } else {
                                        setHasBeads(false);
                                        onFormChange("beadsWeight", 0);
                                        onFormChange("beadsAmount", 0);
                                    }
                                }}
                                disabled={isDiamondCategory} />
                            {hasBeads && formData.beadsWeight > 0
                                ? `Beads (${formData.beadsWeight.toFixed(2)}g)`
                                : "Beads"}
                        </label>

                        <button className="btn btn-primary btn-sm" onClick={onAddItem} style={{ marginTop: 2 }}>
                            <Plus size={13} />
                            {isEditing ? "Update" : "Add Item"}
                        </button>

                        {/* Camera / image capture */}
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setIsCameraOpen(true)}
                            title="Add photo: camera or file upload"
                        >
                            <Gem size={13} />
                            {formData.imageUrl ? "Change Pic" : "Add Pic"}
                        </button>

                        {formData.imageUrl && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={formData.imageUrl} alt="Item"
                                    style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                                <button className="btn btn-icon btn-ghost btn-sm"
                                    onClick={() => onFormChange("imageUrl", null)}
                                    style={{ width: 22, height: 22 }}>
                                    <X size={11} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden file input for direct file upload fallback */}
            <input ref={itemImageInputRef} type="file" accept="image/*"
                onChange={handleImageSelected} style={{ display: "none" }} />

            {/* Camera Capture Dialog */}
            <CameraCapture
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={(dataUrl) => {
                    onFormChange("imageUrl", dataUrl);
                    setIsCameraOpen(false);
                }}
                onFileUpload={(dataUrl) => {
                    onFormChange("imageUrl", dataUrl);
                    setIsCameraOpen(false);
                }}
            />

            <StockSelectionModal
                isOpen={isStockModalOpen}
                onClose={() => setIsStockModalOpen(false)}
                onSelect={handleStockSelect} />

            <GemstoneModal
                isOpen={isGemstoneModalOpen}
                onClose={() => {
                    setIsGemstoneModalOpen(false);
                    if (!hasGemstone) setHasGemstone(false);
                }}
                onConfirm={handleGemstoneConfirm} />

            <BeadsModal
                isOpen={isBeadsModalOpen}
                onClose={() => {
                    setIsBeadsModalOpen(false);
                    if (!hasBeads) setHasBeads(false);
                }}
                onConfirm={handleBeadsConfirm} />
        </div>
    );
}
