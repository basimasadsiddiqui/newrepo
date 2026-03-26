import { Package, Scale, Coins, AlertCircle } from 'lucide-react'

type StatProps = {
    totalItems: number
    totalGrossWeight: string
    totalNetWeight: string
    soldToday: number
}

export default function InventoryCards({ stats }: { stats: StatProps }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* Total Items */}
            <div className="card stat-card flex items-center p-4 shadow-sm border border-gold/10">
                <div className="p-3 rounded-full bg-gold/10 text-gold mr-4">
                    <Package size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Items</p>
                    <h3 className="text-xl font-bold text-gray-800">{stats.totalItems}</h3>
                </div>
            </div>

            {/* Gross Weight */}
            <div className="card stat-card flex items-center p-4 shadow-sm border border-maroon/10">
                <div className="p-3 rounded-full bg-maroon/10 text-maroon mr-4">
                    <Scale size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Gross Wt</p>
                    <h3 className="text-xl font-bold text-gray-800">{Number(stats.totalGrossWeight).toFixed(3)} <span className="text-xs">g</span></h3>
                </div>
            </div>

            {/* Net Weight (Pure) */}
            <div className="card stat-card flex items-center p-4 shadow-sm border border-emerald-500/10">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 mr-4">
                    <Coins size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Net Wt</p>
                    <h3 className="text-xl font-bold text-gray-800">{Number(stats.totalNetWeight).toFixed(3)} <span className="text-xs">g</span></h3>
                </div>
            </div>

            {/* Sold Today */}
            <div className="card stat-card flex items-center p-4 shadow-sm border border-blue-500/10">
                <div className="p-3 rounded-full bg-blue-500/10 text-blue-600 mr-4">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Sold Today</p>
                    <h3 className="text-xl font-bold text-gray-800">{stats.soldToday}</h3>
                </div>
            </div>

        </div>
    )
}
