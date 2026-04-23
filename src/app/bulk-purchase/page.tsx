import { Suspense } from "react";
import InvoiceMain from "@/components/invoice/InvoiceMain";

export default function BulkPurchasePage() {
    return (
        <Suspense fallback={<div>Loading Bulk Purchase…</div>}>
            <InvoiceMain
                defaultTransactionType="PURCHASE"
                hideToggle={true}
                isBulkMode={true}
            />
        </Suspense>
    );
}
