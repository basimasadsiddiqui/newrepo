/**
 * ============================================================================
 * ITEM GRID TABLE COMPONENT
 * ============================================================================
 *
 * Displays all invoice line items in a data grid.
 * Each row shows:
 *  S#, Image, Category, Description, Pcs, Carat, Gold Wt, Stone Wt, Beads Wt,
 *  Diamond Wt, Gold Amt, Stone Amt, Beads Amt, Diamond Amt,
 *  Polish Amt, Labour Amt, Total, Actions
 *
 * Footer row shows column totals.
 * ============================================================================
 */

"use client";

import { Pencil, Trash2, ImagePlus, ImageIcon } from "lucide-react";
import type { InvoiceItem, TransactionType } from "@/types";
import { formatCurrency, formatWeight } from "@/lib/utils";

interface ItemGridProps {
    /** Transaction Type to conditionally render fields */
    transactionType?: TransactionType;
    /** All line items in the invoice */
    items: InvoiceItem[];
    /** Totals for each numeric column */
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

    // ── Callbacks ──
    onEditItem: (index: number) => void;
    onDeleteItem: (index: number) => void;
    onImageUpload: (index: number) => void;
}

export default function ItemGrid({
    transactionType = "SALE",
    items,
    totals,
    onEditItem,
    onDeleteItem,
    onImageUpload,
}: ItemGridProps) {
    return (
        <div
            className="card animate-fade-in"
            style={{ animationDelay: "200ms", overflow: "hidden" }}
        >
            <div className="card-header" style={{ padding: "10px 16px" }}>
                <h3>Item Details ({items.length} items)</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table className="data-grid">
                    <thead>
                        <tr>
                            <th style={{ minWidth: "32px" }}>S#</th>
                            <th style={{ minWidth: "44px" }}>Img</th>
                            <th style={{ minWidth: "80px" }}>Category</th>
                            <th style={{ minWidth: "110px" }}>Description</th>
                            <th style={{ minWidth: "32px", textAlign: "right" }}>Pcs</th>
                            <th style={{ minWidth: "32px", textAlign: "right" }}>Ct</th>
                            <th style={{ minWidth: "68px", textAlign: "right" }}>Gold Wt</th>
                            {transactionType === "PURCHASE" && (
                                <th style={{ minWidth: "68px", textAlign: "right", color: "var(--danger)" }}>Kaat Wt</th>
                            )}
                            {transactionType === "PURCHASE" && (
                                <th style={{ minWidth: "68px", textAlign: "right", color: "var(--success)" }}>Pure Wt</th>
                            )}
                            <th style={{ minWidth: "60px", textAlign: "right" }}>Stone Wt</th>
                            <th style={{ minWidth: "60px", textAlign: "right" }}>Beads Wt</th>
                            <th style={{ minWidth: "60px", textAlign: "right" }}>Dmnd Wt</th>
                            <th style={{ minWidth: "72px", textAlign: "right" }}>Gold Amt</th>
                            <th style={{ minWidth: "64px", textAlign: "right" }}>Stone Amt</th>
                            <th style={{ minWidth: "64px", textAlign: "right" }}>Beads Amt</th>
                            <th style={{ minWidth: "64px", textAlign: "right" }}>Dmnd Amt</th>
                            {transactionType === "SALE" && (
                                <th style={{ minWidth: "60px", textAlign: "right" }}>Polish</th>
                            )}
                            <th style={{ minWidth: "60px", textAlign: "right" }}>Labour</th>
                            <th style={{ minWidth: "80px", textAlign: "right" }}>Total</th>
                            <th style={{ minWidth: "80px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={18}
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
                                    <td style={{ fontSize: "0.75rem" }}>{index + 1}</td>
                                    {/* Image thumbnail or placeholder */}
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
                                                title="Click to upload image"
                                            >
                                                <ImageIcon size={14} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontSize: "0.75rem" }}>{item.categoryName || "—"}</td>
                                    <td
                                        style={{
                                            maxWidth: "110px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            fontSize: "0.75rem",
                                        }}
                                        title={item.description || ""}
                                    >
                                        {item.description || "—"}
                                    </td>
                                    <td className="num">{item.pieces}</td>
                                    <td className="num">{item.carat}</td>
                                    <td className="num">{formatWeight(item.estimatedGoldWeight)}</td>
                                    {transactionType === "PURCHASE" && (
                                        <td className="num" style={{ color: "var(--danger)", fontWeight: 600 }}>{formatWeight(item.kaatWeight || 0)}</td>
                                    )}
                                    {transactionType === "PURCHASE" && (
                                        <td className="num" style={{ color: "var(--success)", fontWeight: 600 }}>{formatWeight(item.adjustedGoldWeight)}</td>
                                    )}
                                    <td className="num">{formatWeight(item.stoneWeight)}</td>
                                    <td className="num">{formatWeight(item.beadsWeight)}</td>
                                    <td className="num">{formatWeight(item.diamondWeight)}</td>
                                    <td className="num" style={{ fontWeight: 600 }}>
                                        {formatCurrency(item.goldAmount)}
                                    </td>
                                    <td className="num">{formatCurrency(item.stoneAmount)}</td>
                                    <td className="num">{formatCurrency(item.beadsAmount)}</td>
                                    <td className="num">{formatCurrency(item.diamondAmount)}</td>
                                    {transactionType === "SALE" && (
                                        <td className="num">{formatCurrency(item.polishAmount)}</td>
                                    )}
                                    <td className="num">{formatCurrency(item.labourAmount)}</td>
                                    <td
                                        className="num"
                                        style={{
                                            fontWeight: 700,
                                            color: "var(--maroon)",
                                        }}
                                    >
                                        {formatCurrency(item.totalAmount)}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: "2px" }}>
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
                                                style={{
                                                    width: "26px",
                                                    height: "26px",
                                                    color: "var(--danger)",
                                                }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan={6} style={{ textAlign: "right", fontWeight: 700 }}>
                                    TOTALS
                                </td>
                                <td className="num">{formatWeight(totals.goldWeight)}</td>
                                {transactionType === "PURCHASE" && (
                                    <td className="num"></td> /* No total for Kaat Weight */
                                )}
                                {transactionType === "PURCHASE" && (
                                    <td className="num"></td> /* No total for Pure Weight */
                                )}
                                <td className="num">{formatWeight(totals.stoneWeight)}</td>
                                <td className="num">{formatWeight(totals.beadsWeight)}</td>
                                <td className="num">{formatWeight(totals.diamondWeight)}</td>
                                <td className="num">{formatCurrency(totals.goldAmount)}</td>
                                <td className="num">{formatCurrency(totals.stoneAmount)}</td>
                                <td className="num">{formatCurrency(totals.beadsAmount)}</td>
                                <td className="num">{formatCurrency(totals.diamondAmount)}</td>
                                {transactionType === "SALE" && (
                                    <td className="num">{formatCurrency(totals.polishAmount)}</td>
                                )}
                                <td className="num">{formatCurrency(totals.labourAmount)}</td>
                                <td
                                    className="num"
                                    style={{ fontWeight: 800, color: "var(--maroon)" }}
                                >
                                    {formatCurrency(totals.totalAmount)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
