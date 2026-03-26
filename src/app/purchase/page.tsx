import { Suspense } from "react";
import InvoiceMain from "@/components/invoice/InvoiceMain";

export default function PurchaseInvoicePage() {
    return (
        <Suspense fallback={<div>Loading Purchase Invoice...</div>}>
            <InvoiceMain defaultTransactionType="PURCHASE" hideToggle={true} />
        </Suspense>
    );
}
