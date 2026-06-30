-- Other Charges / Discount can be entered as rupees ("RS") or pure gold grams ("GOLD")
ALTER TABLE "Invoice" ADD COLUMN "otherChargesMode" TEXT NOT NULL DEFAULT 'RS';
ALTER TABLE "Invoice" ADD COLUMN "otherChargesWeight" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "discountMode" TEXT NOT NULL DEFAULT 'RS';
ALTER TABLE "Invoice" ADD COLUMN "discountWeight" DECIMAL(14,4) NOT NULL DEFAULT 0;
