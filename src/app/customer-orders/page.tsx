"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@shared/utils";
import { Loader2, Plus, Filter, Search, Edit2, Info, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import CustomerOrderModal from "@/components/customer-orders/CustomerOrderModal";

export function OrderStatusPill({ status }: { status: string }) {
    switch (status) {
        case "COMPLETED":
            return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-300">Completed</Badge>;
        case "PENDING":
            return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-300">Pending</Badge>;
        case "CANCELLED":
            return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300">Cancelled</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
}

export default function CustomerOrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<any>(null);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "ALL") params.set("status", statusFilter);
            if (search) params.set("search", search);

            const res = await fetch(`/api/customer-orders?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setOrders(data.data || []);
            } else {
                toast.error("Failed to load customer orders");
            }
        } catch (error) {
            console.error("Error loading orders", error);
            toast.error("Network Error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadOrders();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === "PENDING" ? "COMPLETED" : "PENDING";
            const res = await fetch(`/api/customer-orders/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Order marked as ${newStatus}`);
                loadOrders();
            } else {
                toast.error(data.error || "Failed to update status");
            }
        } catch (error) {
            toast.error("Network Error");
        }
    }

    const handleCreate = () => {
        setEditingOrder(null);
        setIsModalOpen(true);
    };

    const handleEdit = (order: any) => {
        setEditingOrder(order);
        setIsModalOpen(true);
    };

    const handleSave = async (formData: any) => {
        const url = editingOrder ? `/api/customer-orders/${editingOrder.id}` : "/api/customer-orders";
        const method = editingOrder ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (data.success) {
            toast.success(editingOrder ? "Order updated" : "Order created");
            loadOrders();
        } else {
            toast.error(data.error || "Failed to save order");
            throw new Error(data.error);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Orders</h1>
                    <p className="text-muted-foreground mt-1">Manage shop orders, repairs, and status tracking.</p>
                </div>
                <Button className="bg-primary text-white" onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Order
                </Button>
            </div>

            <Card className="mt-4 border shadow-sm">
                <CardHeader className="border-b bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
                    <div className="flex gap-2 items-center">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search customer name..."
                                className="pl-9 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                    </div>
                </CardHeader>

                {isFilterOpen && (
                    <div className="bg-muted/10 border-b px-6 py-4 grid grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PENDING">Pending (New Order)</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>
                )}

                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium text-center w-24">Actions</th>
                                <th className="px-4 py-3 font-medium text-center">Complete</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Karigar</th>
                                <th className="px-4 py-3 font-medium">Order No.</th>
                                <th className="px-4 py-3 font-medium">Customer</th>
                                <th className="px-4 py-3 font-medium">Mobile No.</th>
                                <th className="px-4 py-3 font-medium">Due Date</th>
                                <th className="px-4 py-3 font-medium">Tags (Items)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                                        <p className="mt-2 text-muted-foreground">Loading orders...</p>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                                        No customer orders found.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((o) => (
                                    <tr key={o.id} className="bg-white dark:bg-background hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button className="text-blue-600 hover:text-blue-800" title="Details">
                                                    <Info size={18} />
                                                </button>
                                                <button className="text-orange-600 hover:text-orange-800" title="Edit" onClick={() => handleEdit(o)}>
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleStatusToggle(o.id, o.status)}
                                                className={`transition-colors ${o.status === "COMPLETED" ? "text-emerald-600" : "text-gray-400 hover:text-emerald-500"
                                                    }`}
                                                title={o.status === "COMPLETED" ? "Mark Pending" : "Mark Completed"}
                                            >
                                                <CheckCircle2 size={24} />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <OrderStatusPill status={o.status} />
                                        </td>
                                        <td className="px-4 py-3 font-medium">{o.karigar?.name || "--"}</td>
                                        <td className="px-4 py-3">{o.orderNumber}</td>
                                        <td className="px-4 py-3 font-medium">{o.party?.name || "--"}</td>
                                        <td className="px-4 py-3">{o.party?.mobile || "--"}</td>
                                        <td className="px-4 py-3">
                                            {o.dueDate ? formatDate(o.dueDate) : "--"}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {o.items.map((i: any) => i.tagNo || "Item").join(", ")}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {isModalOpen && (
                <CustomerOrderModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    initialData={editingOrder}
                />
            )}
        </div>
    );
}
