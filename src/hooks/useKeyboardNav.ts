/**
 * ============================================================================
 * Keyboard Navigation Hook – Invoice Module
 * ============================================================================
 *
 * Provides keyboard shortcuts for fast data entry:
 * - Ctrl+S → Save draft
 * - Ctrl+Enter → Add item / Finalize
 * - Escape → Cancel edit / Reset form
 * - Tab → Natural field navigation (browser default)
 * ============================================================================
 */

"use client";

import { useEffect, useCallback } from "react";

interface UseKeyboardNavProps {
    onSaveDraft: () => void;
    onAddItem: () => void;
    onFinalize: () => void;
    onResetForm: () => void;
    isEditing: boolean;
    itemCount: number;
}

export function useKeyboardNav({
    onSaveDraft,
    onAddItem,
    onFinalize,
    onResetForm,
    isEditing,
    itemCount,
}: UseKeyboardNavProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Ctrl+S — Save draft
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                onSaveDraft();
                return;
            }

            // Ctrl+Enter — Add item (or finalize if no active edit)
            if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                if (isEditing) {
                    onAddItem();
                } else if (itemCount > 0) {
                    onFinalize();
                }
                return;
            }

            // Enter — Add item (only when in an input, not a textarea)
            if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
                const target = e.target as HTMLElement;
                const tagName = target.tagName.toLowerCase();
                // Only trigger on input fields within the item entry form
                if (tagName === "input" && target.closest("[data-item-form]")) {
                    e.preventDefault();
                    onAddItem();
                    return;
                }
            }

            // Escape — Cancel edit / Reset form
            if (e.key === "Escape") {
                e.preventDefault();
                onResetForm();
                return;
            }
        },
        [onSaveDraft, onAddItem, onFinalize, onResetForm, isEditing, itemCount]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}
