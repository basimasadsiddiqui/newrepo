"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    FileText, LayoutDashboard, Users, Package,
    TrendingUp, Settings, ShoppingCart, Warehouse,
    BarChart3, Scale, Banknote, PackagePlus,
} from "lucide-react";

interface NavItem {
    label: string;
    icon: React.ReactNode;
    href: string;
    disabled?: boolean;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
    {
        title: "Main",
        items: [
            { label: "Dashboard",        icon: <LayoutDashboard />, href: "/dashboard", disabled: true },
            { label: "Sales Invoice",    icon: <FileText />,        href: "/" },
            { label: "Purchase Invoice", icon: <Package />,         href: "/purchase" },
            { label: "Bulk Purchase",    icon: <PackagePlus />,     href: "/bulk-purchase" },
            { label: "Invoice History",  icon: <FileText />,        href: "/invoices" },
            { label: "Payments",         icon: <Banknote />,        href: "/payments" },
        ],
    },
    {
        title: "Management",
        items: [
            { label: "Inventory",       icon: <Package />,     href: "/inventory" },
            { label: "Product Gallery", icon: <Package />,     href: "/inventory/gallery" },
            { label: "Customer Orders", icon: <ShoppingCart />,href: "/customer-orders" },
            { label: "Parties",         icon: <Users />,       href: "/parties" },
            { label: "Products",        icon: <Package />,     href: "#", disabled: true },
            { label: "Gold Rates",      icon: <Scale />,       href: "/settings/rates" },
        ],
    },
    {
        title: "Reports",
        items: [
            { label: "Sales Report",    icon: <TrendingUp />, href: "#", disabled: true },
            { label: "Stock",           icon: <Warehouse />,  href: "#", disabled: true },
            { label: "Analytics",       icon: <BarChart3 />,  href: "#", disabled: true },
        ],
    },
    {
        title: "System",
        items: [
            { label: "Settings", icon: <Settings />, href: "#", disabled: true },
        ],
    },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {isOpen && (
                <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
            )}

            <aside className={`app-sidebar${isOpen ? " open" : ""}`}>
                {/* ── Brand ── */}
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">AJ</div>
                    <div style={{ minWidth: 0 }}>
                        <div className="sidebar-brand-text">Akhtar Jewellers</div>
                        <div className="sidebar-brand-sub">ERP System · v1.0</div>
                    </div>
                    {/* Live indicator */}
                    <div style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: "0.5625rem",
                        fontWeight: 700,
                        color: "rgba(201,168,76,0.7)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        flexShrink: 0,
                    }}>
                        <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#4ade80",
                            boxShadow: "0 0 6px rgba(74,222,128,0.7)",
                            flexShrink: 0,
                        }} />
                        Live
                    </div>
                </div>

                {/* ── Navigation ── */}
                <nav className="sidebar-nav">
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.title} className="sidebar-section">
                            <div className="sidebar-section-title">{section.title}</div>
                            {section.items.map((item) => {
                                const isActive =
                                    item.href === "/"
                                        ? pathname === "/"
                                        : item.href !== "#" && (
                                            pathname === item.href ||
                                            (pathname.startsWith(item.href + "/") && item.href !== "/purchase")
                                        );

                                if (item.disabled) {
                                    return (
                                        <button
                                            key={item.label}
                                            className="sidebar-link"
                                            disabled
                                            style={{ opacity: 0.28, cursor: "not-allowed" }}
                                            title="Coming Soon"
                                        >
                                            {item.icon}
                                            <span>{item.label}</span>
                                            <span style={{
                                                marginLeft: "auto",
                                                fontSize: "0.5rem",
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.08em",
                                                opacity: 0.6,
                                                background: "rgba(255,255,255,0.1)",
                                                padding: "1px 5px",
                                                borderRadius: 4,
                                            }}>
                                                Soon
                                            </span>
                                        </button>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`sidebar-link${isActive ? " active" : ""}`}
                                        onClick={onClose}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                        {isActive && (
                                            <span style={{
                                                marginLeft: "auto",
                                                width: 6,
                                                height: 6,
                                                borderRadius: "50%",
                                                background: "var(--gold)",
                                                boxShadow: "0 0 6px var(--gold)",
                                                flexShrink: 0,
                                            }} />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* ── Footer ── */}
                <div style={{
                    padding: "12px 18px",
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                }}>
                    <span style={{
                        fontSize: "0.625rem",
                        opacity: 0.35,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }}>
                        Akhtar Jewellers ERP
                    </span>
                    <span style={{
                        fontSize: "0.5625rem",
                        background: "rgba(201,168,76,0.15)",
                        color: "rgba(201,168,76,0.7)",
                        border: "1px solid rgba(201,168,76,0.2)",
                        padding: "1px 6px",
                        borderRadius: 99,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                    }}>
                        v1.0
                    </span>
                </div>
            </aside>
        </>
    );
}
