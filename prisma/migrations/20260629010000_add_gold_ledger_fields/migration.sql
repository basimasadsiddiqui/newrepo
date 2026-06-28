-- Gold-based ledger tracking (per-supplier gold balance + per-invoice pure gold)
ALTER TABLE "Invoice" ADD COLUMN "totalPureGoldWeight" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceItem" ADD COLUMN "guaranteedRatti" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "LedgerEntry" ADD COLUMN "goldWeight" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "LedgerEntry" ADD COLUMN "goldBalance" DECIMAL(14,4) NOT NULL DEFAULT 0;
