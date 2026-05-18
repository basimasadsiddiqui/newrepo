import { getDashboardStats } from '@modules/inventory/application/inventoryActions'
import InventoryCards from '@/components/inventory/InventoryCards'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Inventory Dashboard | Akhtar Jewellers',
}

export default async function InventoryPage() {
    const orgId = "org-akhtar" // Hardcoded for now, should come from auth
    const statsRes = await getDashboardStats(orgId)

    const stats = statsRes.success && statsRes.data ? statsRes.data : {
        totalItems: 0,
        totalGrossWeight: "0",
        totalNetWeight: "0",
        totalStoneWeight: "0",
        soldToday: 0
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Inventory Dashboard</h1>
                <div className="space-x-2">
                    {/* Action Buttons Placeholders */}
                    <Link href="/?type=PURCHASE" className="btn btn-primary bg-gold hover:bg-gold-dark text-black px-4 py-2 rounded-md font-semibold inline-block">
                        + Add Stock
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <InventoryCards
                stats={{
                    totalItems: stats.totalItems,
                    totalGrossWeight: stats.totalGrossWeight,
                    totalNetWeight: stats.totalNetWeight,
                    soldToday: stats.soldToday
                }}
            />

            {/* Recent Activity / Quick Links (Placeholder for now) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-lg mb-4">Stock Alerts</h3>
                    <p className="text-gray-500">No low stock alerts.</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
                    <div className="flex gap-2 flex-wrap">
                        <Link href="/?type=PURCHASE" className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200">
                            New Purchase
                        </Link>
                        <button className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200 opacity-50 cursor-not-allowed" title="Coming Soon">
                            Stock Transfer
                        </button>
                        <button className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200 opacity-50 cursor-not-allowed" title="Coming Soon">
                            Audit Report
                        </button>
                    </div>
                </div>
            </div>

        </div>
    )
}
