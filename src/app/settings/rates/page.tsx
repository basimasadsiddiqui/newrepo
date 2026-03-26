import { Metadata } from "next";
import { getActiveMetalRates, getLocalPremium } from "@/lib/actions/metalRates";
import MetalRateManager from "@/components/admin/MetalRateManager";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
    title: "Metal Rates | Akhtar Jewellers ERP",
    description: "Manage daily metal rates for the ERP system.",
};

export default async function RatesSettingsPage() {
    // 1. Fetch initial server-side data
    const [rateRes, premiumRes] = await Promise.all([
        getActiveMetalRates(),
        getLocalPremium()
    ]);

    const initialRates = rateRes.success && rateRes.data ? rateRes.data : [];
    const initialPremium = premiumRes.success && premiumRes.data ? premiumRes.data : 0;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar matches the rest of the application */}
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-y-auto">
                <div className="p-8">
                    <div className="mb-6 border-b border-gray-200 pb-4">
                        <h1 className="text-3xl font-extrabold text-maroon tracking-tight">System Settings</h1>
                        <p className="text-gray-500 mt-2">Manage global configurations for the ERP.</p>
                    </div>

                    {/* Rendering the Client Component with Server data */}
                    <MetalRateManager
                        initialRates={initialRates}
                        initialPremium={initialPremium}
                    />
                </div>
            </main>
        </div>
    );
}
