-- Supplier's claimed gold return (grams), captured per line item on purchases
ALTER TABLE "InvoiceItem" ADD COLUMN "goldReturnClaim" DECIMAL(14,4) NOT NULL DEFAULT 0;
