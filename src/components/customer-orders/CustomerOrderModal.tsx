import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface CustomerOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any | null;
}

export default function CustomerOrderModal({
    isOpen,
    onClose,
    onSave,
    initialData,
}: CustomerOrderModalProps) {
    const [loading, setLoading] = useState(false);

    // Lookups
    const [parties, setParties] = useState<any[]>([]);
    const [karigars, setKarigars] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [metalTypes, setMetalTypes] = useState<any[]>([]);

    const [formData, setFormData] = useState<any>({
        partyId: "",
        customCustomerName: "",
        karigarId: "",
        customKarigarName: "",
        dueDate: "",
        notes: "",
        status: "PENDING",
        items: []
    });

    const [isCustomCustomer, setIsCustomCustomer] = useState(false);
    const [isCustomKarigar, setIsCustomKarigar] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const loadLookups = async () => {
            try {
                const [partiesRes, catsRes, metalsRes] = await Promise.all([
                    fetch("/api/parties"),
                    fetch("/api/categories"),
                    fetch("/api/metal-types")
                ]);

                if (partiesRes.ok) {
                    const pData = await partiesRes.json();
                    if (pData.success) {
                        setParties(pData.data.filter((p: any) => p.type === "Customer" || p.type === "Both"));
                        setKarigars(pData.data.filter((p: any) => p.type === "Supplier" || p.type === "Both"));
                    }
                }

                if (catsRes.ok) {
                    const cData = await catsRes.json();
                    if (cData.success) setCategories(cData.data);
                }

                if (metalsRes.ok) {
                    const mData = await metalsRes.json();
                    if (mData.success) setMetalTypes(mData.data);
                }
            } catch (error) {
                console.error("Failed to load dropdowns");
            }
        };

        loadLookups();
    }, [isOpen]);

    useEffect(() => {
        if (initialData) {
            const hasCustomName = !!initialData.customCustomerName;
            const hasCustomKarigar = !!initialData.customKarigarName;
            setIsCustomCustomer(hasCustomName);
            setIsCustomKarigar(hasCustomKarigar);
            setFormData({
                partyId: initialData.partyId || "",
                customCustomerName: initialData.customCustomerName || "",
                karigarId: initialData.karigarId || "",
                customKarigarName: initialData.customKarigarName || "",
                dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "",
                notes: initialData.notes || "",
                status: initialData.status || "PENDING",
                items: initialData.items?.map((i: any) => ({
                    ...i,
                    id: i.id || crypto.randomUUID()
                })) || []
            });
        } else {
            setIsCustomCustomer(false);
            setIsCustomKarigar(false);
            setFormData({
                partyId: "",
                customCustomerName: "",
                karigarId: "",
                customKarigarName: "",
                dueDate: "",
                notes: "",
                status: "PENDING",
                items: []
            });
        }
    }, [initialData, isOpen]);

    const handleAddItem = () => {
        setFormData((prev: any) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: crypto.randomUUID(),
                    description: "",
                    tagNo: "",
                    categoryId: "",
                    metalTypeId: "",
                    quantity: 1,
                    weight: 0,
                    rate: 0,
                    totalAmount: 0,
                    notes: ""
                }
            ]
        }));
    };

    const handleRemoveItem = (id: string) => {
        setFormData((prev: any) => ({
            ...prev,
            items: prev.items.filter((item: any) => item.id !== id)
        }));
    };

    const handleItemChange = (id: string, field: string, value: any) => {
        setFormData((prev: any) => {
            const newItems = prev.items.map((item: any) => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    // Auto calculate amount if weight or rate changed
                    if (field === 'weight' || field === 'rate') {
                        updated.totalAmount = (Number(updated.weight) || 0) * (Number(updated.rate) || 0);
                    }
                    if (field === 'quantity' && !updated.totalAmount) {
                        // Only basic correlation, if no weight/rate logic
                    }
                    return updated;
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isCustomCustomer && !formData.partyId) {
            toast.error("Please select a registered customer or switch to custom name");
            return;
        }

        if (isCustomCustomer && !formData.customCustomerName.trim()) {
            toast.error("Please enter a custom customer name");
            return;
        }

        if (isCustomKarigar && !formData.customKarigarName.trim()) {
            toast.error("Please enter a custom karigar name");
            return;
        }

        if (formData.items.length === 0) {
            toast.error("Please add at least one item to the order");
            return;
        }

        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-slide-in">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[var(--cream-light)] shrink-0">
                    <h2 className="text-lg font-bold text-[var(--maroon)]">
                        {initialData ? `Edit Order #${initialData.orderNumber}` : "Create Customer Order"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 p-6">
                    <form id="orderForm" onSubmit={handleSubmit} className="space-y-6">

                        {/* Top Section: Order Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="form-group flex flex-col justify-end">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="form-label mb-0">Customer *</label>
                                    {!initialData && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomCustomer(!isCustomCustomer)}
                                            className="text-xs text-[var(--maroon)] hover:underline"
                                        >
                                            {isCustomCustomer ? "Select Existing" : "Enter Custom Name"}
                                        </button>
                                    )}
                                </div>

                                {isCustomCustomer ? (
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Walk-in Customer"
                                        value={formData.customCustomerName}
                                        onChange={(e) => setFormData({ ...formData, customCustomerName: e.target.value, partyId: "" })}
                                        disabled={!!initialData}
                                    />
                                ) : (
                                    <select
                                        className="form-select"
                                        value={formData.partyId}
                                        onChange={(e) => setFormData({ ...formData, partyId: e.target.value, customCustomerName: "" })}
                                        disabled={!!initialData}
                                    >
                                        <option value="">Select Customer...</option>
                                        {parties.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} {p.mobile ? `(${p.mobile})` : ''}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="form-group flex flex-col justify-end">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="form-label mb-0">Karigar (Optional)</label>
                                    {!initialData && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomKarigar(!isCustomKarigar)}
                                            className="text-xs text-[var(--maroon)] hover:underline"
                                        >
                                            {isCustomKarigar ? "Select Existing" : "Enter Custom Name"}
                                        </button>
                                    )}
                                </div>
                                {isCustomKarigar ? (
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Walk-in Karigar"
                                        value={formData.customKarigarName}
                                        onChange={(e) => setFormData({ ...formData, customKarigarName: e.target.value, karigarId: "" })}
                                    />
                                ) : (
                                    <select
                                        className="form-select"
                                        value={formData.karigarId}
                                        onChange={(e) => setFormData({ ...formData, karigarId: e.target.value, customKarigarName: "" })}
                                    >
                                        <option value="">Select Karigar...</option>
                                        {karigars.map(k => (
                                            <option key={k.id} value={k.id}>{k.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Due Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>

                            {initialData && (
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Order Notes / Instructions</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Special instructions for this order..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        {/* Items Section */}
                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">Order Items</h3>
                                <button type="button" onClick={handleAddItem} className="btn btn-secondary text-xs py-1.5 h-auto">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                                </button>
                            </div>

                            {formData.items.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 border border-dashed rounded-lg text-gray-500 text-sm">
                                    No items added yet. Click &quot;Add Item&quot; to begin.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {formData.items.map((item: any, index: number) => (
                                        <div key={item.id} className="flex flex-wrap gap-3 p-3 border rounded-lg bg-gray-50/50 items-start relative group">
                                            <div className="flex-1 min-w-[200px] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">

                                                <div className="col-span-2">
                                                    <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1 block">Description</label>
                                                    <input type="text" className="form-input text-sm px-2 py-1.5 h-auto" placeholder="E.g. Gold Ring" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} />
                                                </div>

                                                <div>
                                                    <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1 block">Tag No</label>
                                                    <input type="text" className="form-input text-sm px-2 py-1.5 h-auto" placeholder="R-123" value={item.tagNo} onChange={(e) => handleItemChange(item.id, 'tagNo', e.target.value)} />
                                                </div>

                                                <div>
                                                    <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1 block">Category</label>
                                                    <select className="form-select text-sm px-2 py-1.5 h-auto py-0" value={item.categoryId} onChange={(e) => handleItemChange(item.id, 'categoryId', e.target.value)}>
                                                        <option value="">None</option>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1 block">Quantity</label>
                                                    <input type="number" min="1" className="form-input text-sm px-2 py-1.5 h-auto" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} />
                                                </div>

                                                <div>
                                                    <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1 block">Weight (g)</label>
                                                    <input type="number" step="0.001" className="form-input text-sm px-2 py-1.5 h-auto" value={item.weight} onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)} />
                                                </div>

                                                <div>
                                                    <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1 block">Amount Est.</label>
                                                    <input type="number" className="form-input text-sm px-2 py-1.5 h-auto bg-white font-medium" value={item.totalAmount} onChange={(e) => handleItemChange(item.id, 'totalAmount', e.target.value)} />
                                                </div>

                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="text-red-400 hover:text-red-600 p-1 mt-5"
                                                title="Remove Item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex justify-end">
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Total Order Value</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        Rs. {formData.items.reduce((sum: number, i: any) => sum + (Number(i.totalAmount) || 0), 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" form="orderForm" className="btn btn-primary" disabled={loading}>
                        {loading ? "Saving..." : initialData ? "Update Order" : "Create Order"}
                    </button>
                </div>

            </div>
        </div>
    );
}
