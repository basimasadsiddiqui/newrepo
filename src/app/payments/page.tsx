"use client";

import { useEffect, useState } from "react";
import { PaymentCategory, PaymentStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Plus, Filter, Search, MoreHorizontal, FileText, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

// Sub-component for Status Pills
export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
    switch (status) {
        case PaymentStatus.PAID:
            return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-300">Paid</Badge>;
        case PaymentStatus.PARTIAL:
            return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-300">Partial</Badge>;
        case PaymentStatus.OVERDUE:
            return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300">Overdue</Badge>;
        default:
            return <Badge variant="secondary">Pending</Badge>;
    }
}

export default function PaymentsPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    const [payments, setPayments] = useState<any[]>([]);
    const [loadingGrid, setLoadingGrid] = useState(true);

    // Filter states
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<PaymentCategory>(PaymentCategory.RECEIVABLE);
    const [activeStatus, setActiveStatus] = useState<PaymentStatus | "ALL">("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadData = async () => {
        setLoadingGrid(true);
        try {
            // Fetch Stats
            const statsRes = await fetch("/api/payments/dashboard-stats");
            const statsData = await statsRes.json();
            if (statsData.success) {
                setStats(statsData.data);
            } else {
                console.error("Failed to load dashboard stats:", statsData.error);
            }

            // Fetch Grid
            const gridRes = await fetch(`/api/payments?category=${activeCategory}&status=${activeStatus}&page=${page}&search=${search}`);
            const gridData = await gridRes.json();
            if (!gridData.success) {
                console.error("Failed to load payments API:", gridData.error);
                setPayments([]);
                setTotalPages(1);
            } else {
                setPayments(gridData.data.items || []);
                setTotalPages(gridData.data.totalPages || 1);
            }

        } catch (error) {
            console.error("Error loading payment data", error);
        } finally {
            setLoadingStats(false);
            setLoadingGrid(false);
        }
    };

    useEffect(() => {
        // Debounce search slightly or just load on category/status/page changes
        const delayDebounceFn = setTimeout(() => {
            loadData();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [activeCategory, activeStatus, page, search]);

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payments & Cash Flow</h1>
                    <p className="text-muted-foreground mt-1">Manage receivables, payables, and ledger transactions.</p>
                </div>
                <Button className="bg-primary text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    New Payment
                </Button>
            </div>

            {/* Dashboard / Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <Card className="bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Net Cash Position</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /> : (
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(stats?.netCash || 0)}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Total Receivables - Payables</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Expected Incoming (7D)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /> : (
                            <div className="text-2xl font-bold">{formatCurrency(stats?.expectedIncoming7Days || 0)}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Expected Outgoing (7D)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /> : (
                            <div className="text-2xl font-bold">{formatCurrency(stats?.expectedOutgoing7Days || 0)}</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Overdue (Receivables)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /> : (
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(stats?.overdueReceivables || 0)}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Overdue (Payables)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /> : (
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {formatCurrency(stats?.overduePayables || 0)}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <Card className="mt-4 border shadow-sm">
                <CardHeader className="border-b bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
                    <div className="flex gap-2">
                        <Button
                            variant={activeCategory === PaymentCategory.RECEIVABLE ? "default" : "outline"}
                            onClick={() => { setActiveCategory(PaymentCategory.RECEIVABLE); setPage(1); }}
                            className="w-32"
                        >
                            Receivables
                        </Button>
                        <Button
                            variant={activeCategory === PaymentCategory.PAYABLE ? "default" : "outline"}
                            onClick={() => { setActiveCategory(PaymentCategory.PAYABLE); setPage(1); }}
                            className="w-32"
                        >
                            Payables
                        </Button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search party..."
                                className="pl-9 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                    </div>
                </CardHeader>

                {/* Collapsible Advanced Filters */}
                {isFilterOpen && (
                    <div className="bg-muted/10 border-b px-6 py-4 grid grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={activeStatus}
                                onChange={(e) => { setActiveStatus(e.target.value as any); setPage(1); }}
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="PARTIAL">Partial</option>
                                <option value="PAID">Paid</option>
                                <option value="OVERDUE">Overdue</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Due Date</label>
                            <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                <option>Any Time</option>
                                <option>Due This Week</option>
                                <option>Due This Month</option>
                            </select>
                        </div>
                    </div>
                )}

                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                            <tr>
                                <th className="px-6 py-4 font-medium">Invoice / Ref</th>
                                <th className="px-6 py-4 font-medium">Party</th>
                                <th className="px-6 py-4 font-medium">Due Date</th>
                                <th className="px-6 py-4 font-medium">Total Amount</th>
                                <th className="px-6 py-4 font-medium">Remaining</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loadingGrid ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                                        <p className="mt-2 text-muted-foreground">Loading payments...</p>
                                    </td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No payments found matching the criteria.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id} className="bg-white dark:bg-background hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium">
                                            {p.invoice?.orderNumber ? `#INV-$p.invoice.orderNumber}` : "Manual Entry"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{p.party.name}</div>
                                            <div className="text-xs text-muted-foreground">{p.party.mobile || "No Contact"}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {formatDate(p.dueDate)}
                                            {p.status === PaymentStatus.OVERDUE && (
                                                <span className="block text-[10px] text-red-500 font-semibold uppercase mt-0.5">
                                                    Late
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{formatCurrency(p.totalAmount)}</td>
                                        <td className="px-6 py-4 font-bold">{formatCurrency(p.remainingAmount)}</td>
                                        <td className="px-6 py-4">
                                            <PaymentStatusPill status={p.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/payments/$p.id}`)}
                                            >
                                                Details
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="ml-2"
                                                disabled={p.status === PaymentStatus.PAID}
                                            >
                                                <Banknote className="h-4 w-4 mr-1" />
                                                Pay
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {!loadingGrid && totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t">
                            <span className="text-sm text-muted-foreground">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
