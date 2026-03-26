import { Suspense } from "react";
import InvoiceMain from "@/components/invoice/InvoiceMain";

export default function SalesInvoicePage() {
  return (
    <Suspense fallback={<div>Loading Sales Invoice...</div>}>
      <InvoiceMain defaultTransactionType="SALE" hideToggle={true} />
    </Suspense>
  );
}
