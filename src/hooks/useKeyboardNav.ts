/**
 * ============================================================================
 * Keyboard Navigation Hook – Invoice Module
 * ============================================================================
 *
 * Provides keyboard shortcuts for fast data entry:
 * - Ctrl+S → Save draft
 * - Ctrl+Enter → Add item / Finalize
 * - Enter → Move focus to next field (same as Tab)
 * - Escape → Cancel edit / Reset form
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

            // Enter — move to next focusable field (like Tab)
            if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
                const target = e.target as HTMLElement;
                const tagName = target.tagName.toLowerCase();
                if (tagName === "input" || tagName === "select") {
                    e.preventDefault();
                    const focusable = Array.from(
                        document.querySelectorAll<HTMLElement>(
                            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
                        )
                    ).filter(el => el.offsetParent !== null);
                    const idx = focusable.indexOf(target);
                    if (idx >= 0 && idx < focusable.length - 1) {
                        focusable[idx + 1].focus();
                    }
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
