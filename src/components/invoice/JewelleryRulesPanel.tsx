/**
 * ============================================================================
 * JEWELLERY RULES PANEL + CUSTOMER GOLD SECTION
 * ============================================================================
 *
 * Side panel that shows:
 * 1. Polish & Labour rates (editable, basis: Per Tola / Pasa / Katti Kat)
 * 2. Estimated / Adjusted / Gross gold weights (read-only, auto-calculated)
 * 3. Customer Old Gold input (weight + carat → auto purity conversion)
 * 4. Pasa Rate input (percentage deduction)
 *
 * All values auto-recalculate when inputs change.
 * ============================================================================
 */

"use client";

import { Scale, Gem, ArrowDown, Percent } from "lucide-react";
import { formatCurrency, formatWeight } from "@/lib/utils";

import { type TransactionType } from "@/types";
import { type LabourBasis, type KaatBasis, type PolishLabourBasis, calcPasaAdjustedWeight } from "@/lib/calculationEngine";

const POLISH_BASIS_OPTIONS: PolishLabourBasis[] = ["Per Tola", "Pasa", "Ratti Cut"];
const LABOUR_BASIS_OPTIONS: LabourBasis[] = ["Per Tola", "Per Gram", "Fixed"];
const KAAT_BASIS_OPTIONS: KaatBasis[] = ["Direct Weight", "Ratti Kaat"];

interface JewelleryRulesPanelProps {
    transactionType?: TransactionType;

    // ── Polish & Labour & Kaat ──
    polishBasis: string;
    polishRate: number;
    labourBasis: string;
    labourRate: number;
    kaatBasis?: string;
    kaatRate?: number;

    // ── Gold Weights (auto-calculated, read-only) ──
    estimatedGoldWeight: number;
    kaatWeight?: number;
    adjustedGoldWeight: number;
    estimatedGrossWeight: number;

    // ── Customer Old Gold ──
    customerGoldWeight: number;
    customerGoldCarat: number;
    customerGoldValue: number;

    // ── Pasa Rate ──
    pasaRate: number;
    pasaDeduction: number;

    // ── Gold Rate for display ──
    goldRate: number;

    // ── Callbacks ──
    onPolishBasisChange: (value: PolishLabourBasis) => void;
    onPolishRateChange: (value: number) => void;
    onLabourBasisChange: (value: LabourBasis) => void;
    onLabourRateChange: (value: number) => void;
    onKaatBasisChange?: (value: KaatBasis) => void;
    onKaatRateChange?: (value: number) => void;
    onGoldRateChange: (value: number) => void;
    onGoldCaratChange: (value: number) => void;
    onCustomerGoldWeightChange: (value: number) => void;
    onCustomerGoldCaratChange: (value: number) => void;
    onPasaRateChange: (value: number) => void;
}

export default function JewelleryRulesPanel({
    transactionType = "SALE",
    polishBasis,
    polishRate,
    labourBasis,
    labourRate,
    kaatBasis,
    kaatRate,
    estimatedGoldWeight,
    kaatWeight = 0,
    adjustedGoldWeight,
    estimatedGrossWeight,
    customerGoldWeight,
    customerGoldCarat,
    customerGoldValue,
    pasaRate,
    pasaDeduction,
    goldRate,
    onPolishBasisChange,
    onPolishRateChange,
    onLabourBasisChange,
    onLabourRateChange,
    onKaatBasisChange,
    onKaatRateChange,
    onGoldRateChange,
    onGoldCaratChange,
    onCustomerGoldWeightChange,
    onCustomerGoldCaratChange,
    onPasaRateChange,
}: JewelleryRulesPanelProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* ── Gold Rate Card ────────────────────────── */}
            <div className="card animate-fade-in" style={{ animationDelay: "150ms" }}>
                <div className="card-header" style={{ padding: "10px 16px" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Scale size={14} />
                        Gold Rate & Carat
                    </h3>
                </div>
                <div className="card-body" style={{ padding: "12px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div className="form-group">
                            <label className="form-label">Gold Rate (per tola)</label>
                            <input
                                className="form-input"
                                type="number"
                                value={goldRate}
                                onChange={(e) => onGoldRateChange(Number(e.target.value))}
                                style={{ fontWeight: 700, color: "var(--gold-dark)", height: "32px", fontSize: "0.8125rem" }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Default Carat</label>
                            <input
                                className="form-input"
                                type="number"
                                min={1}
                                max={24}
                                value={24}
                                onChange={(e) => onGoldCaratChange(Number(e.target.value))}
                                style={{ height: "32px", fontSize: "0.8125rem" }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Jewellery Rules Card ──────────────────── */}
            <div className="card animate-fade-in" style={{ animationDelay: "200ms" }}>
                <div className="card-header" style={{ padding: "10px 16px" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Gem size={14} />
                        Jewellery Rules
                    </h3>
                </div>
                <div className="card-body" style={{ padding: "12px 16px" }}>

                    {/* Rules switch based on Sale / Purchase */}
                    {transactionType === "SALE" ? (
                        /* -- POLISH (SALE ONLY) -- */
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "50px 1fr 1fr",
                                gap: "6px",
                                alignItems: "end",
                                marginBottom: "8px",
                            }}
                        >
                            <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", paddingBottom: "8px" }}>
                                Polish
                            </div>
                            <div className="form-group">
                                <label className="form-label">Basis</label>
                                <select
                                    className="form-select"
                                    value={polishBasis}
                                    onChange={(e) => onPolishBasisChange(e.target.value as PolishLabourBasis)}
                                    style={{ height: "32px", fontSize: "0.75rem" }}
                                >
                                    {POLISH_BASIS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rate @</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step={0.01}
                                    value={polishRate}
                                    onChange={(e) => onPolishRateChange(Number(e.target.value))}
                                    style={{ height: "32px", fontSize: "0.8125rem" }}
                                />
                            </div>
                        </div>
                    ) : (
                        /* -- KAAT (PURCHASE ONLY) -- */
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "50px 1fr 1fr",
                                gap: "6px",
                                alignItems: "end",
                                marginBottom: "8px",
                            }}
                        >
                            <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", paddingBottom: "8px" }}>
                                Kaat On
                            </div>
                            <div className="form-group">
                                <label className="form-label">Basis</label>
                                <select
                                    className="form-select"
                                    value={kaatBasis}
                                    onChange={(e) => onKaatBasisChange && onKaatBasisChange(e.target.value as KaatBasis)}
                                    style={{ height: "32px", fontSize: "0.75rem" }}
                                >
                                    {KAAT_BASIS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rate @</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="any"
                                    value={kaatRate}
                                    onChange={(e) => onKaatRateChange && onKaatRateChange(Number(e.target.value))}
                                    style={{ height: "32px", fontSize: "0.8125rem" }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Labour */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "50px 1fr 1fr",
                            gap: "6px",
                            alignItems: "end",
                            marginBottom: "10px",
                        }}
                    >
                        <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", paddingBottom: "8px" }}>
                            Labour
                        </div>
                        <div className="form-group">
                            <label className="form-label">Basis</label>
                            <select
                                className="form-select"
                                value={labourBasis}
                                onChange={(e) => onLabourBasisChange(e.target.value as LabourBasis)}
                                style={{ height: "32px", fontSize: "0.75rem" }}
                            >
                                {LABOUR_BASIS_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rate @</label>
                            <input
                                className="form-input"
                                type="number"
                                step={0.01}
                                value={labourRate}
                                onChange={(e) => onLabourRateChange(Number(e.target.value))}
                                style={{ height: "32px", fontSize: "0.8125rem" }}
                            />
                        </div>
                    </div>

                    {/* Pasa */}
                    {transactionType === "PURCHASE" && (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "50px 1fr 1fr",
                                gap: "6px",
                                alignItems: "end",
                                marginBottom: "10px",
                            }}
                        >
                            <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", paddingBottom: "8px" }}>
                                Pasa
                            </div>
                            <div className="form-group">
                                <label className="form-label">Deduct (of 96)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={0}
                                    max={96}
                                    step={0.5}
                                    value={pasaRate}
                                    onChange={(e) => onPasaRateChange(Number(e.target.value))}
                                    style={{ height: "32px", fontSize: "0.8125rem" }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Value</label>
                                <div
                                    style={{
                                        height: "32px",
                                        background: "var(--warning-bg)",
                                        borderRadius: "var(--radius-sm)",
                                        padding: "0 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        fontFamily: "var(--font-mono)",
                                        fontWeight: 700,
                                        color: "var(--warning)",
                                        fontSize: "0.8125rem",
                                    }}
                                >
                                    Rs. {pasaDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gold Weight Summary */}
                    <div
                        style={{
                            background: "var(--cream)",
                            borderRadius: "var(--radius-sm)",
                            padding: "8px 10px",
                            border: "1px solid var(--gold-light)",
                        }}
                    >
                        <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--gold-dark)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Gold Weight Summary
                        </div>
                        <div className="summary-row" style={{ padding: "3px 0" }}>
                            <span className="label">Est. Gold Wt</span>
                            <span className="value">{formatWeight(estimatedGoldWeight)} g</span>
                        </div>
                        {transactionType === "PURCHASE" && (
                            <div className="summary-row" style={{ padding: "3px 0" }}>
                                <span className="label">Kaat Wt</span>
                                <span className="value">{formatWeight(kaatWeight)} g</span>
                            </div>
                        )}
                        <div className="summary-row" style={{ padding: "3px 0" }}>
                            <span className="label">{transactionType === "PURCHASE" ? "Pure Wt" : "Adj. Gold Wt"}</span>
                            <span className="value" style={{ color: "var(--maroon)", fontWeight: 700 }}>
                                {formatWeight(
                                    transactionType === "PURCHASE" && pasaRate > 0
                                        ? calcPasaAdjustedWeight(adjustedGoldWeight, pasaRate)
                                        : adjustedGoldWeight
                                )} g
                            </span>
                        </div>
                        {transactionType === "PURCHASE" && pasaRate > 0 && (
                            <div className="summary-row" style={{ padding: "3px 0", borderBottom: "none" }}>
                                <span className="label" style={{ color: "var(--warning)", fontSize: "0.625rem" }}>Pasa Deduct</span>
                                <span className="value" style={{ color: "var(--warning)", fontWeight: 600, fontSize: "0.7rem" }}>
                                    -{formatWeight(adjustedGoldWeight - calcPasaAdjustedWeight(adjustedGoldWeight, pasaRate))} g
                                </span>
                            </div>
                        )}
                        <div className="summary-row" style={{ padding: "3px 0", borderBottom: "none" }}>
                            <span className="label">Est. Gross Wt</span>
                            <span className="value">{formatWeight(estimatedGrossWeight)} g</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Customer Old Gold Card ────────────────── */}
            {transactionType === "SALE" && (
                <div className="card animate-fade-in" style={{ animationDelay: "250ms" }}>
                    <div className="card-header" style={{ padding: "10px 16px" }}>
                        <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ArrowDown size={14} />
                            Customer Old Gold
                        </h3>
                    </div>
                    <div className="card-body" style={{ padding: "12px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                            <div className="form-group">
                                <label className="form-label">Weight (g)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={0}
                                    step={0.001}
                                    value={customerGoldWeight}
                                    onChange={(e) => onCustomerGoldWeightChange(Number(e.target.value))}
                                    style={{ height: "32px", fontSize: "0.8125rem" }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Carat</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={customerGoldCarat}
                                    onChange={(e) => onCustomerGoldCaratChange(Number(e.target.value))}
                                    style={{ height: "32px", fontSize: "0.8125rem" }}
                                />
                            </div>
                        </div>
                        <div
                            style={{
                                background: "var(--success-bg)",
                                borderRadius: "var(--radius-sm)",
                                padding: "6px 10px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--success)" }}>
                                Old Gold Value
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--success)", fontSize: "0.8125rem" }}>
                                Rs. {formatCurrency(customerGoldValue)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
