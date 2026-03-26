-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FIXED', 'UNFIXED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "InventoryTxType" AS ENUM ('ADDITION', 'DEDUCTION', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Both',
    "balance" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldRate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rate" DECIMAL(14,4) NOT NULL,
    "carat" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoldRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolishLabourConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "polishBasis" TEXT NOT NULL DEFAULT 'Per Tola',
    "polishRate" DECIMAL(14,4) NOT NULL,
    "labourBasis" TEXT NOT NULL DEFAULT 'Per Tola',
    "labourRate" DECIMAL(14,4) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolishLabourConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderNumber" SERIAL NOT NULL,
    "receiptNo" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "rateType" "RateType" NOT NULL DEFAULT 'FIXED',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "transactionType" "TransactionType" NOT NULL DEFAULT 'SALE',
    "partyId" TEXT,
    "partyName" TEXT,
    "partyMobile" TEXT,
    "customerGoldWeight" DECIMAL(14,4),
    "customerGoldCarat" INTEGER,
    "customerGoldValue" DECIMAL(14,4),
    "pasaRate" DECIMAL(10,4),
    "pasaDeduction" DECIMAL(14,4),
    "goldRate" DECIMAL(14,4),
    "polishBasis" TEXT DEFAULT 'Per Tola',
    "polishRate" DECIMAL(14,4),
    "labourBasis" TEXT DEFAULT 'Per Tola',
    "labourRate" DECIMAL(14,4),
    "totalGoldWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "otherCharges" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "cashReceived" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "goldReceived" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "description" TEXT,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "carat" INTEGER NOT NULL DEFAULT 24,
    "size" TEXT,
    "isRepairingOrder" BOOLEAN NOT NULL DEFAULT false,
    "isSampleGold" BOOLEAN NOT NULL DEFAULT false,
    "estimatedGoldWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "adjustedGoldWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "estimatedGrossWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "stoneWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "beadsWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "diamondWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "goldAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "stoneAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "beadsAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "diamondAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "polishAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "labourAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "invoiceId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "balance" DECIMAL(14,4) NOT NULL,
    "narration" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceItemId" TEXT,
    "categoryId" TEXT,
    "goldWeight" DECIMAL(14,4) NOT NULL,
    "carat" INTEGER NOT NULL DEFAULT 24,
    "type" "InventoryTxType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "Party_orgId_idx" ON "Party"("orgId");

-- CreateIndex
CREATE INDEX "Party_orgId_name_idx" ON "Party"("orgId", "name");

-- CreateIndex
CREATE INDEX "Party_orgId_mobile_idx" ON "Party"("orgId", "mobile");

-- CreateIndex
CREATE INDEX "Category_orgId_idx" ON "Category"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_orgId_name_key" ON "Category"("orgId", "name");

-- CreateIndex
CREATE INDEX "GoldRate_orgId_date_idx" ON "GoldRate"("orgId", "date");

-- CreateIndex
CREATE INDEX "GoldRate_orgId_carat_idx" ON "GoldRate"("orgId", "carat");

-- CreateIndex
CREATE INDEX "PolishLabourConfig_orgId_idx" ON "PolishLabourConfig"("orgId");

-- CreateIndex
CREATE INDEX "Invoice_orgId_date_idx" ON "Invoice"("orgId", "date");

-- CreateIndex
CREATE INDEX "Invoice_orgId_status_idx" ON "Invoice"("orgId", "status");

-- CreateIndex
CREATE INDEX "Invoice_orgId_partyId_idx" ON "Invoice"("orgId", "partyId");

-- CreateIndex
CREATE INDEX "Invoice_orgId_orderNumber_idx" ON "Invoice"("orgId", "orderNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_timestamp_idx" ON "AuditLog"("orgId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_entityType_entityId_idx" ON "AuditLog"("orgId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "LedgerEntry_orgId_partyId_date_idx" ON "LedgerEntry"("orgId", "partyId", "date");

-- CreateIndex
CREATE INDEX "LedgerEntry_orgId_invoiceId_idx" ON "LedgerEntry"("orgId", "invoiceId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_orgId_date_idx" ON "InventoryTransaction"("orgId", "date");

-- CreateIndex
CREATE INDEX "InventoryTransaction_orgId_categoryId_idx" ON "InventoryTransaction"("orgId", "categoryId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldRate" ADD CONSTRAINT "GoldRate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolishLabourConfig" ADD CONSTRAINT "PolishLabourConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
