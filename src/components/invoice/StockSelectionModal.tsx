"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Package } from "lucide-react";

interface StockItem {
    id: string;
    sku: string;
    product: {
        name: string;
        category: { name: string } | null;
        imageUrl: string | null;
        metalType?: { id: string; purity: string } | null;
    };
    metalType: { id: string; purity: string } | null;
    grossWeight: number;
    netWeight: number;
    stoneWeight: number;
}

interface StockSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: StockItem) => void;
}

export default function StockSelectionModal({ isOpen, onClose, onSelect }: StockSelectionModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchStock = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch only available items via the API, forcefully bypassing any Next.js caching
            const res = await fetch(`/api/stock?_t=${Date.now()}`, { cache: 'no-store' });
            const json = await res.json();
            if (json.success) {
                let filteredItems = json.data as StockItem[];
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    filteredItems = filteredItems.filter(item =>
                        item.sku?.toLowerCase().includes(term) ||
                        item.product?.name?.toLowerCase().includes(term)
                    );
                }
                setItems(filteredItems);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    // Debounce search
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(fetchStock, 300);
        return () => clearTimeout(timer);
    }, [isOpen, searchTerm, fetchStock]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center"
        }}>
            <div className="card animate-fade-in" style={{ width: "600px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Package size={20} /> Select from Stock
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-ghost"><X size={18} /></button>
                </div>

                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            autoFocus
                            className="form-input pl-9"
                            placeholder="Search by SKU or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-y-auto p-2" style={{ maxHeight: "400px" }}>
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading stock...</div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No available stock found.</div>
                    ) : (
                        <div className="grid gap-2">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onSelect(item)}
                                    className="p-3 rounded border border-gray-100 hover:border-gold hover:bg-yellow-50 cursor-pointer transition-colors flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                            {item.product.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Img</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-800 text-sm">{item.product.name}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span className="font-mono bg-gray-100 px-1 rounded">{item.sku}</span>
                                                <span className="font-medium text-amber-600">{item.metalType?.purity || item.product?.metalType?.purity || ''}</span>
                                                <span>{item.product?.category?.name || 'Jewellery'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-gray-800">{item.netWeight.toFixed(3)} g</div>
                                        <div className="text-xs text-gray-500">Net Wt</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
