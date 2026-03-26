/**
 * ============================================================================
 * ITEM ENTRY FORM COMPONENT
 * ============================================================================
 *
 * Form for adding a new line item to the invoice.
 * Contains:
 * - Category dropdown
 * - Item description
 * - Gold Rate & Carat inputs with real-time Karat↔Ratti conversion
 * - Pieces & Size
 * - Repairing Order & Sample Gold checkboxes
 * - Estimated Gold Weight
 * - Stone, Beads, Diamond weight inputs
 * - "Add Item" button
 *
 * The Karat↔Ratti conversion is displayed inline as a helper.
 * ============================================================================
 */

"use client";

import { Plus, RotateCcw, ArrowRightLeft, Package, ImagePlus, X } from "lucide-react";
import type { Category, ItemEntryFormData, MetalTypeOption } from "@/types";
import { karatToRatti, rattiToKarat } from "@/lib/calculationEngine";
import { useRef, useState, type ChangeEvent } from "react";
import StockSelectionModal from "./StockSelectionModal";

interface ItemEntryFormProps {
    /** Available categories */
    categories: Category[];
    /** Available metal types */
    metalTypes: MetalTypeOption[];
    /** Current gold rate (displayed, editable at invoice level) */
    goldRate: number;
    /** Form data for the item being entered */
    formData: ItemEntryFormData;
    /** Whether we're editing an existing item */
    isEditing: boolean;
    /** The active transaction type from Invoice */
    transactionType?: import("@/types").TransactionType;

    // ── Pre-calculated Kaat and Pure Weight for UI ──
    kaatWeightPreview?: number;
    pureWeightPreview?: number;

    // ── Callbacks ──

    onFormChange: (field: keyof ItemEntryFormData, value: unknown) => void;
    onAddItem: () => void;
    onReset: () => void;
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
}: ItemEntryFormProps) {
    // ── Karat ↔ Ratti Conversion State ──
    const [rattiValue, setRattiValue] = useState<number>(
        karatToRatti(formData.carat)
    );
    const [convertMode, setConvertMode] = useState<"karat" | "ratti">("karat");
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const itemImageInputRef = useRef<HTMLInputElement>(null);
    const displayRattiValue = convertMode === "ratti" ? rattiValue : karatToRatti(formData.carat);
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

    /** Handle ratti input → update karat */
    const handleRattiChange = (ratti: number) => {
        setRattiValue(ratti);
        setConvertMode("ratti");
        const newKarat = rattiToKarat(ratti);
        onFormChange("carat", Number(newKarat.toFixed(4)));
    };

    /** Handle karat input → update ratti */
    const handleKaratChange = (karat: number) => {
        setConvertMode("karat");
        onFormChange("carat", Number(karat.toFixed(4)));
    };

    const handleStockSelect = (item: StockSelectionItem) => {
        onFormChange("inventoryItemId", item.id);
        onFormChange("description", item.product?.name || "Stock Item");
        onFormChange("imageUrl", item.product?.imageUrl || null);
        onFormChange("metalTypeId", item.metalType?.id || item.product?.metalType?.id || null);

        // Try to match category
        const catName = item.product?.category?.name;
        if (catName) {
            const cat = categories.find(c => c.name === catName);
            if (cat) onFormChange("categoryId", cat.id);
        }

        // Parse purity (e.g. "21K" -> 21)
        const purityStr = item.metalType?.purity || item.product?.metalType?.purity;
        if (purityStr) {
            const purity = parseFloat(purityStr);
            if (!isNaN(purity)) {
                onFormChange("carat", purity);
                setConvertMode("karat");
            }
        }

        onFormChange("estimatedGoldWeight", item.netWeight || 0); // Net weight is gold weight for simple items
        onFormChange("stoneWeight", item.stoneWeight || 0);
        onFormChange("pieces", 1);
        setIsStockModalOpen(false);
    };

    const handlePickImageClick = () => {
        itemImageInputRef.current?.click();
    };

    const handleImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
                onFormChange("imageUrl", result);
            }
        };
        reader.readAsDataURL(file);
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

    return (
        <div className="card animate-fade-in" style={{ animationDelay: "100ms" }} data-item-form>
            <div className="card-header" style={{ padding: "10px 16px" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Plus size={16} />
                    {isEditing ? "Edit Item" : "Add New Item"}
                </h3>
                <div className="flex gap-2">
                    <button className="btn btn-sm btn-outline" onClick={() => setIsStockModalOpen(true)}>
                        <Package size={14} />
                        Select from Stock
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={onReset}>
                        <RotateCcw size={14} />
                        Reset
                    </button>
                </div>
            </div>

            <div className="card-body">
                {/* ── Row 1: Category, Detail, Rate, Carat ── */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1.2fr 2fr 1fr 0.8fr 0.8fr 0.8fr",
                        gap: "8px",
                        marginBottom: "8px",
                    }}
                >
                    {/* Category */}
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                            className="form-select"
                            value={formData.categoryId}
                            onChange={(e) => handleCategorySelectChange(e.target.value)}
                        >
                            <option value="">Select category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                            {!hasDiamondCategory && (
                                <option value="__new__:Diamond">Diamond</option>
                            )}
                            <option value="__new__">+ Type New Category</option>
                        </select>
                        {formData.categoryId === "__new__" || formData.categoryId.startsWith("__new__:") ? (
                            <input
                                className="form-input"
                                placeholder="Type category name..."
                                value={customCategoryName}
                                onChange={(e) => handleCustomCategoryNameChange(e.target.value)}
                                style={{ marginTop: "6px" }}
                            />
                        ) : null}
                    </div>

                    {/* Metal Type */}
                    <div className="form-group">
                        <label className="form-label">Metal Type</label>
                        <select
                            className="form-select"
                            value={formData.metalTypeId || ""}
                            onChange={(e) => onFormChange("metalTypeId", e.target.value || null)}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}}
                        >
                            <option value="">Auto (from carat)</option>
                            {metalTypes.map((metalType) => (
                                <option key={metalType.id} value={metalType.id}>
                                    {metalType.name} ({metalType.purity})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label">Item Detail</label>
                        <input
                            className="form-input"
                            placeholder="Describe the item..."
                            value={formData.description}
                            onChange={(e) => onFormChange("description", e.target.value)}
                        />
                    </div>

                    {/* Gold Rate (display) */}
                    <div className="form-group">
                        <label className="form-label">Gold Rate</label>
                        <input
                            className="form-input"
                            type="number"
                            value={goldRate}
                            readOnly
                            style={{
                                fontWeight: 700,
                                color: "var(--gold-dark)",
                                background: "var(--cream)",
                            }}
                        />
                    </div>

                    {/* Carat */}
                    <div className="form-group">
                        <label className="form-label">Carat (K)</label>
                        <input
                            className="form-input"
                            type="number"
                            min={1}
                            max={24}
                            step={0.001}
                            value={formData.carat}
                            onChange={(e) => handleKaratChange(Number(e.target.value))}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}}
                        />
                    </div>

                    {/* Pieces */}
                    <div className="form-group">
                        <label className="form-label">Pieces</label>
                        <input
                            className="form-input"
                            type="number"
                            min={1}
                            value={formData.pieces}
                            onChange={(e) => onFormChange("pieces", Number(e.target.value))}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}}
                        />
                    </div>

                    {/* Size */}
                    <div className="form-group">
                        <label className="form-label">Size</label>
                        <input
                            className="form-input"
                            placeholder="—"
                            value={formData.size}
                            onChange={(e) => onFormChange("size", e.target.value)}
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}}
                        />
                    </div>
                </div>

                {/* ── Row 2: Karat↔Ratti Converter, Weights, Checkboxes ── */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1.5fr",
                        gap: "8px",
                        alignItems: "end",
                    }}
                >
                    {/* Karat ↔ Ratti Converter */}
                    <div
                        style={{
                            background: "var(--cream)",
                            border: "1px solid var(--gold-light)",
                            borderRadius: "var(--radius-sm)",
                            padding: "8px 12px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                marginBottom: "6px",
                                fontSize: "0.6875rem",
                                fontWeight: 600,
                                color: "var(--gold-dark)",
                            }}
                        >
                            <ArrowRightLeft size={12} />
                            Karat ↔ Ratti Converter
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: "0.625rem",
                                        color: "var(--text-muted)",
                                        marginBottom: "2px",
                                    }}
                                >
                                    Karat
                                </div>
                                <input
                                    className="form-input"
                                    type="number"
                                    step={0.001}
                                    value={formData.carat}
                                    onChange={(e) => handleKaratChange(Number(e.target.value))}
                                    disabled={isDiamondCategory}
                                    style={{ height: "30px", fontSize: "0.75rem", ...(isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}) }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: "1rem",
                                    color: "var(--gold-dark)",
                                    fontWeight: 700,
                                    paddingTop: "12px",
                                }}
                            >
                                ⇄
                            </span>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: "0.625rem",
                                        color: "var(--text-muted)",
                                        marginBottom: "2px",
                                    }}
                                >
                                    Ratti
                                </div>
                                <input
                                    className="form-input"
                                    type="number"
                                    step={0.001}
                                    value={displayRattiValue}
                                    onChange={(e) =>
                                        handleRattiChange(Number(e.target.value))
                                    }
                                    disabled={isDiamondCategory}
                                    style={{ height: "30px", fontSize: "0.75rem", ...(isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}) }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Gold Weight in gram (g ) */}
                    <div className="form-group">
                        <label className="form-label">Gold weight in gram (g )</label>
                        <input
                            className="form-input"
                            type="number"
                            min={0}
                            step={0.001}
                            value={formData.estimatedGoldWeight}
                            onChange={(e) =>
                                onFormChange("estimatedGoldWeight", Number(e.target.value))
                            }
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}}
                        />
                    </div>

                    {/* Kaat Weight / Pure Weight (Purchase Only Preview) */}
                    {transactionType === "PURCHASE" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label" style={{ color: "var(--danger)" }}>Kaat Wt (g)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={kaatWeightPreview > 0 ? kaatWeightPreview.toFixed(4) : "—"}
                                    readOnly
                                    style={{ background: "var(--cream)", color: "var(--danger)", fontWeight: 600 }}
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label" style={{ color: "var(--success)" }}>Pure Wt (g)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={pureWeightPreview > 0 ? pureWeightPreview.toFixed(4) : "—"}
                                    readOnly
                                    style={{ background: "var(--cream)", color: "var(--success)", fontWeight: 700 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Stone Weight */}
                    <div className="form-group">
                        <label className="form-label">Stone Wt (g)</label>
                        <input
                            className="form-input"
                            type="number"
                            min={0}
                            step={0.001}
                            value={formData.stoneWeight}
                            onChange={(e) =>
                                onFormChange("stoneWeight", Number(e.target.value))
                            }
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}}
                        />
                    </div>

                    {/* Beads Weight */}
                    <div className="form-group">
                        <label className="form-label">Beads Wt (g)</label>
                        <input
                            className="form-input"
                            type="number"
                            min={0}
                            step={0.001}
                            value={formData.beadsWeight}
                            onChange={(e) =>
                                onFormChange("beadsWeight", Number(e.target.value))
                            }
                            disabled={isDiamondCategory}
                            style={isDiamondCategory ? { opacity: 0.6, background: "var(--bg-muted)" } : {}}
                        />
                    </div>

                    {/* Diamond Weight */}
                    <div className="form-group">
                        <label className="form-label">Diamond Wt (g)</label>
                        <input
                            className="form-input"
                            type="number"
                            min={0}
                            step={0.001}
                            value={formData.diamondWeight}
                            onChange={(e) =>
                                onFormChange("diamondWeight", Number(e.target.value))
                            }
                        />
                    </div>

                    {/* Checkboxes & Add Button */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                        }}
                    >
                        <label className="form-checkbox">
                            <input
                                type="checkbox"
                                checked={formData.isRepairingOrder}
                                onChange={(e) =>
                                    onFormChange("isRepairingOrder", e.target.checked)
                                }
                                disabled={isDiamondCategory}
                            />
                            Repairing Order
                        </label>
                        <label className="form-checkbox">
                            <input
                                type="checkbox"
                                checked={formData.isSampleGold}
                                onChange={(e) =>
                                    onFormChange("isSampleGold", e.target.checked)
                                }
                                disabled={isDiamondCategory}
                            />
                            Sample Gold
                        </label>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={onAddItem}
                            style={{ marginTop: "4px" }}
                        >
                            <Plus size={14} />
                            {isEditing ? "Update Item" : "Add Item"}
                        </button>
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={handlePickImageClick}
                            style={{ marginTop: "2px" }}
                        >
                            <ImagePlus size={14} />
                            {formData.imageUrl ? "Change Picture" : "Add Picture"}
                        </button>
                        {formData.imageUrl ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    marginTop: "4px",
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={formData.imageUrl}
                                    alt="Selected item"
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        objectFit: "cover",
                                        borderRadius: "4px",
                                        border: "1px solid var(--border)",
                                    }}
                                />
                                <button
                                    className="btn btn-icon btn-ghost btn-sm"
                                    onClick={() => onFormChange("imageUrl", null)}
                                    title="Remove image"
                                    style={{ width: "24px", height: "24px" }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <input
                ref={itemImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelected}
                style={{ display: "none" }}
            />
            <StockSelectionModal
                isOpen={isStockModalOpen}
                onClose={() => setIsStockModalOpen(false)}
                onSelect={handleStockSelect}
            />
        </div >
    );
}
