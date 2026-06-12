"use client";

import { useEffect, useState } from "react";

export interface ProductTagSuggestion {
    name: string;
    prefix: string;
}

// Debounced search of the product catalog for "Item Detail" autocomplete.
export function useProductTagSuggestions(query: string): ProductTagSuggestion[] {
    const [suggestions, setSuggestions] = useState<ProductTagSuggestion[]>([]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setSuggestions([]);
            return;
        }

        const handle = setTimeout(() => {
            fetch(`/api/product-tags?q=${encodeURIComponent(q)}`)
                .then(res => res.json())
                .then(json => { if (json.success) setSuggestions(json.data); })
                .catch(() => {});
        }, 250);

        return () => clearTimeout(handle);
    }, [query]);

    return suggestions;
}

// Assigns the next unique tag caption for a product name (creates the
// catalog entry on first use). Returns null on failure.
export async function assignProductTag(name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    try {
        const res = await fetch("/api/product-tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed }),
        });
        const json = await res.json();
        return json.success ? json.data.tagCaption : null;
    } catch {
        return null;
    }
}
