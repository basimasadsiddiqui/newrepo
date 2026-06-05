/**
 * ============================================================================
 * INVOICE SUMMARY COMPONENT
 * ============================================================================
 *
 * Bottom section showing:
 * - Total Gold Weight
 * - Total Amount
 * - Other Charges (editable)
 * - Discount (editable)
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

interface InvoiceSummaryProps {
    transactionType?: "SALE" | "PURCHASE";
    /** All monetary and weight totals */
    totalGoldWeight: number;
    totalAmount: number;
    otherCharges: number;
    discount: number;
    customerGoldValue: number;
    pasaDeduction: number;
    cashReceived: number;
    goldReceived: number;
    balance: number;
    remarks: string;

    // ── Callbacks ──
    onOtherChargesChange: (value: number) => void;
    onDiscountChange: (value: number) => void;
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
    totalGoldWeight,
    totalAmount,
    otherCharges,
    discount,
    customerGoldValue,
    pasaDeduction,
    cashReceived,
    goldReceived,
    balance,
    remarks,
    onOtherChargesChange,
    onDiscountChange,
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
                        <button className="btn btn-ghost" onClick={onSaveDraft}>
                            <Save size={16} />
                            Save Draft
                        </button>
                        <button className="btn btn-primary" onClick={onFinalize}>
                            <CheckCircle size={16} />
                            Finalize Invoice
                        </button>
                        <button className="btn btn-secondary" onClick={onGeneratePdf}>
                            <FileDown size={16} />
                            Generate PDF
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

                    {/* Tola conversions */}
                    {totalGoldWeight > 0 && (
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
                    )}

                    {/* Total Amount */}
                    <div className="summary-row">
                        <span className="label">Total Amount</span>
                        <span className="value" style={{ color: "var(--maroon)" }}>
                            Rs. {formatCurrency(totalAmount)}
                        </span>
                    </div>

                    {/* Other Charges */}
                    <div className="summary-row">
                        <span className="label">Other Charges</span>
                        <input
                            className="form-input"
                            type="number"
                            step="0.01"
                            value={otherCharges}
                            onChange={(e) => onOtherChargesChange(Number(e.target.value))}
                            style={{
                                width: "130px",
                                height: "30px",
                                fontSize: "0.75rem",
                                textAlign: "right",
                            }}
                        />
                    </div>

                    {/* Discount */}
                    <div className="summary-row">
                        <span className="label">Discount</span>
                        <input
                            className="form-input"
                            type="number"
                            step="0.01"
                            value={discount}
                            onChange={(e) => onDiscountChange(Number(e.target.value))}
                            style={{
                                width: "130px",
                                height: "30px",
                                fontSize: "0.75rem",
                                textAlign: "right",
                            }}
                        />
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
                                - Rs. {formatCurrency(customerGoldValue)}
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
                                - Rs. {formatCurrency(pasaDeduction)}
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
                            value={cashReceived}
                            onChange={(e) => onCashReceivedChange(Number(e.target.value))}
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
                            value={goldReceived}
                            onChange={(e) => onGoldReceivedChange(Number(e.target.value))}
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
                                Rs. {formatCurrency(Math.abs(balance))}
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
