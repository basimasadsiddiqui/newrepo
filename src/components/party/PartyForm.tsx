/**
 * ============================================================================
 * PARTY FORM COMPONENT
 * ============================================================================
 *
 * Modal form to add or edit a party.
 * Features:
 * - Controlled inputs for Name, Mobile, Address, Type
 * - Validation (Name required)
 * - Loading state during save
 *
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Party } from "@/types";
import { X } from "lucide-react";

interface PartyFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Party>) => Promise<void>;
    initialData?: Party | null;
}

export default function PartyForm({
    isOpen,
    onClose,
    onSave,
    initialData,
}: PartyFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        mobile: "",
        address: "",
        type: "Customer" as "Customer" | "Supplier" | "Both",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Reset form when opened or initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                mobile: initialData.mobile || "",
                address: initialData.address || "",
                type: initialData.type,
            });
        } else {
            setFormData({
                name: "",
                mobile: "",
                address: "",
                type: "Customer",
            });
        }
        setError("");
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError("Name is required");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await onSave(formData);
            onClose();
        } catch (err) {
            setError("Failed to save party. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-slide-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[var(--cream-light)]">
                    <h2 className="text-lg font-bold text-[var(--maroon)]">
                        {initialData ? "Edit Party" : "Add New Party"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div className="form-group">
                        <label className="form-label">Name *</label>
                        <input
                            type="text"
                            autoFocus
                            className="form-input"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    {/* Mobile */}
                    <div className="form-group">
                        <label className="form-label">Mobile</label>
                        <input
                            type="text"
                            className="form-input font-mono"
                            value={formData.mobile}
                            onChange={(e) =>
                                setFormData({ ...formData, mobile: e.target.value })
                            }
                            placeholder="0300-1234567"
                        />
                    </div>

                    {/* Type */}
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <div className="flex gap-4 mt-1">
                            {["Customer", "Supplier", "Both"].map((type) => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="partyType"
                                        className="accent-[var(--maroon)] w-4 h-4"
                                        checked={formData.type === type}
                                        onChange={() =>
                                            setFormData({
                                                ...formData,
                                                type: type as "Customer" | "Supplier" | "Both",
                                            })
                                        }
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {type}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea
                            className="form-input h-24 py-2 resize-none"
                            value={formData.address}
                            onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                            }
                            placeholder="Full address..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : initialData ? "Update Party" : "Create Party"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
