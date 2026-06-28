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
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                onSaveDraft();
                return;
            }

            if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                if (isEditing) {
                    onAddItem();
                } else if (itemCount > 0) {
                    onFinalize();
                }
                return;
            }

            // Enter → next field; Shift+Enter → previous field (mirrors Tab / Shift+Tab)
            if (e.key === "Enter" && !e.ctrlKey) {
                const target = e.target as HTMLElement;
                const tagName = target.tagName.toLowerCase();
                if (tagName === "input" || tagName === "select" || tagName === "textarea") {
                    e.preventDefault();
                    const focusable = Array.from(
                        document.querySelectorAll<HTMLElement>(
                            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
                        )
                    ).filter((el) => el.offsetParent !== null);
                    const idx = focusable.indexOf(target);
                    if (idx < 0) return;
                    const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
                    if (nextIdx >= 0 && nextIdx < focusable.length) {
                        focusable[nextIdx].focus();
                    }
                    return;
                }
            }

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
