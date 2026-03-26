"use client";

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function InventoryLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const isActive = (path: string) => {
        if (path === '/inventory' && pathname === '/inventory') return true
        if (path !== '/inventory' && pathname?.startsWith(path)) return true
        return false
    }

    const getLinkClass = (path: string) => {
        const baseClass = "whitespace-nowrap py-4 px-1 font-medium text-sm border-b-2"
        return isActive(path)
            ? `${baseClass} border-gold text-gold`
            : `${baseClass} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300`
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <Link href="/inventory" className={getLinkClass('/inventory')}>
                        Dashboard
                    </Link>
                    <Link href="/inventory/gold" className={getLinkClass('/inventory/gold')}>
                        Gold Stock
                    </Link>
                    <Link href="/inventory/silver" className={getLinkClass('/inventory/silver')}>
                        Silver Stock
                    </Link>
                    <Link href="/inventory/sold" className={getLinkClass('/inventory/sold')}>
                        Sold History
                    </Link>
                </nav>
            </div>

            {children}
        </div>
    )
}
