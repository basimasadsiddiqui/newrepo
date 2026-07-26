/**
 * ============================================================================
 * INVOICE SUMMARY COMPONENT
 * ============================================================================
 *
 * Bottom section showing:
 * - Total Gold Weight
 * - Items Subtotal
 * - Other Charges (editable)
 * - Discount (editable)
 * - Total Amount  (= Items Subtotal + Other Charges − Discount)
 * - Customer Gold Value (auto)
 * - Pasa Deduction (auto)
 * - Cash Received (editable)
 * - Gold Received (editable)
 * - Balance (auto-calculated)
 * - Remarks textarea
 * - Action buttons (Save Draft, Finalize, Generate PDF, Send WhatsApp)
 * ============================================================================
 */

"use client";

import {
    Save,
    CheckCircle,
    FileDown,
    MessageCircle,
    Calculator,
} from "lucide-react";
import { formatCurrency, formatWeight } from "@/lib/utils";
import { gramsToPakkaTola, gramsToKachaTola } from "@/lib/calculationEngine";
import { getCurrencySymbol } from "@/shared/utils/currency";

/**
 * A summary row whose value can be entered either as rupees ("RS") or as pure
 * gold grams ("GOLD"). The Rs/Gold selector + gram entry is purchase-only; on a
 * sale invoice it falls back to a plain rupee input.
 */
function renderAmountOrWeightField(opts: {
    label: string;
    transactionType: "SALE" | "PURCHASE";
    currency: string;
    mode: "RS" | "GOLD";
    rupees: number;
    weight: number;
    goldRatePerGram: number;
    onRupeesChange: (value: number) => void;
    onModeChange?: (mode: "RS" | "GOLD") => void;
    onWeightChange?: (value: number) => void;
}) {
    const { label, transactionType, currency, mode, rupees, weight, goldRatePerGram,
        onRupeesChange, onModeChange, onWeightChange } = opts;
    const sym = getCurrencySymbol(currency);

    const inputStyle = { width: "120px", height: "30px", fontSize: "0.75rem", textAlign: "right" as const };
    const allowGoldMode = transactionType === "PURCHASE" && !!onModeChange && !!onWeightChange;
    const isGold = allowGoldMode && mode === "GOLD";

    return (
        <div className="summary-row">
            <span className="label" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {label}
                {/* Rupee equivalent of a gold-weight charge, so the money impact is visible */}
                {isGold && weight > 0 && goldRatePerGram > 0 && (
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        = {sym} {formatCurrency(weight * goldRatePerGram)}
                    </span>
                )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {allowGoldMode && (
                    <select
                        className="form-select"
                        value={mode}
                        onChange={(e) => onModeChange!(e.target.value as "RS" | "GOLD")}
                        style={{ height: "30px", fontSize: "0.7rem", width: "68px" }}
                        title="Enter this value in rupees or in pure gold grams"
                    >
                        <option value="RS">Rs</option>
                        <option value="GOLD">Gold g</option>
                    </select>
                )}
                {isGold ? (
                    <input
                        className="form-input"
                        type="number"
                        step="0.001"
                        min={0}
                        value={weight || ""}
                        placeholder="grams"
                        onChange={(e) => onWeightChange!(Math.max(0, Number(e.target.value)))}
                        style={inputStyle}
                    />
                ) : (
                    <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        min={0}
                        value={rupees}
                        onChange={(e) => onRupeesChange(Math.max(0, Number(e.target.value)))}
                        style={inputStyle}
                    />
                )}
            </div>
        </div>
    );
}

interface InvoiceSummaryProps {
    transactionType?: "SALE" | "PURCHASE";
    /** Selected currency code (purchase). Only swaps the displayed symbol. */
    currency?: string;
    /** All monetary and weight totals */
    totalGoldWeight: number;
    totalPureGoldWeight?: number;
    /** Sum of the line items only, before charges/discount. */
    itemsSubtotal?: number;
    /** Grand total = itemsSubtotal + otherCharges − discount. */
    totalAmount: number;
    otherCharges: number;
    discount: number;
    /** Rupee value of Other Charges / Discount actually applied to the total.
     *  Differs from `otherCharges`/`discount` when the Gold-g mode is used. */
    otherChargesRs?: number;
    discountRs?: number;
    /** Rs/Gold mode for charges & discount (purchase). Defaults to rupees. */
    otherChargesMode?: "RS" | "GOLD";
    otherChargesWeight?: number;
    discountMode?: "RS" | "GOLD";
    discountWeight?: number;
    /** Gold rate per gram — used to show the rupee equivalent of a gold-weight charge. */
    goldRatePerGram?: number;
    customerGoldValue: number;
    pasaDeduction: number;
    cashReceived: number;
    goldReceived: number;
    balance: number;
    remarks: string;

    // ── Callbacks ──
    onOtherChargesChange: (value: number) => void;
    onDiscountChange: (value: number) => void;
    onOtherChargesModeChange?: (mode: "RS" | "GOLD") => void;
    onOtherChargesWeightChange?: (value: number) => void;
    onDiscountModeChange?: (mode: "RS" | "GOLD") => void;
    onDiscountWeightChange?: (value: number) => void;
    onCashReceivedChange: (value: number) => void;
    onGoldReceivedChange: (value: number) => void;
    onRemarksChange: (value: string) => void;
    onSaveDraft: () => void;
    onFinalize: () => void;
    onGeneratePdf: () => void;
    onSendWhatsApp: () => void;
    onClearNew?: () => void;
    onExit?: () => void;
    onPayment?: () => void;
}

export default function InvoiceSummary({
    transactionType = "SALE",
    currency = "PKR",
    totalGoldWeight,
    totalPureGoldWeight = 0,
    itemsSubtotal,
    totalAmount,
    otherCharges,
    discount,
    otherChargesRs,
    discountRs,
    otherChargesMode = "RS",
    otherChargesWeight = 0,
    discountMode = "RS",
    discountWeight = 0,
    goldRatePerGram = 0,
    customerGoldValue,
    pasaDeduction,
    cashReceived,
    goldReceived,
    balance,
    remarks,
    onOtherChargesChange,
    onDiscountChange,
    onOtherChargesModeChange,
    onOtherChargesWeightChange,
    onDiscountModeChange,
    onDiscountWeightChange,
    onCashReceivedChange,
    onGoldReceivedChange,
    onRemarksChange,
    onSaveDraft,
    onFinalize,
    onGeneratePdf,
    onSendWhatsApp,
    onClearNew,
    onExit,
    onPayment,
}: InvoiceSummaryProps) {
    // Amounts shown here are already in the entry currency (user enters foreign,
    // PKR conversion happens at save) — so we only swap the symbol for display.
    const sym = getCurrencySymbol(currency);

    // The rupee amounts that actually move the total. In "Gold g" mode the parent
    // passes the converted rupee value; fall back to the raw rupee field otherwise.
    const appliedOtherCharges = otherChargesRs ?? otherCharges;
    const appliedDiscount = discountRs ?? discount;
    // Older callers may not pass itemsSubtotal — derive it so the breakdown still adds up.
    const subtotal = itemsSubtotal ?? (totalAmount - appliedOtherCharges + appliedDiscount);

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr",
                gap: "16px",
            }}
        >
            {/* ── Left: Remarks + Actions ───────────────── */}
            <div className="card animate-fade-in" style={{ animationDelay: "300ms" }}>
                <div className="card-header">
                    <h3>Remarks & Actions</h3>
                </div>
                <div className="card-body">
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Remarks / Notes</label>
                        <textarea
                            className="form-input"
                            style={{ height: "80px", resize: "vertical", paddingTop: "8px" }}
                            placeholder="Add any notes or remarks for this invoice..."
                            value={remarks}
                            onChange={(e) => onRemarksChange(e.target.value)}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                        }}
                    >
                        <button className="btn btn-ghost" onClick={onSaveDraft}
                            title="Save as an editable draft — you can re-open and change it later (not final)">
                            <Save size={16} />
                            Save Draft
                        </button>
                        <button className="btn btn-primary" onClick={onFinalize}
                            title="Finalize and lock this invoice as a completed record">
                            <CheckCircle size={16} />
                            Finalize Invoice
                        </button>
                        <button className="btn btn-secondary" onClick={onGeneratePdf}
                            title="Save the invoice and open a printable PDF">
                            <FileDown size={16} />
                            Save &amp; Print
                        </button>
                        <button
                            className="btn btn-ghost"
                            onClick={onSendWhatsApp}
                            style={{ color: "#25D366" }}
                        >
                            <MessageCircle size={16} />
                            WhatsApp
                        </button>
                        {onClearNew && (
                            <button className="btn btn-outline" onClick={onClearNew}>
                                Clear / New
                            </button>
                        )}
                        {onPayment && (
                            <button className="btn btn-secondary" onClick={onPayment}>
                                Payment
                            </button>
                        )}
                        {onExit && (
                            <button className="btn btn-outline" onClick={onExit} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                                Exit
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Right: Summary Numbers ────────────────── */}
            <div className="card animate-fade-in" style={{ animationDelay: "350ms" }}>
                <div className="card-header">
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Calculator size={16} />
                        Invoice Summary
                    </h3>
                </div>
                <div className="card-body">
                    {/* Total Gold Weight */}
                    <div className="summary-row">
                        <span className="label">Total Gold Weight</span>
                        <span className="value">{formatWeight(totalGoldWeight)} g</span>
                    </div>

                    {/* Pure Gold Weight (PURCHASE) — client wants plain grams,
                        not Tola/Masha/Ratti, directly under Total Gold Weight. */}
                    {transactionType === "PURCHASE" ? (
                        <div className="summary-row">
                            <span className="label">Pure Gold Weight</span>
                            <span className="value" style={{ color: "var(--maroon)" }}>
                                {formatWeight(totalPureGoldWeight)} g
                            </span>
                        </div>
                    ) : (
                        /* SALE keeps the traditional Pakka/Kacha Tola breakdown */
                        totalGoldWeight > 0 && (
                            <div style={{
                                display: "grid", gridTemplateColumns: "1fr 1fr",
                                gap: "6px", margin: "2px 0 6px",
                                padding: "6px 8px",
                                background: "rgba(201,168,76,0.08)",
                                border: "1px solid var(--gold-light)",
                                borderRadius: "6px",
                            }}>
                                <div>
                                    <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pakka Tola</div>
                                    <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: 1 }}>÷ 12.150 g</div>
                                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.9rem", color: "var(--maroon)" }}>
                                        {gramsToPakkaTola(totalGoldWeight).toFixed(4)} <span style={{ fontSize: "0.65rem", fontWeight: 500 }}>tola</span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--gold-dark)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Kacha Tola</div>
                                    <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: 1 }}>÷ 11.664 g</div>
                                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                                        {gramsToKachaTola(totalGoldWeight).toFixed(4)} <span style={{ fontSize: "0.65rem", fontWeight: 500 }}>tola</span>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* Items Subtotal — the plain sum of the line items, before
                        charges/discount. Shown so the Total Amount arithmetic below
                        is visible to the user (client #15/#16). */}
                    <div className="summary-row">
                        <span className="label">Items Subtotal</span>
                        <span className="value">
                            {sym} {formatCurrency(subtotal)}
                        </span>
                    </div>

                    {/* Other Charges */}
                    {renderAmountOrWeightField({
                        label: "Other Charges",
                        transactionType,
                        currency,
                        mode: otherChargesMode,
                        rupees: otherCharges,
                        weight: otherChargesWeight,
                        goldRatePerGram,
                        onRupeesChange: onOtherChargesChange,
                        onModeChange: onOtherChargesModeChange,
                        onWeightChange: onOtherChargesWeightChange,
                    })}

                    {/* Discount */}
                    {renderAmountOrWeightField({
                        label: "Discount",
                        transactionType,
                        currency,
                        mode: discountMode,
                        rupees: discount,
                        weight: discountWeight,
                        goldRatePerGram,
                        onRupeesChange: onDiscountChange,
                        onModeChange: onDiscountModeChange,
                        onWeightChange: onDiscountWeightChange,
                    })}

                    {/* Applied charge / discount echo — makes the arithmetic explicit,
                        especially when the value was entered in Gold g. */}
                    {appliedOtherCharges > 0 && (
                        <div className="summary-row" style={{ paddingTop: 3, paddingBottom: 3 }}>
                            <span className="label" style={{ fontSize: "0.72rem" }}>
                                + Other Charges applied
                            </span>
                            <span className="value" style={{ fontSize: "0.75rem" }}>
                                + {sym} {formatCurrency(appliedOtherCharges)}
                            </span>
                        </div>
                    )}
                    {appliedDiscount > 0 && (
                        <div className="summary-row" style={{ paddingTop: 3, paddingBottom: 3 }}>
                            <span className="label" style={{ fontSize: "0.72rem", color: "var(--success)" }}>
                                − Discount applied
                            </span>
                            <span className="value" style={{ fontSize: "0.75rem", color: "var(--success)" }}>
                                - {sym} {formatCurrency(appliedDiscount)}
                            </span>
                        </div>
                    )}

                    {/* Total Amount = Items Subtotal + Other Charges − Discount */}
                    <div className="summary-row total">
                        <span className="label">Total Amount</span>
                        <span className="value">
                            {sym} {formatCurrency(totalAmount)}
                        </span>
                    </div>

                    {/* Old Gold Value */}
                    {customerGoldValue > 0 && (
                        <div className="summary-row">
                            <span className="label" style={{ color: "var(--success)" }}>
                                Customer Gold Value
                            </span>
                            <span
                                className="value"
                                style={{ color: "var(--success)" }}
                            >
                                - {sym} {formatCurrency(customerGoldValue)}
                            </span>
                        </div>
                    )}

                    {/* Pasa Deduction */}
                    {pasaDeduction > 0 && (
                        <div className="summary-row">
                            <span className="label" style={{ color: "var(--warning)" }}>
                                Pasa Deduction
                            </span>
                            <span
                                className="value"
                                style={{ color: "var(--warning)" }}
                            >
                                - {sym} {formatCurrency(pasaDeduction)}
                            </span>
                        </div>
                    )}

                    {/* Cash Received */}
                    <div className="summary-row">
                        <span className="label">Cash Received</span>
                        <input
                            className="form-input"
                            type="number"
                            step="0.01"
                            min={0}
                            value={cashReceived}
                            onChange={(e) => onCashReceivedChange(Math.max(0, Number(e.target.value)))}
                            style={{
                                width: "130px",
                                height: "30px",
                                fontSize: "0.75rem",
                                textAlign: "right",
                            }}
                        />
                    </div>

                    {/* Gold Received */}
                    <div className="summary-row">
                        <span className="label">Gold Received</span>
                        <input
                            className="form-input"
                            type="number"
                            step="0.001"
                            min={0}
                            value={goldReceived}
                            onChange={(e) => onGoldReceivedChange(Math.max(0, Number(e.target.value)))}
                            style={{
                                width: "130px",
                                height: "30px",
                                fontSize: "0.75rem",
                                textAlign: "right",
                            }}
                        />
                    </div>

                    {/* Balance — hidden for purchase invoices */}
                    {transactionType === "SALE" && (
                        <div className="summary-row total balance">
                            <span className="label">Balance Due</span>
                            <span
                                className={`value ${balance <= 0 ? "paid" : ""}`}
                                style={{ fontSize: "1.25rem" }}
                            >
                                {sym} {formatCurrency(Math.abs(balance))}
                                {balance <= 0 && balance !== 0 && (
                                    <span style={{ fontSize: "0.6875rem", marginLeft: "4px", fontWeight: 400 }}>
                                        (overpaid)
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
