"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";

export default function GalleryFilterBar() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [metal, setMetal] = useState(searchParams.get("metal") || "");
    const [category, setCategory] = useState(searchParams.get("category") || "");
    const [status, setStatus] = useState(searchParams.get("status") || "");

    // Debounce Search
    // If useDebounce hook is not available, I'll implement simple effect
    // Let's assume standard debouncing manually for safety
    const [debouncedSearch, setDebouncedSearch] = useState(search);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Update URL on change
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());

        if (debouncedSearch) params.set("search", debouncedSearch);
        else params.delete("search");

        if (metal) params.set("metal", metal);
        else params.delete("metal");

        if (category) params.set("category", category);
        else params.delete("category");

        if (status) params.set("status", status);
        else params.delete("status");

        params.set("page", "1"); // Reset PAGE on filter change

        router.push(`?${params.toString()}`);
    }, [debouncedSearch, metal, category, status, router]);
    // Warning: adding searchParams to dependency might cause loop if not careful. 
    // We should only trigger when state changes.
    // Actually, better way: Create a function "applyFilters" and call it.

    // Revised approach to avoid effects loop:
    // Only trigger on explicit user interaction or debounced value

    const handleClear = () => {
        setSearch("");
        setMetal("");
        setCategory("");
        setStatus("");
        router.push("?");
    };

    return (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center">

                {/* Search */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search SKU, Name, Design Code..."
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                        className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={metal}
                        onChange={(e) => setMetal(e.target.value)}
                    >
                        <option value="">All Metals</option>
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                    </select>

                    <select
                        className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        <option value="Ring">Ring</option>
                        <option value="Necklace">Necklace</option>
                        <option value="Bangle">Bangle</option>
                        <option value="Earring">Earring</option>
                        <option value="Chain">Chain</option>
                    </select>

                    <select
                        className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="SOLD">Sold</option>
                        <option value="RESERVED">Reserved</option>
                    </select>

                    <button
                        onClick={handleClear}
                        className="px-3 py-2 text-muted-foreground hover:bg-muted rounded-md text-sm transition-colors"
                        title="Clear Filters"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
