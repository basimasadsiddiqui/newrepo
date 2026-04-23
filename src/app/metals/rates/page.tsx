import { Metadata } from "next";
import { getActiveMetalRates, getLocalPremium } from "@/lib/actions/metalRates";
import MetalRateManager from "@/components/admin/MetalRateManager";

export const metadata: Metadata = {
    title: "Metal Rates | Akhtar Jewellers ERP",
    description: "Manage daily metal rates – Gold, Silver, Diamond, Platinum.",
};

export default async function MetalRatesPage() {
    const [rateRes, premiumRes] = await Promise.all([
        getActiveMetalRates(),
        getLocalPremium(),
    ]);

    const initialRates = rateRes.success && rateRes.data ? rateRes.data : [];
    const initialPremium = premiumRes.success && premiumRes.data ? premiumRes.data : 0;

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-icon">
                    <span style={{ fontSize: "1.25rem" }}>💎</span>
                </div>
                <div className="page-header-text">
                    <h1>Metal Rates</h1>
                    <p>Manage gold, silver & diamond rates. Edit manually or sync from live API.</p>
                </div>
            </div>

            <MetalRateManager
                initialRates={initialRates}
                initialPremium={initialPremium}
            />
        </div>
    );
}
