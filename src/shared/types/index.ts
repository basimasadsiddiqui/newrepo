/**
 * ============================================================================
 * SHARED TYPE DEFINITIONS
 * ============================================================================
 * Central type definitions shared across all modules.
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
    type: string;
    ruleType: DiamondRuleType;
    rate: number;
    tagCaption: string;
    weight: number;
    detail: string;
    total: number;
}

// ─── Party (unified Customer / Supplier) ───────────────────────

export interface Party {
    id: string;
    orgId: string;
    name: string;
    mobile: string | null;
    address: string | null;
    type: "Customer" | "Supplier" | "Both";
    balance: string;
    createdAt: string;
    updatedAt: string;
}

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
    rate: string;
    carat: number;
}

// ─── Invoice Line Item ─────────────────────────────────────────

export interface InvoiceItem {
    id: string;
    sortOrder: number;

    categoryId: string | null;
    categoryName?: string;
    description: string | null;
    tagCaption?: string | null;
    pieces: number;
    carat: number;
    size: string | null;

    isRepairingOrder: boolean;
    isSampleGold: boolean;
    isBulkPurchase?: boolean;

    estimatedGoldWeight: number;
    adjustedGoldWeight: number;
    kaatWeight?: number;
    estimatedGrossWeight: number;

    stoneWeight: number;
    beadsWeight: number;
    diamondWeight: number;

    stoneRate?: number;

    goldAmount: number;
    stoneAmount: number;
    beadsAmount: number;
    diamondAmount: number;
    polishAmount: number;
    labourAmount: number;
    totalAmount: number;

    diamondEntries?: DiamondEntry[];

    imageUrl: string | null;
    /** Additional images for this item (gallery). imageUrl mirrors imageUrls[0] for back-compat. */
    imageUrls?: string[];
    /** Supplier's claimed ratti kaat guarantee (purchases). */
    guaranteedRatti?: number;

    inventoryItemId?: string | null;
    metalTypeId?: string | null;
    metalName?: string | null;
}

// ─── Invoice (Header + Summary) ───────────────────────────────

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

    partyId: string | null;
    partyName: string | null;
    partyMobile: string | null;

    partyGoldWeight: number | null;
    partyGoldCarat: number | null;
    partyGoldValue: number | null;

    pasaRate: number | null;
    pasaDeduction: number | null;

    goldRate: number | null;

    polishBasis: string | null;
    polishRate: number | null;
    labourBasis: string | null;
    labourRate: number | null;

    totalGoldWeight: number;
    totalPureGoldWeight?: number;
    totalAmount: number;
    otherCharges: number;
    discount: number;
    cashReceived: number;
    goldReceived: number;
    balance: number;

    remarks: string | null;
    photos: string[];

    items: InvoiceItem[];
}

// ─── Invoice Form State ────────────────────────────────────────

export interface InvoiceFormData {
    receiptNo: string;
    date: string;
    dueDate: string;
    rateType: RateType;
    transactionType: TransactionType;
    partyId: string;
    partyName: string;
    partyMobile: string;

    goldRate: number;
    goldCarat: number;

    polishBasis: string;
    polishRate: number;
    labourBasis: string;
    labourRate: number;

    partyGoldWeight: number;
    partyGoldCarat: number;

    pasaRate: number;

    otherCharges: number;
    discount: number;
    cashReceived: number;
    goldReceived: number;

    remarks: string;
}

// ─── Item Entry Form State ─────────────────────────────────────

export interface ItemEntryFormData {
    categoryId: string;
    description: string;
    tagCaption?: string;
    pieces: number;
    carat: number;
    size: string;
    isRepairingOrder: boolean;
    isSampleGold: boolean;
    estimatedGoldWeight: number;
    kaatWeight?: number;
    stoneWeight: number;
    stoneRate: number;
    beadsWeight: number;
    diamondWeight: number;
    stoneAmount: number;
    beadsAmount: number;
    diamondAmount: number;
    diamondEntries?: DiamondEntry[];
    inventoryItemId?: string;
    metalTypeId?: string | null;
    metalName?: string | null;
    imageUrl?: string | null;
}

// ─── Calculation Results ───────────────────────────────────────

export interface LineItemCalculation {
    adjustedGoldWeight: number;
    kaatWeight?: number;
    estimatedGrossWeight: number;
    goldAmount: number;
    polishAmount: number;
    labourAmount: number;
    totalAmount: number;
}

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
