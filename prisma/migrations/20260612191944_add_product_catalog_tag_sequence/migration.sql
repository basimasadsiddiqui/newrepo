-- AddColumn tagCaption to InvoiceItem
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "tagCaption" TEXT;

-- CreateTable
CREATE TABLE "ProductCatalog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagSequence" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TagSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCatalog_orgId_prefix_idx" ON "ProductCatalog"("orgId", "prefix");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCatalog_orgId_name_key" ON "ProductCatalog"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TagSequence_orgId_prefix_key" ON "TagSequence"("orgId", "prefix");

-- AddForeignKey
ALTER TABLE "ProductCatalog" ADD CONSTRAINT "ProductCatalog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagSequence" ADD CONSTRAINT "TagSequence_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
