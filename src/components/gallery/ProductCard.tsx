"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Eye, ShoppingBag } from "lucide-react";
import ProductQuickView from "./ProductQuickView";
import Image from "next/image";

interface ProductCardProps {
    product: any; // Using any for MVP
}

export default function ProductCard({ product }: ProductCardProps) {
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    const isSold = product.status === "SOLD";

    // Handle Image Fallback
    const [imgSrc, setImgSrc] = useState(product.image || "/placeholder.jpg");

    return (
        <>
            <div
                className="group bg-white dark:bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
                onClick={() => setIsQuickViewOpen(true)}
            >
                {/* Image Area */}
                <div className="relative aspect-square bg-muted overflow-hidden">
                    {/* Top Right Quantity Badge */}
                    {product.quantity > 0 && (
                        <div className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold shadow-sm border border-border">
                            Qty: {product.quantity} PP
                        </div>
                    )}

                    {/* Stock Status Badge */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm ${product.status === "AVAILABLE" ? "bg-green-600/90 text-white shadow-sm" :
                            product.status === "SOLD" ? "bg-red-600/90 text-white shadow-sm" :
                                "bg-yellow-600/90 text-white shadow-sm"
                            }`}>
                            {product.status}
                        </span>
                    </div>

                    {/* Image */}
                    <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                        {/* Use standard img for local paths to avoid next/image complexity unless configured */}
                        <img
                            src={imgSrc}
                            alt={product.title}
                            onError={() => setImgSrc("/placeholder.jpg")}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                        <button
                            className="btn btn-sm bg-white text-black hover:bg-white/90 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsQuickViewOpen(true);
                            }}
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Details */}
                <div className="p-4 flex flex-col flex-grow">
                    {/* Title & SKU */}
                    <div className="mb-3">
                        <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate pr-2" title={product.title}>
                                {product.title || "Product Name"}
                            </h3>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {product.sku}
                        </div>
                    </div>

                    {/* Weights Grid */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mb-4 text-gray-600 dark:text-gray-300 bg-muted/30 p-2 rounded-lg border border-border/50">
                        <div className="flex justify-between">
                            <span className="text-[10px] uppercase font-semibold opacity-70">GS WT:</span>
                            <span className="font-mono">{product.grossWeight.toFixed(3)} GM</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] uppercase font-semibold opacity-70">NT WT:</span>
                            <span className="font-mono">{product.netWeight.toFixed(3)} GM</span>
                        </div>
                        <div className="col-span-2 flex justify-between border-t border-border/50 pt-1 mt-1">
                            <span className="text-[10px] uppercase font-semibold opacity-70">MKG CHG:</span>
                            <span className="font-mono">{formatCurrency(product.makingCharges)}</span>
                        </div>
                    </div>

                    <div className="mt-auto">
                        {/* Price */}
                        <div className="mb-3">
                            {/* <span className="block text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Price</span> */}
                            <div className={`text-xl font-bold ${isSold ? "text-muted-foreground line-through decoration-red-500" : "text-primary"}`}>
                                {formatCurrency(product.price)}
                            </div>
                        </div>

                        {/* Action */}
                        <button
                            className="w-full btn btn-sm btn-outline text-xs font-semibold uppercase tracking-wide border-primary/20 hover:bg-primary/5 hover:border-primary text-primary transition-colors"
                            disabled={isSold}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsQuickViewOpen(true);
                            }}
                        >
                            More Details
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick View Modal */}
            <ProductQuickView
                product={product}
                isOpen={isQuickViewOpen}
                onClose={() => setIsQuickViewOpen(false)}
            />
        </>
    );
}
