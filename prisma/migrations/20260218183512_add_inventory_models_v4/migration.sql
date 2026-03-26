/*
  Warnings:

  - You are about to drop the `InventoryTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('AVAILABLE', 'SOLD', 'RESERVED', 'RETURNED', 'MEMO_OUT');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'OPENING_STOCK');

-- DropForeignKey
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT "InventoryTransaction_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT "InventoryTransaction_invoiceItemId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT "InventoryTransaction_orgId_fkey";

-- DropTable
DROP TABLE "InventoryTransaction";

-- DropEnum
DROP TYPE "InventoryTxType";

-- CreateTable
CREATE TABLE "MetalType" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purity" TEXT NOT NULL,
    "purityValue" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designCode" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "metalTypeId" TEXT NOT NULL,
    "makingCharges" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "makingChargeType" TEXT NOT NULL DEFAULT 'PER_GRAM',
    "wastagePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reorderThreshold" INTEGER NOT NULL DEFAULT 0,
    "isJewellery" BOOLEAN NOT NULL DEFAULT true,
    "isRetail" BOOLEAN NOT NULL DEFAULT true,
    "isWholesale" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "metalTypeId" TEXT,
    "supplierId" TEXT,
    "sku" TEXT NOT NULL,
    "grossWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "netWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "stoneWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "otherWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "StockStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "weightChange" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "referenceId" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetalType_orgId_idx" ON "MetalType"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "MetalType_orgId_name_purity_key" ON "MetalType"("orgId", "name", "purity");

-- CreateIndex
CREATE INDEX "Product_orgId_categoryId_idx" ON "Product"("orgId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_orgId_metalTypeId_idx" ON "Product"("orgId", "metalTypeId");

-- CreateIndex
CREATE INDEX "Product_orgId_designCode_idx" ON "Product"("orgId", "designCode");

-- CreateIndex
CREATE INDEX "InventoryItem_orgId_status_idx" ON "InventoryItem"("orgId", "status");

-- CreateIndex
CREATE INDEX "InventoryItem_orgId_productId_idx" ON "InventoryItem"("orgId", "productId");

-- CreateIndex
CREATE INDEX "InventoryItem_orgId_supplierId_idx" ON "InventoryItem"("orgId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_orgId_sku_key" ON "InventoryItem"("orgId", "sku");

-- CreateIndex
CREATE INDEX "StockMovement_orgId_inventoryItemId_idx" ON "StockMovement"("orgId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "StockMovement_orgId_type_idx" ON "StockMovement"("orgId", "type");

-- CreateIndex
CREATE INDEX "StockMovement_orgId_createdAt_idx" ON "StockMovement"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "MetalType" ADD CONSTRAINT "MetalType_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_metalTypeId_fkey" FOREIGN KEY ("metalTypeId") REFERENCES "MetalType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_metalTypeId_fkey" FOREIGN KEY ("metalTypeId") REFERENCES "MetalType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
