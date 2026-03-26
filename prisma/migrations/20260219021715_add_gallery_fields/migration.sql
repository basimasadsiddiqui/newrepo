-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "designCode" TEXT,
ADD COLUMN     "makingCharges" DECIMAL(14,4),
ADD COLUMN     "retailPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN     "wastagePercent" DECIMAL(5,2),
ADD COLUMN     "wholesalePrice" DECIMAL(14,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "inventoryItemId" TEXT;

-- CreateIndex
CREATE INDEX "InvoiceItem_inventoryItemId_idx" ON "InvoiceItem"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
