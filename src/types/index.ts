/**
 * ============================================================================
 * TYPE DEFINITIONS – Akhtar Jewellers Invoice Module
 * ============================================================================
 *
 * Central type file for the entire invoice module.
 * All types are plain interfaces — easy to read, easy to extend.
 *
 * CONVENTIONS:
 * - All weight values are in GRAMS (consistent unit)
 * - All amounts are in PKR (Pakistani Rupee)
 * - We use `string` for Decimal values from Prisma (serialized as strings)
 * - Frontend forms use `number` and convert to string for API calls
 * ============================================================================
 */

// ─── Enums (mirroring Prisma enums) ────────────────────────────

export type UserRole = "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";
export type InvoiceStatus = "DRAFT" | "FINALIZED" | "CANCELLED";
export type RateType = "FIXED" | "UNFIXED";
export type LedgerType = "DEBIT" | "CREDIT";
export type InventoryTxType = "ADDITION" | "DEDUCTION" | "ADJUSTMENT";

/** Transaction type: Sale (we sell to party) or Purchase (we buy from party) */
export type TransactionType = "SALE" | "PURCHASE";

// ─── Diamond Purchase Types ────────────────────────────────────

/** Rule type for diamond pricing */
export type DiamondRuleType = "Per Carat" | "Per Cent" | "Lump-Sum";

/** A single diamond entry row inside the Diamond Purchase Details dialog */
export interface DiamondEntry {
    id: string;
    type: string;              // "Diamond" (fixed label)
    ruleType: DiamondRuleType;
    rate: number;
    tagCaption: string;
    weight: number;            // In carats
    detail: string;
    total: number;             // Calculated total
}

// ─── Party (unified Customer / Supplier) ───────────────────────

/**
 * A Party is any person or entity we transact with.
 * They can be a customer (buys from us), supplier (sells to us), or both.
 * A single ledger tracks their debit/credit balance.
 */
export interface Party {
    id: string;
    orgId: string;
    name: string;
    mobile: string | null;
    address: string | null;
    type: "Customer" | "Supplier" | "Both";
    balance: string; // Decimal serialized as string (positive = they owe us, negative = we owe them)
    createdAt: string;
    updatedAt: string;
}

/** Lightweight party for dropdown search results */
export interface PartySearchResult {
    id: string;
    name: string;
    mobile: string | null;
    type: "Customer" | "Supplier" | "Both";
    balance: string;
}

export interface PartyRiskMetrics {
    totalPayments: number;
    lateRatio: number;
    avgDelayDays: number;
    totalOutstanding: number;
}

export interface PartyRiskProfile {
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH";
    metrics: PartyRiskMetrics;
}

// ─── Category ──────────────────────────────────────────────────

export interface Category {
    id: string;
    name: string;
}

export interface MetalTypeOption {
    id: string;
    name: string;
    purity: string;
    purityValue: number;
    isActive: boolean;
}

// ─── Gold Rate ─────────────────────────────────────────────────

export interface GoldRate {
    id: string;
    date: string;
    rate: string; // Decimal as string
    carat: number;
}

// ─── Invoice Line Item ─────────────────────────────────────────

/**
 * Represents a single row in the invoice item grid.
 * All weight fields are in grams, all amounts in PKR.
 */
export interface InvoiceItem {
    id: string;
    sortOrder: number;

    // Item Details
    categoryId: string | null;
    categoryName?: string; // Joined for display
    description: string | null;
    pieces: number;
    carat: number;
    size: string | null;

    // Flags
    isRepairingOrder: boolean;
    isSampleGold: boolean;
    isBulkPurchase?: boolean;

    // Gold Weights (grams)
    estimatedGoldWeight: number;
    adjustedGoldWeight: number;
    kaatWeight?: number;
    estimatedGrossWeight: number;

    // Other Weights (grams)
    stoneWeight: number;
    beadsWeight: number;
    diamondWeight: number;

    // Rates
    stoneRate?: number;        // Per-gram stone rate (PKR) — optional, stoneAmount takes precedence

    // Amounts (PKR)
    goldAmount: number;
    stoneAmount: number;
    beadsAmount: number;
    diamondAmount: number;
    polishAmount: number;
    labourAmount: number;
    totalAmount: number;

    // Diamond Entries (structured purchase details)
    diamondEntries?: DiamondEntry[];

    // Image
    imageUrl: string | null;

    // Inventory Link
    inventoryItemId?: string | null;
    metalTypeId?: string | null;
}

// ─── Invoice (Header + Summary) ───────────────────────────────

/**
 * Full invoice object used in the frontend.
 * Contains header info, party details, rules, totals, and line items.
 */
export interface Invoice {
    id: string;
    orgId: string;
    orderNumber: number;
    receiptNo: string | null;
    date: string;
    dueDate: string | null;
    rateType: RateType;
    status: InvoiceStatus;
    transactionType: TransactionType;

    // Party (Customer or Supplier)
    partyId: string | null;
    partyName: string | null;
    partyMobile: string | null;

    // Party Old Gold
    partyGoldWeight: number | null;
    partyGoldCarat: number | null;
    partyGoldValue: number | null;

    // Pasa Rate
    pasaRate: number | null;
    pasaDeduction: number | null;

    // Gold Rate
    goldRate: number | null;

    // Jewellery Rules (per-invoice overrides)
    polishBasis: string | null;
    polishRate: number | null;
    labourBasis: string | null;
    labourRate: number | null;

    // Totals
    totalGoldWeight: number;
    totalAmount: number;
    otherCharges: number;
    discount: number;
    cashReceived: number;
    goldReceived: number;
    balance: number;

    // Metadata
    remarks: string | null;
    photos: string[];

    // Line Items
    items: InvoiceItem[];
}

// ─── Invoice Form State ────────────────────────────────────────

/**
 * The form state used by React Hook Form.
 * This is what the user interacts with. All numbers are plain `number`.
 * Conversion to Decimal happens at the API layer.
 */
export interface InvoiceFormData {
    receiptNo: string;
    date: string;
    dueDate: string;
    rateType: RateType;
    transactionType: TransactionType;
    partyId: string;
    partyName: string;
    partyMobile: string;

    // Gold Rate
    goldRate: number;
    goldCarat: number;

    // Jewellery Rules
    polishBasis: string;
    polishRate: number;
    labourBasis: string;
    labourRate: number;

    // Party Old Gold
    partyGoldWeight: number;
    partyGoldCarat: number;

    // Pasa
    pasaRate: number;

    // Summary
    otherCharges: number;
    discount: number;
    cashReceived: number;
    goldReceived: number;

    // Remarks
    remarks: string;
}

// ─── Item Entry Form State ─────────────────────────────────────

/**
 * Form state for adding/editing a single line item.
 * Separate from InvoiceFormData for clarity.
 */
export interface ItemEntryFormData {
    categoryId: string;
    description: string;
    pieces: number;
    carat: number;
    size: string;
    isRepairingOrder: boolean;
    isSampleGold: boolean;
    estimatedGoldWeight: number;
    kaatWeight?: number;
    stoneWeight: number;
    stoneRate: number;          // Per-gram stone rate; stoneAmount = stoneRate × stoneWeight
    beadsWeight: number;
    diamondWeight: number;
    stoneAmount: number;
    beadsAmount: number;
    diamondAmount: number;
    diamondEntries?: DiamondEntry[]; // Structured diamond details for purchase
    inventoryItemId?: string; // Optional link to inventory
    metalTypeId?: string | null;
    imageUrl?: string | null;
}

// ─── Calculation Results ───────────────────────────────────────

/** Result of calculating a single line item's amounts */
export interface LineItemCalculation {
    adjustedGoldWeight: number;
    kaatWeight?: number;
    estimatedGrossWeight: number;
    goldAmount: number;
    polishAmount: number;
    labourAmount: number;
    totalAmount: number;
}

/** Result of calculating the full invoice summary */
export interface InvoiceSummaryCalculation {
    totalGoldWeight: number;
    totalAmount: number;
    customerGoldValue: number;
    pasaDeduction: number;
    netPayable: number;
    balance: number;
}

// ─── API Response Wrappers ─────────────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}
