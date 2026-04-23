/*
  Warnings:

  - A unique constraint covering the columns `[paymentTxId]` on the table `LedgerEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'BANK', 'GOLD', 'MIXED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PKR',
ADD COLUMN     "currencyRate" DECIMAL(10,4) NOT NULL DEFAULT 1,
ADD COLUMN     "intlOunceRate" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN     "kaatBasis" TEXT DEFAULT 'Direct Weight',
ADD COLUMN     "kaatRate" DECIMAL(14,4) DEFAULT 0,
ADD COLUMN     "supplierInvoiceNo" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "diamondEntries" JSONB,
ADD COLUMN     "kaatWeight" DECIMAL(14,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "paymentTxId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "metalPremiumPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "goldBalance" DECIMAL(14,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MetalRate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "metal" TEXT NOT NULL,
    "ratePerGram" DECIMAL(14,4) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'API',
    "updatedBy" TEXT,

    CONSTRAINT "MetalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalRateHistory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "metal" TEXT NOT NULL,
    "ratePerGram" DECIMAL(14,4) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "MetalRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "category" "PaymentCategory" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(14,4) NOT NULL,
    "paidAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(14,4) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "isInstallmentBased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goldWeight" DECIMAL(14,4),
    "goldRate" DECIMAL(14,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstallment" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),

    CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderNumber" SERIAL NOT NULL,
    "partyId" TEXT,
    "customCustomerName" VARCHAR(255),
    "karigarId" TEXT,
    "customKarigarName" VARCHAR(255),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "description" TEXT,
    "tagNo" TEXT,
    "categoryId" TEXT,
    "metalTypeId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "rate" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetalRate_orgId_metal_idx" ON "MetalRate"("orgId", "metal");

-- CreateIndex
CREATE UNIQUE INDEX "MetalRate_orgId_metal_key" ON "MetalRate"("orgId", "metal");

-- CreateIndex
CREATE INDEX "MetalRateHistory_orgId_metal_recordedAt_idx" ON "MetalRateHistory"("orgId", "metal", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_invoiceId_key" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_orgId_category_idx" ON "Payment"("orgId", "category");

-- CreateIndex
CREATE INDEX "Payment_orgId_status_idx" ON "Payment"("orgId", "status");

-- CreateIndex
CREATE INDEX "Payment_orgId_dueDate_idx" ON "Payment"("orgId", "dueDate");

-- CreateIndex
CREATE INDEX "Payment_orgId_partyId_idx" ON "Payment"("orgId", "partyId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_paymentId_idx" ON "PaymentTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentInstallment_paymentId_idx" ON "PaymentInstallment"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentInstallment_dueDate_idx" ON "PaymentInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "PaymentReminder_paymentId_idx" ON "PaymentReminder"("paymentId");

-- CreateIndex
CREATE INDEX "CustomerOrder_orgId_date_idx" ON "CustomerOrder"("orgId", "date");

-- CreateIndex
CREATE INDEX "CustomerOrder_orgId_status_idx" ON "CustomerOrder"("orgId", "status");

-- CreateIndex
CREATE INDEX "CustomerOrder_orgId_partyId_idx" ON "CustomerOrder"("orgId", "partyId");

-- CreateIndex
CREATE INDEX "CustomerOrderItem_orderId_idx" ON "CustomerOrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_paymentTxId_key" ON "LedgerEntry"("paymentTxId");

-- AddForeignKey
ALTER TABLE "MetalRate" ADD CONSTRAINT "MetalRate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetalRateHistory" ADD CONSTRAINT "MetalRateHistory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentTxId_fkey" FOREIGN KEY ("paymentTxId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_karigarId_fkey" FOREIGN KEY ("karigarId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_metalTypeId_fkey" FOREIGN KEY ("metalTypeId") REFERENCES "MetalType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
