"use client";

import { X, Scale, Calculator, ShoppingBag, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProductQuickViewProps {
    product: {
        id: string;
        title: string;
        sku: string;
        designCode?: string | null;
        image?: string | null;
        status: string;
        grossWeight: number;
        netWeight: number;
        purity?: string | null;
        priceBreakdown?: {
            metalValue?: number;
            wastageAmount?: number;
        } | null;
        makingCharges?: number;
        price: number;
    } | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ProductQuickView({ product, isOpen, onClose }: ProductQuickViewProps) {
    const router = useRouter();
    const [isAdding, setIsAdding] = useState(false);

    if (!isOpen || !product) return null;

    const handleAddToInvoice = () => {
        setIsAdding(true);
        const itemId = typeof product.id === "string" ? product.id : "";
        if (!itemId) {
            setIsAdding(false);
            return;
        }
        router.push(`/?type=SALE&stockItemId=${encodeURIComponent(itemId)}&autoAdd=1`);
    };

    const handleEdit = () => {
        router.push(`/inventory/edit/${product.id}`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image Section */}
                <div className="md:w-1/2 bg-secondary/10 p-8 flex items-center justify-center relative min-h-[400px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={product.image || "/placeholder.jpg"}
                        alt={product.title}
                        className="w-full h-full object-contain mix-blend-normal hover:scale-105 transition-transform duration-500"
                        onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                    />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm ${product.status === "AVAILABLE" ? "bg-green-600 text-white" :
                            product.status === "SOLD" ? "bg-red-600 text-white" :
                                "bg-yellow-600 text-white"
                            }`}>
                            {product.status}
                        </span>
                    </div>
                    {/* Add Close button for mobile inside image area if needed, but we have one on top right */}
                </div>

                {/* Details Section */}
                <div className="md:w-1/2 p-8 flex flex-col bg-white dark:bg-card">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">
                                {product.title}
                            </h2>
                            <p className="text-muted-foreground mt-1 font-mono text-sm">
                                SKU: <span className="text-foreground">{product.sku}</span>
                                {product.designCode && <> • Design: <span className="text-foreground">{product.designCode}</span></>}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Specifications */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {/* Weight Card */}
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                            <div className="flex items-center gap-2 mb-3 text-gold-dark">
                                <Scale className="w-4 h-4" />
                                <span className="font-semibold text-xs uppercase tracking-wide">Weights</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Gross</span>
                                    <span className="font-mono">{product.grossWeight.toFixed(3)} g</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Net</span>
                                    <span className="font-mono font-bold text-foreground">{product.netWeight.toFixed(3)} g</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 mt-1">
                                    <span>Purity</span>
                                    <span>{product.purity}</span>
                                </div>
                            </div>
                        </div>

                        {/* Price Card */}
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                            <div className="flex items-center gap-2 mb-3 text-gold-dark">
                                <Calculator className="w-4 h-4" />
                                <span className="font-semibold text-xs uppercase tracking-wide">Breakdown</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Metal</span>
                                    <span className="font-mono">{formatCurrency(product.priceBreakdown?.metalValue || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Making</span>
                                    <span className="font-mono">{formatCurrency(product.makingCharges || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 mt-1">
                                    <span>Wastage</span>
                                    <span>{formatCurrency(product.priceBreakdown?.wastageAmount || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-auto pt-6 border-t border-border">
                        <div className="flex items-end justify-between mb-6">
                            <div>
                                <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Final Price</span>
                                <div className="text-3xl font-bold text-primary">
                                    {formatCurrency(product.price)}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                className={`flex-1 btn btn-primary py-3 rounded-lg font-semibold text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2 ${isAdding ? "opacity-75 cursor-wait" : ""}`}
                                onClick={handleAddToInvoice}
                                disabled={isAdding || product.status === "SOLD"}
                            >
                                <ShoppingBag className="w-5 h-5" />
                                {isAdding ? "Adding..." : "Add to Invoice"}
                            </button>
                            <button
                                className="px-4 py-3 rounded-lg border border-border font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2 text-foreground"
                                onClick={handleEdit}
                            >
                                <Edit className="w-5 h-5" />
                                Edit
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
