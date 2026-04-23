/**
 * ============================================================================
 * ITEM GRID TABLE COMPONENT
 * ============================================================================
 *
 * Data grid for invoice line items. Columns are user-toggleable via
 * ColumnVisibilityMenu; selection persists in localStorage.
 * ============================================================================
 */

"use client";

import { Pencil, Trash2, ImageIcon, LayoutList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { InvoiceItem, TransactionType } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/utils";
import ColumnVisibilityMenu, { type ColumnDef } from "./ColumnVisibilityMenu";

interface ItemGridProps {
    transactionType?: TransactionType;
    items: InvoiceItem[];
    totals: {
        goldWeight: number;
        stoneWeight: number;
        beadsWeight: number;
        diamondWeight: number;
        goldAmount: number;
        stoneAmount: number;
        beadsAmount: number;
        diamondAmount: number;
        polishAmount: number;
        labourAmount: number;
        totalAmount: number;
    };
    onEditItem: (index: number) => void;
    onDeleteItem: (index: number) => void;
    onImageUpload: (index: number) => void;
    onCategorize?: (index: number) => void;
}

const STORAGE_KEY = "invoice_grid_visible_columns_v2";

const ALL_COLUMNS: ColumnDef[] = [
    { key: "sno",         label: "S#",          alwaysOn: true, group: "Identity" },
    { key: "image",       label: "Image",                       group: "Identity" },
    { key: "category",    label: "Category",                    group: "Identity" },
    { key: "description", label: "Description",                 group: "Identity" },

    { key: "pieces",      label: "Pcs",                         group: "Weights" },
    { key: "carat",       label: "Carat",                       group: "Weights" },
    { key: "goldWt",      label: "Gold Wt",                     group: "Weights" },
    { key: "kaatWt",      label: "Kaat Wt",                     group: "Weights" },
    { key: "pureWt",      label: "Pure Wt",                     group: "Weights" },
    { key: "stoneWt",     label: "Stone Wt",                    group: "Weights" },
    { key: "beadsWt",     label: "Beads Wt",                    group: "Weights" },
    { key: "diamondWt",   label: "Diamond Wt",                  group: "Weights" },

    { key: "goldAmt",     label: "Gold Amt",                    group: "Amounts" },
    { key: "stoneAmt",    label: "Stone Amt",                   group: "Amounts" },
    { key: "beadsAmt",    label: "Beads Amt",                   group: "Amounts" },
    { key: "diamondAmt",  label: "Diamond Amt",                 group: "Amounts" },
    { key: "polishAmt",   label: "Polish",                      group: "Amounts" },
    { key: "labourAmt",   label: "Labour",                      group: "Amounts" },
    { key: "total",       label: "Total",       alwaysOn: true, group: "Amounts" },

    { key: "actions",     label: "Actions",     alwaysOn: true, group: "System" },
];

function defaultVisibility(transactionType: TransactionType): Record<string, boolean> {
    const isPurchase = transactionType === "PURCHASE";
    return {
        sno: true,
        image: true,
        category: true,
        description: true,
        pieces: true,
        carat: true,
        goldWt: true,
        kaatWt: isPurchase,
        pureWt: isPurchase,
        stoneWt: true,
        beadsWt: true,
        diamondWt: true,
        goldAmt: true,
        stoneAmt: true,
        beadsAmt: true,
        diamondAmt: true,
        polishAmt: !isPurchase,
        labourAmt: true,
        total: true,
        actions: true,
    };
}

export default function ItemGrid({
    transactionType = "SALE",
    items,
    totals,
    onEditItem,
    onDeleteItem,
    onImageUpload,
    onCategorize,
}: ItemGridProps) {
    const [visible, setVisible] = useState<Record<string, boolean>>(() => defaultVisibility(transactionType));

    // Hydrate from localStorage once on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Record<string, boolean>;
                setVisible((prev) => ({ ...prev, ...parsed }));
            }
        } catch {
            /* noop */
        }
    }, []);

    // Persist on change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
        } catch {
            /* noop */
        }
    }, [visible]);

    const columns = useMemo(() => {
        // For SALE mode, hide the Kaat/Pure rows from the menu (they apply only to PURCHASE)
        if (transactionType === "SALE") {
            return ALL_COLUMNS.filter((c) => c.key !== "kaatWt" && c.key !== "pureWt");
        }
        return ALL_COLUMNS;
    }, [transactionType]);

    const show = (k: string) => !!visible[k];
    const colCount = columns.filter((c) => show(c.key)).length;

    return (
        <div
            className="card animate-fade-in"
            style={{ animationDelay: "200ms", overflow: "visible" }}
        >
            <div className="card-header" style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3>Item Details ({items.length} items)</h3>
                <ColumnVisibilityMenu
                    columns={columns}
                    visible={visible}
                    onChange={setVisible}
                    onReset={() => setVisible(defaultVisibility(transactionType))}
                />
            </div>
            <div style={{ overflowX: "auto" }}>
                <table className="data-grid">
                    <thead>
                        <tr>
                            {show("sno") && <th style={{ minWidth: "32px" }}>S#</th>}
                            {show("image") && <th style={{ minWidth: "44px" }}>Img</th>}
                            {show("category") && <th style={{ minWidth: "80px" }}>Category</th>}
                            {show("description") && <th style={{ minWidth: "110px" }}>Description</th>}
                            {show("pieces") && <th style={{ minWidth: "32px", textAlign: "right" }}>Pcs</th>}
                            {show("carat") && <th style={{ minWidth: "32px", textAlign: "right" }}>Ct</th>}
                            {show("goldWt") && <th style={{ minWidth: "68px", textAlign: "right" }}>Gold Wt</th>}
                            {show("kaatWt") && transactionType === "PURCHASE" && (
                                <th style={{ minWidth: "68px", textAlign: "right", color: "var(--danger)" }}>Kaat Wt</th>
                            )}
                            {show("pureWt") && transactionType === "PURCHASE" && (
                                <th style={{ minWidth: "68px", textAlign: "right", color: "var(--success)" }}>Pure Wt</th>
                            )}
                            {show("stoneWt") && <th style={{ minWidth: "60px", textAlign: "right" }}>Stone Wt</th>}
                            {show("beadsWt") && <th style={{ minWidth: "60px", textAlign: "right" }}>Beads Wt</th>}
                            {show("diamondWt") && <th style={{ minWidth: "60px", textAlign: "right" }}>Dmnd Wt</th>}
                            {show("goldAmt") && <th style={{ minWidth: "72px", textAlign: "right" }}>Gold Amt</th>}
                            {show("stoneAmt") && <th style={{ minWidth: "64px", textAlign: "right" }}>Stone Amt</th>}
                            {show("beadsAmt") && <th style={{ minWidth: "64px", textAlign: "right" }}>Beads Amt</th>}
                            {show("diamondAmt") && <th style={{ minWidth: "64px", textAlign: "right" }}>Dmnd Amt</th>}
                            {show("polishAmt") && transactionType === "SALE" && (
                                <th style={{ minWidth: "60px", textAlign: "right" }}>Polish</th>
                            )}
                            {show("labourAmt") && <th style={{ minWidth: "60px", textAlign: "right" }}>Labour</th>}
                            {show("total") && <th style={{ minWidth: "80px", textAlign: "right" }}>Total</th>}
                            {show("actions") && <th style={{ minWidth: "80px" }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={colCount}
                                    style={{
                                        textAlign: "center",
                                        padding: "28px",
                                        color: "var(--text-muted)",
                                        fontSize: "0.8125rem",
                                    }}
                                >
                                    No items added yet. Use the form above to add items.
                                </td>
                            </tr>
                        ) : (
                            items.map((item, index) => (
                                <tr key={item.id}>
                                    {show("sno") && <td style={{ fontSize: "0.75rem" }}>{index + 1}</td>}
                                    {show("image") && (
                                        <td>
                                            {item.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.categoryName || "Item"}
                                                    style={{
                                                        width: "36px",
                                                        height: "36px",
                                                        objectFit: "cover",
                                                        borderRadius: "4px",
                                                        border: "1px solid var(--border)",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => onImageUpload(index)}
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => onImageUpload(index)}
                                                    style={{
                                                        width: "36px",
                                                        height: "36px",
                                                        borderRadius: "4px",
                                                        border: "1px dashed var(--border)",
                                                        background: "var(--cream-light)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        cursor: "pointer",
                                                        transition: "border-color var(--transition-fast)",
                                                    }}
                                                    title="Click to add image"
                                                >
                                                    <ImageIcon size={14} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    {show("category") && <td style={{ fontSize: "0.75rem" }}>{item.categoryName || "—"}</td>}
                                    {show("description") && (
                                        <td
                                            style={{ maxWidth: "130px", fontSize: "0.75rem" }}
                                            title={item.description || ""}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <span style={{
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}>
                                                    {item.description || "—"}
                                                </span>
                                                {item.isBulkPurchase && (
                                                    <span style={{
                                                        flexShrink: 0,
                                                        fontSize: "0.5rem",
                                                        fontWeight: 700,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.06em",
                                                        background: "rgba(201,168,76,0.15)",
                                                        color: "var(--gold-dark)",
                                                        border: "1px solid rgba(201,168,76,0.3)",
                                                        padding: "1px 4px",
                                                        borderRadius: 3,
                                                    }}>
                                                        Bulk
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {show("pieces") && <td className="num">{item.pieces}</td>}
                                    {show("carat") && <td className="num">{item.carat}</td>}
                                    {show("goldWt") && <td className="num">{formatWeight(item.estimatedGoldWeight)}</td>}
                                    {show("kaatWt") && transactionType === "PURCHASE" && (
                                        <td className="num" style={{ color: "var(--danger)", fontWeight: 600 }}>{formatWeight(item.kaatWeight || 0)}</td>
                                    )}
                                    {show("pureWt") && transactionType === "PURCHASE" && (
                                        <td className="num" style={{ color: "var(--success)", fontWeight: 600 }}>{formatWeight(item.adjustedGoldWeight)}</td>
                                    )}
                                    {show("stoneWt") && <td className="num">{formatWeight(item.stoneWeight)}</td>}
                                    {show("beadsWt") && <td className="num">{formatWeight(item.beadsWeight)}</td>}
                                    {show("diamondWt") && <td className="num">{formatWeight(item.diamondWeight)}</td>}
                                    {show("goldAmt") && (
                                        <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(item.goldAmount)}</td>
                                    )}
                                    {show("stoneAmt") && <td className="num">{formatCurrency(item.stoneAmount)}</td>}
                                    {show("beadsAmt") && <td className="num">{formatCurrency(item.beadsAmount)}</td>}
                                    {show("diamondAmt") && <td className="num">{formatCurrency(item.diamondAmount)}</td>}
                                    {show("polishAmt") && transactionType === "SALE" && (
                                        <td className="num">{formatCurrency(item.polishAmount)}</td>
                                    )}
                                    {show("labourAmt") && <td className="num">{formatCurrency(item.labourAmount)}</td>}
                                    {show("total") && (
                                        <td className="num" style={{ fontWeight: 700, color: "var(--maroon)" }}>
                                            {formatCurrency(item.totalAmount)}
                                        </td>
                                    )}
                                    {show("actions") && (
                                        <td>
                                            <div style={{ display: "flex", gap: "2px" }}>
                                                {item.isBulkPurchase && onCategorize && (
                                                    <button
                                                        className="btn btn-icon btn-ghost btn-sm"
                                                        onClick={() => onCategorize(index)}
                                                        title="Categorise bulk gold"
                                                        style={{ width: "26px", height: "26px", color: "var(--gold-dark)" }}
                                                    >
                                                        <LayoutList size={12} />
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-icon btn-ghost btn-sm"
                                                    onClick={() => onEditItem(index)}
                                                    title="Edit Item"
                                                    style={{ width: "26px", height: "26px" }}
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-ghost btn-sm"
                                                    onClick={() => onDeleteItem(index)}
                                                    title="Delete Item"
                                                    style={{ width: "26px", height: "26px", color: "var(--danger)" }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot>
                            <tr>
                                <TotalsRow
                                    show={show}
                                    transactionType={transactionType}
                                    totals={totals}
                                />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

// ─── Footer totals row — rendered column-aware ───────────────────
function TotalsRow({
    show,
    transactionType,
    totals,
}: {
    show: (k: string) => boolean;
    transactionType: TransactionType;
    totals: ItemGridProps["totals"];
}) {
    // Count leading label columns so the "TOTALS" cell spans them.
    const leadingKeys = ["sno", "image", "category", "description", "pieces", "carat"];
    const leadingShown = leadingKeys.filter((k) => show(k)).length;

    return (
        <>
            {leadingShown > 0 && (
                <td colSpan={leadingShown} style={{ textAlign: "right", fontWeight: 700 }}>
                    TOTALS
                </td>
            )}
            {show("goldWt") && <td className="num">{formatWeight(totals.goldWeight)}</td>}
            {show("kaatWt") && transactionType === "PURCHASE" && <td className="num"></td>}
            {show("pureWt") && transactionType === "PURCHASE" && <td className="num"></td>}
            {show("stoneWt") && <td className="num">{formatWeight(totals.stoneWeight)}</td>}
            {show("beadsWt") && <td className="num">{formatWeight(totals.beadsWeight)}</td>}
            {show("diamondWt") && <td className="num">{formatWeight(totals.diamondWeight)}</td>}
            {show("goldAmt") && <td className="num">{formatCurrency(totals.goldAmount)}</td>}
            {show("stoneAmt") && <td className="num">{formatCurrency(totals.stoneAmount)}</td>}
            {show("beadsAmt") && <td className="num">{formatCurrency(totals.beadsAmount)}</td>}
            {show("diamondAmt") && <td className="num">{formatCurrency(totals.diamondAmount)}</td>}
            {show("polishAmt") && transactionType === "SALE" && <td className="num">{formatCurrency(totals.polishAmount)}</td>}
            {show("labourAmt") && <td className="num">{formatCurrency(totals.labourAmount)}</td>}
            {show("total") && (
                <td className="num" style={{ fontWeight: 800, color: "var(--maroon)" }}>
                    {formatCurrency(totals.totalAmount)}
                </td>
            )}
            {show("actions") && <td></td>}
        </>
    );
}
