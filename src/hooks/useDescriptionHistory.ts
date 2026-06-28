"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "invoice_description_history_v1";
const MAX_ENTRIES = 100;

/**
 * Remembers item descriptions the user has typed before (per device, via
 * localStorage) so future entries can be auto-suggested — like a phone
 * keyboard suggesting previously written words. Most-recent first.
 */
export function useDescriptionHistory(): { history: string[]; remember: (value: string) => void } {
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setHistory(parsed.filter((x) => typeof x === "string"));
            }
        } catch {
            /* noop */
        }
    }, []);

    const remember = useCallback((value: string) => {
        const v = value.trim();
        if (!v) return;
        setHistory((prev) => {
            const next = [v, ...prev.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, MAX_ENTRIES);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                /* noop */
            }
            return next;
        });
    }, []);

    return { history, remember };
}
