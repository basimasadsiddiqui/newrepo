-- Add per-item image gallery (multiple images per invoice item)
ALTER TABLE "InvoiceItem" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
