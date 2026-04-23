-- AddColumn huid to InvoiceItem
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "huid" TEXT;

-- AddColumn stoneRate to InvoiceItem
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "stoneRate" DECIMAL(14,4);

-- AddColumn receiptCounter to Invoice (auto-receipt per type)
-- We'll use a sequence-based approach via a separate counter table.
-- Alternatively, derive from orderNumber. Using a DB counter is cleaner.

CREATE TABLE IF NOT EXISTS "InvoiceCounter" (
  "key"     TEXT PRIMARY KEY,
  "current" INTEGER NOT NULL DEFAULT 0
);

-- Seed the counter keys (idempotent)
INSERT INTO "InvoiceCounter" ("key", "current")
VALUES ('SALE', 0), ('PURCHASE', 0), ('BULK', 0)
ON CONFLICT ("key") DO NOTHING;
