/**
 * ============================================================================
 * INVOICE HISTORY PAGE
 * ============================================================================
 *
 * Lists all invoices (Drafts and Finalized).
 * Allows searching by Party Name or Receipt No.
 * Pagination support.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
    FileText,
    Search,
    ChevronLeft,
    ChevronRight,
    Plus,
    Edit,
    Eye,
    Loader2
} from "lucide-react";

import { formatCurrency } from "@shared/utils";
import { Invoice } from "@shared/types";

interface InvoiceListResponse {
    success: boolean;
    data: Invoice[];
    total: number;
    page: number;
    pageSize: number;
}

export default function InvoiceHistoryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = 20;

    useEffect(() => {
        fetchInvoices();
    }, [page, searchTerm]);
    // Note: Debounce searchTerm in a real app, simplified for now.

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            // Construct URL
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("pageSize", pageSize.toString());

            // In a real app we'd pass search term to API, 
            // but current API might not support it yet. 
            // Let's assume we might filter client side or need to update API.
            // For now, let's just fetch all.

            const res = await fetch(`/api/invoices?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch invoices");

            const data: InvoiceListResponse = await res.json();
            if (data.success) {
                setInvoices(data.data);
                setTotal(data.total);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    const handlePrevPage = () => {
        if (page > 1) router.push(`/invoices?page=${page - 1}`);
    };

    const handleNextPage = () => {
        if (page < totalPages) router.push(`/invoices?page=${page + 1}`);
    };

    // Filter client-side if API doesn't support search yet, 
    // or simple visual filter.
    // Ideally API should handle this.
    const filteredInvoices = invoices.filter(inv => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            inv.partyName?.toLowerCase().includes(term) ||
            inv.receiptNo?.toLowerCase().includes(term) ||
            inv.orderNumber.toString().includes(term)
        );
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="text-gold" />
                    Invoice History
                </h1>
                <Link href="/" className="btn btn-primary">
                    <Plus size={16} />
                    New Invoice
                </Link>
            </div>

            {/* Search Bar */}
            <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by Party or Receipt #..."
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-6 py-3">Order #</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Party</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Total Amount</th>
                                <th className="px-6 py-3">Balance</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="animate-spin w-4 h-4" />
                                            Loading invoices...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                                        No invoices found.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium">#{inv.orderNumber}</td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {format(new Date(inv.date), "dd MMM yyyy")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-foreground">{inv.partyName || "Walk-in"}</div>
                                            {inv.partyMobile && <div className="text-xs text-muted-foreground">{inv.partyMobile}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${inv.transactionType === "SALE"
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                }`}>
                                                {inv.transactionType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono">
                                            {formatCurrency(Number(inv.totalAmount))}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground">
                                            {formatCurrency(Number(inv.balance))}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${inv.status === "FINALIZED"
                                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                                                : inv.status === "DRAFT"
                                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400"
                                                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {inv.status === "DRAFT" ? (
                                                <Link
                                                    href={inv.transactionType === "PURCHASE" ? `/purchase?id=${inv.id}` : `/?id=${inv.id}`}
                                                    className="btn btn-sm btn-ghost text-primary hover:bg-primary/10"
                                                >
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Edit
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={inv.transactionType === "PURCHASE" ? `/purchase?id=${inv.id}` : `/?id=${inv.id}`}
                                                    className="btn btn-sm btn-ghost text-muted-foreground hover:bg-muted"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    View
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-muted/20">
                    <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages || 1}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={page <= 1}
                            className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={page >= totalPages}
                            className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
