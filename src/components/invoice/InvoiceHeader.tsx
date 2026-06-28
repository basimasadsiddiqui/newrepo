/**
 * ============================================================================
 * INVOICE HEADER COMPONENT
 * ============================================================================
 *
 * Top section of the invoice form with:
 * 1. Sale/Purchase toggle (pill segmented control)
 * 2. Invoice details (order#, date, receipt, rate type, due date, status)
 * 3. Party search with balance display
 *
 * Party = unified Customer + Supplier concept.
 * ============================================================================
 */

"use client";

import { useState, useRef, useEffect } from "react";
import {
    FileText,
    Search,
    User,
    Phone,
    X,
    ShoppingCart,
    Package,
    ShieldAlert,
    ShieldCheck
} from "lucide-react";
import type {
    PartySearchResult,
    PartyRiskProfile,
    RateType,
    TransactionType,
} from "@/types";

interface InvoiceHeaderProps {
    // ── Invoice fields ──
    orderNumber: number;
    date: string;
    receiptNo: string;
    rateType: RateType;
    dueDate: string;
    status: string;
    transactionType: TransactionType;

    // ── Party ──
    partyId: string;
    partyName: string;
    partyMobile: string;
    partyBalance: string;
    partyGoldBalance?: string; // Newly added
    partyResults: PartySearchResult[];
    showPartyDropdown: boolean;

    // ── Callbacks ──
    onReceiptNoChange: (value: string) => void;
    onRateTypeChange: (value: RateType) => void;
    onDueDateChange: (value: string) => void;
    onDateChange: (value: string) => void;
    onTransactionTypeChange: (value: TransactionType) => void;
    onPartySearchChange: (query: string) => void;
    onPartyMobileChange: (mobile: string) => void;
    onPartySelect: (party: PartySearchResult) => void;
    onCancelOrder: () => void;
    partyRisk?: PartyRiskProfile | null;

    // ── Purchase Specific Fields ──
    supplierInvoiceNo?: string;
    onSupplierInvoiceNoChange?: (value: string) => void;
    currency?: string;
    onCurrencyChange?: (value: string) => void;
    currencyRate?: string;
    onCurrencyRateChange?: (value: string) => void;
    intlOunceRate?: string;
    onIntlOunceRateChange?: (value: string) => void;
    isCancelled?: boolean;
    onIsCancelledChange?: (checked: boolean) => void;
    loadingRisk?: boolean;
    hideToggle?: boolean;
}

export default function InvoiceHeader({
    orderNumber,
    date,
    receiptNo,
    rateType,
    dueDate,
    status,
    transactionType,
    partyId,
    partyName,
    partyMobile,
    partyBalance,
    partyGoldBalance = "0",
    partyResults,
    showPartyDropdown,
    onReceiptNoChange,
    onRateTypeChange,
    onDueDateChange,
    onDateChange,
    onTransactionTypeChange,
    onPartySearchChange,
    onPartyMobileChange,
    onPartySelect,
    onCancelOrder,
    partyRisk,
    loadingRisk,
    hideToggle = false,
    supplierInvoiceNo = "",
    onSupplierInvoiceNoChange,
    currency = "PKR",
    onCurrencyChange,
    currencyRate = "1",
    onCurrencyRateChange,
    intlOunceRate = "0",
    onIntlOunceRateChange,
    isCancelled = false,
    onIsCancelledChange,
}: InvoiceHeaderProps) {
    const searchRef = useRef<HTMLDivElement>(null);
    const [localDropdown, setLocalDropdown] = useState(showPartyDropdown);

    useEffect(() => {
        setLocalDropdown(showPartyDropdown);
    }, [showPartyDropdown]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setLocalDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isSale = transactionType === "SALE";
    const riskLateRatio = partyRisk?.metrics?.lateRatio ?? 0;
    return (
        <div className="card animate-fade-in" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ padding: "10px 16px" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={16} />
                    Invoice Details
                </h3>

                {/* ── Sale / Purchase Toggle ── */}
                {!hideToggle && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "var(--cream)",
                            borderRadius: "20px",
                            padding: "3px",
                            border: "1px solid var(--border)",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => onTransactionTypeChange("SALE")}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 14px",
                                borderRadius: "16px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                transition: "all 0.2s ease",
                                background: isSale ? "var(--maroon)" : "transparent",
                                color: isSale ? "white" : "var(--text-muted)",
                            }}
                        >
                            <ShoppingCart size={12} />
                            Sale
                        </button>
                        <button
                            type="button"
                            onClick={() => onTransactionTypeChange("PURCHASE")}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 14px",
                                borderRadius: "16px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                transition: "all 0.2s ease",
                                background: !isSale ? "#1a6b3c" : "transparent",
                                color: !isSale ? "white" : "var(--text-muted)",
                            }}
                        >
                            <Package size={12} />
                            Purchase
                        </button>
                    </div>
                )}

                {/* Status Badge */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    {!isSale && onIsCancelledChange && (
                        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600, color: "var(--danger)", cursor: "pointer", marginRight: "8px" }}>
                            <input
                                type="checkbox"
                                checked={isCancelled || status === "CANCELLED"}
                                onChange={(e) => onIsCancelledChange(e.target.checked)}
                                style={{ margin: 0 }}
                            />
                            Cancel Invoice
                        </label>
                    )}
                    <span className={`badge badge-${status.toLowerCase()}`}>
                        {status}
                    </span>
                    {status === "DRAFT" && isSale && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={onCancelOrder}
                            style={{ color: "var(--danger)", fontSize: "0.7rem", padding: "0 6px" }}
                        >
                            <X size={12} /> Cancel
                        </button>
                    )}
                </div>
            </div>

            <div className="card-body" style={{ padding: "12px 16px" }}>
                {/* Invoice Fields Row */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: "10px",
                        marginBottom: "10px",
                    }}
                >
                    {/* Order Number */}
                    {!isSale ? null : (
                        <div className="form-group">
                            <label className="form-label">Order #</label>
                            <input
                                className="form-input"
                                value={orderNumber}
                                readOnly
                                style={{
                                    background: "var(--cream)",
                                    fontWeight: 700,
                                    color: "var(--maroon)",
                                    height: "32px",
                                }}
                            />
                        </div>
                    )}

                    {/* Date */}
                    <div className="form-group">
                        <label className="form-label">
                            {!isSale ? "Purchase Date" : "Date"}
                            {!isSale && <span style={{ color: "var(--danger)" }}> *</span>}
                        </label>
                        <input
                            className="form-input"
                            type="date"
                            value={date}
                            onChange={(e) => onDateChange(e.target.value)}
                            style={{ height: "32px" }}
                            required={!isSale}
                        />
                    </div>

                    {/* Receipt No — auto-generated on load, manually overridable */}
                    <div className="form-group">
                        <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Receipt No</span>
                            {receiptNo && (
                                <span style={{
                                    fontSize: "0.55rem",
                                    background: "rgba(201,168,76,0.15)",
                                    color: "var(--gold-dark)",
                                    border: "1px solid rgba(201,168,76,0.3)",
                                    padding: "1px 5px",
                                    borderRadius: 99,
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                }}>Auto</span>
                            )}
                        </label>
                        <input
                            className="form-input"
                            value={receiptNo}
                            onChange={(e) => onReceiptNoChange(e.target.value)}
                            placeholder="Generating…"
                            style={{
                                height: "32px",
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color: "var(--gold-dark)",
                                letterSpacing: "0.06em",
                            }}
                        />
                    </div>

                    {/* Rate Type */}
                    <div className="form-group">
                        <label className="form-label">Rate Type</label>
                        <select
                            className="form-select"
                            value={rateType}
                            onChange={(e) => onRateTypeChange(e.target.value as RateType)}
                            style={{ height: "32px" }}
                        >
                            <option value="FIXED">Fixed</option>
                            <option value="UNFIXED">Unfixed</option>
                        </select>
                    </div>

                    {/* Due Date */}
                    {!isSale ? null : (
                        <div className="form-group">
                            <label className="form-label">Due Date</label>
                            <input
                                className="form-input"
                                type="date"
                                value={dueDate}
                                onChange={(e) => onDueDateChange(e.target.value)}
                                style={{ height: "32px" }}
                            />
                        </div>
                    )}

                    {/* Supplier Inv No removed — the supplier's receipt is uploaded as a photo instead */}

                    {/* Currency - Purchase Only */}
                    {!isSale && onCurrencyChange && (
                        <div className="form-group">
                            <label className="form-label">Currency</label>
                            <select
                                className="form-select"
                                value={currency}
                                onChange={(e) => onCurrencyChange(e.target.value)}
                                style={{ height: "32px" }}
                            >
                                <option value="PKR">PKR</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="AED">AED</option>
                            </select>
                        </div>
                    )}

                    {/* Currency Rate - Purchase Only */}
                    {!isSale && onCurrencyRateChange && currency !== "PKR" && (
                        <div className="form-group">
                            <label className="form-label">Conv. Rate</label>
                            <input
                                className="form-input"
                                type="number"
                                step="any"
                                value={currencyRate}
                                onChange={(e) => onCurrencyRateChange(e.target.value)}
                                style={{ height: "32px" }}
                            />
                        </div>
                    )}

                    {/* Intl Ounce Rate - Purchase Only */}
                    {!isSale && onIntlOunceRateChange && (
                        <div className="form-group">
                            <label className="form-label">Intl Ounce Rate</label>
                            <input
                                className="form-input"
                                type="number"
                                step="any"
                                value={intlOunceRate}
                                onChange={(e) => onIntlOunceRateChange(e.target.value)}
                                style={{ height: "32px" }}
                                placeholder="$ / oz"
                            />
                        </div>
                    )}
                </div>

                {/* Party Search Row */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1.5fr 1fr",
                        gap: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid var(--border)",
                    }}
                >
                    {/* Party Name / Search (Combined) */}
                    <div className="form-group" ref={searchRef} style={{ position: "relative" }}>
                        <label className="form-label">
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                {isSale ? <User size={10} /> : <ShoppingCart size={10} />}
                                {isSale ? "Customer Name / Search" : "Supplier Name / Search"}
                            </span>
                        </label>
                        <div style={{ position: "relative" }}>
                            <Search
                                size={14}
                                style={{
                                    position: "absolute",
                                    left: "8px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--text-muted)",
                                }}
                            />
                            <input
                                className="form-input"
                                placeholder="Search or type new name..."
                                value={partyName} // Now controlled by partyName directly
                                onChange={(e) => {
                                    onPartySearchChange(e.target.value);
                                    setLocalDropdown(true);
                                }}
                                onFocus={() => {
                                    if (partyName.length > 0) setLocalDropdown(true);
                                }}
                                style={{
                                    paddingLeft: "28px",
                                    paddingRight: partyId ? "28px" : "8px", // Space for clear button
                                    height: "32px",
                                    fontWeight: 600,
                                    background: partyId ? "var(--cream)" : "white",
                                }}
                            />
                            {/* Clear Button (only if party is selected) */}
                            {partyId && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPartySelect({ id: "", name: "", mobile: "", type: "Customer", balance: "0" }); // Clear selection
                                    }}
                                    style={{
                                        position: "absolute",
                                        right: "8px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--text-muted)",
                                        padding: 0,
                                        display: "flex",
                                    }}
                                    title="Clear selection"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Results */}
                        {localDropdown && partyResults.length > 0 && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    background: "white",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--radius-sm)",
                                    boxShadow: "var(--shadow-lg)",
                                    zIndex: 50,
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                }}
                            >
                                {partyResults.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            onPartySelect(p);
                                            setLocalDropdown(false);
                                        }}
                                        style={{
                                            padding: "8px 12px",
                                            cursor: "pointer",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            borderBottom: "1px solid var(--border-light)",
                                            transition: "background var(--transition-fast)",
                                            fontSize: "0.8125rem",
                                        }}
                                        onMouseEnter={(e) =>
                                            ((e.target as HTMLElement).style.background = "var(--cream)")
                                        }
                                        onMouseLeave={(e) =>
                                            ((e.target as HTMLElement).style.background = "transparent")
                                        }
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600 }}>
                                                {p.name}
                                                <span
                                                    style={{
                                                        marginLeft: "6px",
                                                        fontSize: "0.625rem",
                                                        padding: "1px 5px",
                                                        borderRadius: "8px",
                                                        background:
                                                            p.type === "Customer"
                                                                ? "var(--gold-light)"
                                                                : p.type === "Supplier"
                                                                    ? "#e0f0ff"
                                                                    : "var(--cream)",
                                                        color:
                                                            p.type === "Customer"
                                                                ? "var(--gold-dark)"
                                                                : p.type === "Supplier"
                                                                    ? "#1a6b3c"
                                                                    : "var(--text-muted)",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {p.type}
                                                </span>
                                            </div>
                                            {p.mobile && (
                                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                                    {p.mobile}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily: "var(--font-mono)",
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                                color:
                                                    Number(p.balance) > 0
                                                        ? "var(--danger)"
                                                        : Number(p.balance) < 0
                                                            ? "var(--success)"
                                                            : "var(--text-muted)",
                                            }}
                                        >
                                            Rs. {Number(p.balance).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* --- NEW: Risk Warning Badge Displayed Below the Input --- */}
                        {loadingRisk && (
                            <div className="absolute top-[110%] left-0 w-full text-xs text-muted-foreground animate-pulse mt-1">
                                Analyzing credit risk...
                            </div>
                        )}
                        {partyRisk && !loadingRisk && (
                            <div className={`absolute top-[110%] left-0 w-full mt-1 flex items-center gap-2 px-2 py-1 rounded-md border text-[10px] font-medium ${partyRisk.level === "HIGH" ? "bg-red-50 text-red-700 border-red-200" :
                                partyRisk.level === "MEDIUM" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}>
                                {partyRisk.level === "HIGH" ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                                <span className="uppercase">Risk: {partyRisk.level}</span>
                                <span className="text-muted-foreground ml-auto">
                                    Score: {partyRisk.score}/10 | Late: {(riskLateRatio * 100).toFixed(0)}%
                                </span>
                            </div>
                        )}

                    </div>

                    {/* Mobile (Editable if no Party ID) */}
                    <div className="form-group">
                        <label className="form-label">
                            <Phone size={10} style={{ marginRight: "4px" }} />
                            Mobile
                        </label>
                        <input
                            className="form-input"
                            value={partyMobile}
                            onChange={(e) => onPartyMobileChange(e.target.value)}
                            readOnly={!!partyId} // Only editable if Walk-in (no partyId)
                            style={{
                                background: partyId ? "var(--cream)" : "white",
                                height: "32px",
                                cursor: partyId ? "default" : "text",
                            }}
                            placeholder={partyId ? "—" : "0300-1234567"}
                            title={partyId ? "Clear party selection to edit mobile" : "Enter mobile number"}
                        />
                    </div>

                    {/* Balance */}
                    <div className="form-group">
                        <label className="form-label">Balance Amount</label>
                        <input
                            className="form-input"
                            value={
                                partyId
                                    ? `Rs. ${Number(partyBalance).toLocaleString()}`
                                    : "—"
                            }
                            readOnly
                            style={{
                                background: "var(--cream)",
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color:
                                    Number(partyBalance) > 0
                                        ? "var(--danger)"
                                        : Number(partyBalance) < 0
                                            ? "var(--success)"
                                            : "var(--text-primary)",
                                height: "32px",
                            }}
                        />
                    </div>

                    {/* Gold Balance */}
                    <div className="form-group">
                        <label className="form-label">Balance Gold</label>
                        <input
                            className="form-input"
                            value={
                                partyId
                                    ? `${Number(partyGoldBalance).toFixed(3)}g`
                                    : "—"
                            }
                            readOnly
                            style={{
                                background: "var(--cream)",
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color: "var(--gold-dark)",
                                height: "32px",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div >
    );
}
