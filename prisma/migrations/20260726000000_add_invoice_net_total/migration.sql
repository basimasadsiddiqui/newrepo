-- Grand total of the invoice = totalAmount (items subtotal) + otherCharges - discount.
-- "totalAmount" keeps its original meaning (the items subtotal) so existing rows and
-- every aggregate over that column stay valid; nullable because rows written before
-- this column existed have no recorded grand total and must fall back to totalAmount.
ALTER TABLE "Invoice" ADD COLUMN "netTotal" DECIMAL(14,4);
