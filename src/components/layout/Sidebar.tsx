/**
 * ============================================================================
 * SIDEBAR COMPONENT
 * ============================================================================
 *
 * Main navigation sidebar for the Akhtar Jewellers ERP.
 * Features:
 * - Brand logo area
 * - Navigation links grouped by section
 * - Active state highlighting with gold accent
 * - Responsive (collapses on mobile)
 *
 * Currently only the Invoice module is active. Other links are
 * shown but disabled, ready for future modules.
 * ============================================================================
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    FileText,
    LayoutDashboard,
    Users,
    Package,
    TrendingUp,
    Settings,
    ShoppingCart,
    Warehouse,
    BarChart3,
    Scale,
    Banknote,
} from "lucide-react";

/** Navigation item definition */
interface NavItem {
    label: string;
    icon: React.ReactNode;
    href: string;
    disabled?: boolean;
}

/** Navigation sections with grouped items */
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
    {
        title: "Main",
        items: [
            { label: "Dashboard", icon: <LayoutDashboard />, href: "/dashboard", disabled: true },
            { label: "Sales Invoice", icon: <FileText />, href: "/" },
            { label: "Purchase Invoice", icon: <Package />, href: "/purchase" },
            { label: "Invoice History", icon: <FileText />, href: "/invoices" },
            { label: "Payments", icon: <Banknote />, href: "/payments" },
        ],
    },
    {
        title: "Management",
        items: [
            { label: "Inventory", icon: <Package />, href: "/inventory" },
            { label: "Product Gallery", icon: <Package />, href: "/inventory/gallery" },
            { label: "Customer Orders", icon: <ShoppingCart />, href: "/customer-orders" },
            { label: "Parties", icon: <Users />, href: "/parties" },
            { label: "Products", icon: <Package />, href: "#", disabled: true },
            { label: "Gold Rates", icon: <Scale />, href: "/settings/rates" },
        ],
    },
    {
        title: "Reports",
        items: [
            { label: "Sales Report", icon: <TrendingUp />, href: "#", disabled: true },
            { label: "Stock", icon: <Warehouse />, href: "#", disabled: true },
            { label: "Analytics", icon: <BarChart3 />, href: "#", disabled: true },
        ],
    },
    {
        title: "System",
        items: [
            { label: "Settings", icon: <Settings />, href: "#", disabled: true },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="app-sidebar">
            {/* ── Brand ──────────────────────────────────── */}
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">AJ</div>
                <div>
                    <div className="sidebar-brand-text">Akhtar Jewellers</div>
                    <div className="sidebar-brand-sub">ERP System</div>
                </div>
            </div>

            {/* ── Navigation ─────────────────────────────── */}
            <nav className="sidebar-nav">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.title} className="sidebar-section">
                        <div className="sidebar-section-title">{section.title}</div>
                        {section.items.map((item) => {
                            const isActive =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(item.href) && item.href !== "#";

                            if (item.disabled) {
                                return (
                                    <button
                                        key={item.label}
                                        className="sidebar-link"
                                        disabled
                                        style={{ opacity: 0.35, cursor: "not-allowed" }}
                                        title="Coming Soon"
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`sidebar-link ${isActive ? "active" : ""}`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* ── Footer ─────────────────────────────────── */}
            <div style={{
                padding: "16px 20px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                fontSize: "0.6875rem",
                opacity: 0.4,
                textAlign: "center",
            }}>
                Akhtar Jewellers ERP v1.0
            </div>
        </aside>
    );
}
