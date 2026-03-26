"use client";

import { useEffect, useState } from "react";
import { Party } from "@/types";
import PartyTable from "@/components/party/PartyTable";
import PartyForm from "@/components/party/PartyForm";
import { Plus, Search, RefreshCw, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function PartiesPage() {
    const [parties, setParties] = useState<Party[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<"All" | Party["type"]>("All");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingParty, setEditingParty] = useState<Party | null>(null);

    const fetchParties = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set("q", searchQuery);
            if (typeFilter !== "All") params.set("type", typeFilter);

            const res = await fetch(`/api/parties?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setParties(data.data || []);
            } else {
                toast.error("Failed to load parties");
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchParties();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, typeFilter]);

    const handleCreate = () => {
        setEditingParty(null);
        setIsModalOpen(true);
    };

    const handleEdit = (party: Party) => {
        setEditingParty(party);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        const toastId = toast.loading("Deleting party...");
        try {
            const res = await fetch(`/api/parties/${id}`, { method: "DELETE" });
            const data = await res.json();

            if (res.ok && data.success) {
                toast.success("Party deleted successfully", { id: toastId });
                fetchParties();
            } else {
                toast.error(data.error || "Failed to delete party", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error", { id: toastId });
        }
    };

    const handleSave = async (formData: Partial<Party>) => {
        const toastId = toast.loading("Saving party...");
        try {
            const url = editingParty
                ? `/api/parties/${editingParty.id}`
                : "/api/parties";
            const method = editingParty ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success(
                    editingParty ? "Party updated successfully" : "Party created successfully",
                    { id: toastId }
                );
                fetchParties();
            } else {
                toast.error(data.error || "Failed to save party", { id: toastId });
                throw new Error(data.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error", { id: toastId });
            throw error;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--maroon)]">
                        Party Management
                    </h1>
                    <p className="text-sm text-gray-500">
                        Manage your customers and suppliers
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchParties}
                        className="btn btn-ghost btn-icon"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button onClick={handleCreate} className="btn btn-primary">
                        <Plus size={18} />
                        Add Party
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        className="form-input pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48">
                    <select
                        className="form-select"
                        value={typeFilter}
                        onChange={(e) =>
                            setTypeFilter(e.target.value as "All" | Party["type"])
                        }
                    >
                        <option value="All">All Types</option>
                        <option value="Customer">Customer</option>
                        <option value="Supplier">Supplier</option>
                        <option value="Both">Both</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <PartyTable
                parties={parties}
                isLoading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* Modal */}
            <PartyForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingParty}
            />
        </div>
    );
}
