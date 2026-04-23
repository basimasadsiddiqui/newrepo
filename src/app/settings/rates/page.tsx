import { Metadata } from "next";
import { getActiveMetalRates, getLocalPremium } from "@/lib/actions/metalRates";
import MetalRateManager from "@/components/admin/MetalRateManager";
import GemstoneRatesManager from "@/components/settings/GemstoneRatesManager";

export const metadata: Metadata = {
    title: "Settings | Akhtar Jewellers ERP",
    description: "Manage global configurations for the ERP.",
};

export default async function RatesSettingsPage() {
    const [rateRes, premiumRes] = await Promise.all([
        getActiveMetalRates(),
        getLocalPremium()
    ]);

    const initialRates = rateRes.success && rateRes.data ? rateRes.data : [];
    const initialPremium = premiumRes.success && premiumRes.data ? premiumRes.data : 0;

    return (
        <main className="app-content">
            {/* ── Page header ── */}
            <div style={{
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
                <div>
                    <h1 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--maroon)", margin: 0 }}>
                        System Settings
                    </h1>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0", fontWeight: 500 }}>
                        Manage global rates and configurations for the ERP.
                    </p>
                </div>
            </div>

            {/* ── Metal Rates ── */}
            <MetalRateManager
                initialRates={initialRates}
                initialPremium={initialPremium}
            />

            {/* ── Divider ── */}
            <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

            {/* ── Gemstone Rates ── */}
            <GemstoneRatesManager />
        </main>
    );
}
