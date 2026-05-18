// Invoice module domain types — re-exported from shared types for module isolation.
// Modules consuming invoice entities should import from here, not from shared directly.
export type {
    InvoiceStatus,
    RateType,
    TransactionType,
    DiamondRuleType,
    DiamondEntry,
    InvoiceItem,
    Invoice,
    InvoiceFormData,
    ItemEntryFormData,
    LineItemCalculation,
    InvoiceSummaryCalculation,
} from "@shared/types";
