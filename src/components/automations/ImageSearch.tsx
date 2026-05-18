"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Search, X, Loader2, Package, Sparkles, SlidersHorizontal, ImageIcon } from "lucide-react";
import { puterImageAnalysis } from "@/hooks/usePuterAgent";

interface Category { id: string; name: string; }
interface MetalType { id: string; name: string; purity: string; }
interface InventoryResult {
    id: string; sku: string;
    grossWeight: string | number; netWeight: string | number;
    retailPrice: string | number; quantity: number; location?: string;
    product: {
        name: string; description?: string; designCode?: string; imageUrl?: string;
        category: { name: string }; metalType: { name: string; purity: string };
    };
}

interface Props { isOnline: boolean; puterModel?: string | null; }

export default function ImageSearch({ isOnline, puterModel }: Props) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [metalTypes, setMetalTypes] = useState<MetalType[]>([]);
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<InventoryResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterMetal, setFilterMetal] = useState("");
    const [filterKeyword, setFilterKeyword] = useState("");
    const [showFilters, setShowFilters] = useState(!isOnline);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch("/api/automations/image-search")
            .then((r) => r.json())
            .then((d) => {
                if (d.success) { setCategories(d.categories); setMetalTypes(d.metalTypes); }
            }).catch(() => {});
    }, []);

    const handleFile = (file: File) => {
        if (!file.type.startsWith("image/")) { setError("Please upload an image file."); return; }
        setImage(file); setError(""); setResults([]); setHasSearched(false); setDetectedKeywords([]);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, []);

    const searchByImage = async () => {
        if (!image || !imagePreview) return;
        setIsSearching(true); setError("");
        try {
            // Puter.js path — analyze image in browser using the data URI directly
            if (puterModel) {
                // Use Puter's image API — passes the data URI directly as the image argument
                const visionPrompt = `Analyze this jewelry image and respond with JSON only. No explanation, just valid JSON:
{"type":"ring|necklace|bracelet|earring|pendant|chain|bangle|set|tikka|jhumka|other","metal":"gold|silver|other","metalColor":"yellow|white|rose|plain","hasStones":true,"stoneTypes":["diamond","ruby","emerald","pearl","other"],"style":"bridal|casual|traditional|modern","keywords":["up to 4 short search keywords"]}`;
                const rawJson = await puterImageAnalysis(imagePreview, visionPrompt, puterModel);
                let attrs: Record<string, unknown> = {};
                try { const m = rawJson.match(/\{[\s\S]*\}/); if (m) attrs = JSON.parse(m[0]); } catch { /* ignore */ }

                const keywords = [
                    attrs.type,
                    attrs.metalColor === "yellow" ? "gold" : attrs.metalColor === "white" ? "white gold" : attrs.metal,
                    ...(Array.isArray(attrs.stoneTypes) ? attrs.stoneTypes as string[] : []),
                    ...(Array.isArray(attrs.keywords) ? attrs.keywords as string[] : []),
                ].filter(Boolean).join(" ");

                const invRes = await fetch(`/api/automations/image-search?keyword=${encodeURIComponent(keywords)}`);
                const invData = await invRes.json();
                setResults(invData.results ?? []);
                setDetectedKeywords(Array.isArray(attrs.keywords) ? attrs.keywords as string[] : []);
                setHasSearched(true);
                setIsSearching(false);
                return;
            }

            const base64 = imagePreview.split(",")[1];
            const res = await fetch("/api/automations/image-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64: base64, mediaType: image.type }),
            });
            const data = await res.json();
            if (!data.success && data.error === "offline") {
                setShowFilters(true);
                setError("AI offline — use the filters below to search manually.");
            } else if (data.success) {
                setResults(data.results); setDetectedKeywords(data.detectedKeywords ?? []); setHasSearched(true);
            } else {
                setError(data.error ?? "Search failed.");
            }
        } catch { setError("Connection error. Please try again."); }
        setIsSearching(false);
    };

    const searchByFilters = async () => {
        setIsSearching(true); setError("");
        try {
            const params = new URLSearchParams();
            if (filterCategory) params.set("categoryId", filterCategory);
            if (filterMetal) params.set("metalTypeId", filterMetal);
            if (filterKeyword.trim()) params.set("keyword", filterKeyword.trim());
            const res = await fetch(`/api/automations/image-search?${params}`);
            const data = await res.json();
            if (data.success) { setResults(data.results); setHasSearched(true); }
        } catch { setError("Filter search failed."); }
        setIsSearching(false);
    };

    const clearImage = () => {
        setImage(null); setImagePreview(""); setResults([]); setHasSearched(false);
        setDetectedKeywords([]); setError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-5">
            {/* Mode + toggle */}
            <div className="flex items-center justify-between">
                <span className={`badge ${isOnline ? "badge-finalized" : "badge-draft"}`}>
                    <Sparkles size={10} />
                    {isOnline ? "AI Vision Mode" : "Offline — Filter Search"}
                </span>
                {isOnline && (
                    <button
                        onClick={() => setShowFilters((v) => !v)}
                        className="btn btn-ghost text-xs gap-1.5"
                        style={{ height: 28, padding: "0 10px" }}>
                        <SlidersHorizontal size={12} />
                        {showFilters ? "Hide Filters" : "Manual Filters"}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: Upload + Filters */}
                <div className="space-y-4">
                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => !image && fileInputRef.current?.click()}
                        className="rounded-xl overflow-hidden relative flex items-center justify-center transition-all"
                        style={{
                            minHeight: 180, cursor: image ? "default" : "pointer",
                            border: `2px dashed ${isDragging ? "var(--gold)" : image ? "rgba(30,124,74,0.4)" : "var(--border)"}`,
                            background: isDragging ? "rgba(201,168,76,0.05)" : "var(--cream-light)",
                        }}>
                        {imagePreview ? (
                            <>
                                <img src={imagePreview} alt="Preview"
                                    style={{ width: "100%", maxHeight: 240, objectFit: "contain" }} />
                                <button onClick={(e) => { e.stopPropagation(); clearImage(); }}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                                    style={{ background: "var(--maroon)", color: "white", border: "none", cursor: "pointer" }}>
                                    <X size={13} />
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-6 space-y-2">
                                <ImageIcon size={32} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
                                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                                    Drop a jewelry photo here
                                </p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>or click to browse</p>
                            </div>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

                    {isOnline && !showFilters && (
                        <button onClick={searchByImage} disabled={!image || isSearching}
                            className="btn btn-secondary w-full">
                            {isSearching
                                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Analyzing with AI...</>
                                : <><Sparkles size={14} /> Analyze & Find Matches</>
                            }
                        </button>
                    )}

                    {/* Filters */}
                    {showFilters && (
                        <div className="card">
                            <div className="card-header">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal size={14} style={{ color: "var(--gold-dark)" }} />
                                    <h3>Filter Search</h3>
                                </div>
                            </div>
                            <div className="card-body space-y-3">
                                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                                    className="form-select">
                                    <option value="">All Categories</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select value={filterMetal} onChange={(e) => setFilterMetal(e.target.value)}
                                    className="form-select">
                                    <option value="">All Metal Types</option>
                                    {metalTypes.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.purity})</option>)}
                                </select>
                                <input type="text" value={filterKeyword}
                                    onChange={(e) => setFilterKeyword(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") searchByFilters(); }}
                                    placeholder="Keyword — e.g. jhumka, ruby, bridal..."
                                    className="form-input" />
                                <button onClick={searchByFilters} disabled={isSearching}
                                    className="btn btn-primary w-full">
                                    {isSearching
                                        ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Searching...</>
                                        : <><Search size={14} /> Search Inventory</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-sm px-3 py-2 rounded-lg"
                            style={{ background: "var(--warning-bg)", border: "1px solid rgba(217,119,6,0.2)", color: "var(--warning)" }}>
                            {error}
                        </div>
                    )}

                    {detectedKeywords.length > 0 && (
                        <div className="p-3 rounded-lg space-y-2"
                            style={{ background: "var(--info-bg)", border: "1px solid rgba(29,95,173,0.15)" }}>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--info)" }}>
                                AI Detected
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {detectedKeywords.map((k) => (
                                    <span key={k} className="badge badge-info">{k}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Results */}
                <div>
                    {!hasSearched ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 py-16"
                            style={{ color: "var(--text-muted)" }}>
                            <Upload size={36} style={{ opacity: 0.3 }} />
                            <p className="text-sm text-center">
                                {isOnline ? "Upload a jewelry photo to find matching items" : "Use filters on the left to search inventory"}
                            </p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 py-16"
                            style={{ color: "var(--text-muted)" }}>
                            <Package size={36} style={{ opacity: 0.3 }} />
                            <p className="text-sm">No matching items found in inventory</p>
                            {isOnline && (
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    Try manual filters for a broader search
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                                {results.length} matching item{results.length !== 1 ? "s" : ""} found
                            </p>
                            {results.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                                    style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-xs)")}>
                                    <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                                        style={{ background: "var(--cream-light)", border: "1px solid var(--border)" }}>
                                        {item.product.imageUrl
                                            ? <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                            : <Package size={18} style={{ color: "var(--text-muted)" }} />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                                            {item.product.name}
                                        </p>
                                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                            {item.product.category.name} · {item.product.metalType.name}
                                            {item.product.designCode ? ` · ${item.product.designCode}` : ""}
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                            <span style={{ color: "var(--gold-dark)", fontWeight: 600 }}>{item.sku}</span>
                                            {" · "}{Number(item.grossWeight).toFixed(3)}g
                                            {Number(item.retailPrice) > 0 && (
                                                <> · <span style={{ color: "var(--success)", fontWeight: 600 }}>PKR {Number(item.retailPrice).toLocaleString()}</span></>
                                            )}
                                        </p>
                                    </div>
                                    <span className="badge badge-finalized shrink-0">{item.quantity} avail.</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
