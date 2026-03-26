"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInventoryItem } from "@/lib/actions/inventory";
import { Save, ArrowLeft } from "lucide-react";

interface EditInventoryFormProps {
    item: any;
}

export default function EditInventoryForm({ item }: EditInventoryFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        grossWeight: item.grossWeight,
        netWeight: item.netWeight,
        status: item.status,
        quantity: item.quantity,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'status' ? value : Number(value)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await updateInventoryItem(item.id, formData);
            if (res.success) {
                alert("Item updated successfully!");
                router.push("/inventory/gallery");
                router.refresh();
            } else {
                alert("Failed to update: " + res.error);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card max-w-2xl mx-auto">
            <div className="card-header flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    Edit Inventory Item
                </h3>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn btn-ghost btn-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            </div>

            <div className="card-body space-y-4">
                {/* Product Info (Read Only) */}
                <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-bold text-maroon mb-2">{item.product.name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div><span className="font-semibold">SKU:</span> {item.sku}</div>
                        <div><span className="font-semibold">Category:</span> {item.product.category?.name}</div>
                        <div><span className="font-semibold">Metal:</span> {item.metalType?.name}</div>
                        <div><span className="font-semibold">Design:</span> {item.product.designCode || '-'}</div>
                    </div>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="form-label">Gross Weight</label>
                        <input
                            type="number"
                            step="0.001"
                            name="grossWeight"
                            value={formData.grossWeight}
                            onChange={handleChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Net Weight</label>
                        <input
                            type="number"
                            step="0.001"
                            name="netWeight"
                            value={formData.netWeight}
                            onChange={handleChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Quantity</label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="form-select"
                        >
                            <option value="AVAILABLE">AVAILABLE</option>
                            <option value="SOLD">SOLD</option>
                            <option value="RESERVED">RESERVED</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border mt-4">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <Save className="w-4 h-4" />
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </form>
    );
}
