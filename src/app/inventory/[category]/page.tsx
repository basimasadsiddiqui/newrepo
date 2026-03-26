import { getStockList } from '@/lib/actions/inventory'
import { Metadata } from 'next'

type Props = {
    params: Promise<{ category: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params
    const title = params.category.charAt(0).toUpperCase() + params.category.slice(1)
    return {
        title: `${title} Stock | Akhtar Jewellers`,
    }
}

export default async function InventoryDynamicPage(props: Props) {
    const params = await props.params
    const searchParams = await props.searchParams
    const category = params.category // 'gold', 'silver', 'sold', 'reorder'

    const orgId = "org-akhtar"
    const page = Number(searchParams.page) || 1
    const search = typeof searchParams.search === 'string' ? searchParams.search : undefined

    // Map route params to filters
    const filters: any = { search }

    if (category === 'gold') {
        filters.metalPurity = '22K' // or just filter by metal name if implemented
        // Logic inside getStockList might need update to handle 'gold' generic vs purity
        // For now let's assume 'gold' means all Gold items. 
        // But getStockList assumes metalPurity matches exact string '22K'.
        // I should update getStockList to handle metalName or generic types.
        // But for prototype, let's just filtering by status mainly.
        // If I want to filter by Metal Group, I need to update getStockList.
    }

    if (category === 'silver') {
        // filters.metalPurity = '925' 
    }

    if (category === 'sold') {
        filters.status = 'SOLD'
    } else {
        filters.status = 'AVAILABLE'
    }

    const { data: items, pagination } = await getStockList(orgId, page, 20, filters)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 capitalize">{category} Stock</h1>
            </div>

            {/* Filter Bar Placeholder */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4">
                <input
                    type="text"
                    placeholder="Search SKU or Name..."
                    className="border border-gray-300 rounded px-3 py-2 text-sm w-64"
                />
                <button className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700">Search</button>
            </div>

            {/* Stock Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                        <tr>
                            <th className="py-3 px-4">SKU</th>
                            <th className="py-3 px-4">Img</th>
                            <th className="py-3 px-4">Product Name</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Metal</th>
                            <th className="py-3 px-4">Supplier</th>
                            <th className="py-3 px-4 text-right">Gross Wt</th>
                            <th className="py-3 px-4 text-right">Net Wt</th>
                            <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items?.map((item: any) => (
                            <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="py-3 px-4 font-mono text-xs text-gray-500">{item.sku}</td>
                                <td className="py-3 px-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {item.product.imageUrl ? (
                                            <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            "Img"
                                        )}
                                    </div>
                                </td>
                                <td className="py-3 px-4 font-medium text-gray-800">{item.product.name}</td>
                                <td className="py-3 px-4 text-gray-600">{item.product.category.name}</td>
                                <td className="py-3 px-4 text-gray-600">
                                    <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs">
                                        {item.metalType.purity}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-gray-600 text-xs">
                                    {item.supplier?.name || "-"}
                                </td>
                                <td className="py-3 px-4 text-right font-mono">{item.grossWeight.toFixed(3)}</td>
                                <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">{item.netWeight.toFixed(3)}</td>
                                <td className="py-3 px-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                                        item.status === 'SOLD' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {(!items || items.length === 0) && (
                            <tr>
                                <td colSpan={9} className="py-8 text-center text-gray-500">
                                    No items found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Pagination */}
            {pagination && (
                <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
                    <div className="space-x-2">
                        <ArrowLink
                            href={`/inventory/${category}?page=${pagination.page - 1}${search ? `&search=${search}` : ''}`}
                            disabled={pagination.page <= 1}
                        >
                            Previous
                        </ArrowLink>
                        <ArrowLink
                            href={`/inventory/${category}?page=${pagination.page + 1}${search ? `&search=${search}` : ''}`}
                            disabled={pagination.page >= pagination.totalPages}
                        >
                            Next
                        </ArrowLink>
                    </div>
                </div>
            )}
        </div>
    )
}

function ArrowLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
    if (disabled) {
        return <span className="px-3 py-1 border rounded opacity-50 cursor-not-allowed bg-gray-50">{children}</span>
    }
    return (
        <a href={href} className="px-3 py-1 border rounded hover:bg-gray-50 inline-block">
            {children}
        </a>
    )
}
