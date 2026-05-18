import { Metadata } from "next";
import { getActiveMetalRates, getLocalPremium } from "@modules/metals/application/metalRateActions";
import { prisma } from "@core/database";
import MetalsOverview from "@/components/metals/MetalsOverview";

export const metadata: Metadata = {
    title: "Metals Overview | Akhtar Jewellers ERP",
    description: "Live metal rates dashboard – Gold, Silver, Diamond & Platinum.",
};

const ORG_ID = "org-akhtar";

export default async function MetalsOverviewPage() {
    const [rateRes, premiumRes] = await Promise.all([
        getActiveMetalRates(),
        getLocalPremium(),
    ]);

    const rates = rateRes.success && rateRes.data ? rateRes.data : [];
    const premium = premiumRes.success && premiumRes.data ? premiumRes.data : 0;

    let metalTypeCount = 0;
    let categoryCount = 0;
    try {
        [metalTypeCount, categoryCount] = await Promise.all([
            prisma.metalType.count({ where: { orgId: ORG_ID, isActive: true } }),
            prisma.category.count({ where: { orgId: ORG_ID, isActive: true } }),
        ]);
    } catch { /* silent */ }

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-icon">
                    <span style={{ fontSize: "1.25rem" }}>⚖️</span>
                </div>
                <div className="page-header-text">
                    <h1>Metals Overview</h1>
                    <p>Live rates, metal types & product categories at a glance.</p>
                </div>
            </div>

            <MetalsOverview
                metalTypeCount={metalTypeCount}
                categoryCount={categoryCount}
                activeRatesCount={rates.length}
                premium={premium}
                rates={rates}
            />
        </div>
    );
}
