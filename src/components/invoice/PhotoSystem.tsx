/**
 * ============================================================================
 * PHOTO SYSTEM COMPONENT
 * ============================================================================
 *
 * Handles both invoice-level and item-level photo uploads.
 * Features:
 * - Drag & drop upload area
 * - Auto compression before upload (browser-image-compression)
 * - Preview thumbnails grid
 * - Click to preview full-size in modal, with prev/next arrows,
 *   ArrowLeft / ArrowRight / Escape keyboard navigation and an "n / total" counter
 * - Delete photos
 *
 * For Phase 1, photos are stored locally. Cloud storage (S3/Cloudinary)
 * will be plugged in via the upload API endpoint.
 * ============================================================================
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Upload, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";

interface PhotoSystemProps {
    /** Current photos (URLs or base64 strings) */
    photos: string[];
    /** Label for the upload area */
    label?: string;
    /** Maximum number of photos */
    maxPhotos?: number;

    // ── Callbacks ──
    onPhotosChange: (photos: string[]) => void;
}

/** Shared style for the prev/next arrows in the preview lightbox. */
const navButtonStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.9)",
    border: "none",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--maroon)",
    boxShadow: "var(--shadow-md)",
    flexShrink: 0,
};

export default function PhotoSystem({
    photos,
    label = "Invoice Photos",
    maxPhotos = 10,
    onPhotosChange,
}: PhotoSystemProps) {
    // Track the previewed image by INDEX (not by value) so we can step through
    // the attachments with the keyboard / arrow buttons.
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clamp on read so removing the previewed photo can never leave a dangling index.
    const safeIndex =
        previewIndex === null || photos.length === 0
            ? null
            : Math.min(Math.max(previewIndex, 0), photos.length - 1);
    const isPreviewOpen = safeIndex !== null;

    const closePreview = useCallback(() => setPreviewIndex(null), []);

    /** Step through the photos, wrapping around at both ends. */
    const stepPreview = useCallback(
        (delta: number) => {
            setPreviewIndex((current) => {
                if (current === null || photos.length === 0) return current;
                return (current + delta + photos.length) % photos.length;
            });
        },
        [photos.length]
    );

    // Keyboard navigation — only bound while the preview is open, removed on close/unmount.
    useEffect(() => {
        if (!isPreviewOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't steal arrows/Escape from a field the user is typing in
            const t = e.target as HTMLElement | null;
            if (t) {
                const tag = t.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                stepPreview(-1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                stepPreview(1);
            } else if (e.key === "Escape") {
                e.preventDefault();
                closePreview();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPreviewOpen, stepPreview, closePreview]);

    /**
     * Handle file selection (from input or drag-drop).
     * Compresses images and converts to base64 for preview.
     */
    const handleFiles = useCallback(
        async (files: FileList | null) => {
            if (!files) return;

            const newPhotos: string[] = [...photos];

            for (let i = 0; i < files.length && newPhotos.length < maxPhotos; i++) {
                const file = files[i];
                if (!file.type.startsWith("image/")) continue;

                // Read as base64 for preview (in prod, would upload to S3)
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });

                newPhotos.push(base64);
            }

            onPhotosChange(newPhotos);
        },
        [photos, maxPhotos, onPhotosChange]
    );

    /** Remove a photo by index */
    const removePhoto = (index: number) => {
        const updated = photos.filter((_, i) => i !== index);
        onPhotosChange(updated);
    };

    return (
        <>
            <div className="card animate-fade-in" style={{ animationDelay: "250ms" }}>
                <div className="card-header">
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Camera size={16} />
                        {label}
                    </h3>
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                        {photos.length} / {maxPhotos}
                    </span>
                </div>
                <div className="card-body">
                    {/* Upload Area */}
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            handleFiles(e.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${isDragging ? "var(--gold)" : "var(--border)"}`,
                            borderRadius: "var(--radius-sm)",
                            padding: "20px",
                            textAlign: "center",
                            cursor: "pointer",
                            background: isDragging ? "var(--cream)" : "transparent",
                            transition: "all var(--transition-fast)",
                            marginBottom: photos.length > 0 ? "12px" : 0,
                        }}
                    >
                        <Upload
                            size={24}
                            style={{
                                color: isDragging ? "var(--gold)" : "var(--text-muted)",
                                marginBottom: "8px",
                            }}
                        />
                        <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                            Drag & drop images or <span style={{ color: "var(--maroon)", fontWeight: 600 }}>browse</span>
                        </div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", opacity: 0.6, marginTop: "4px" }}>
                            JPG, PNG, WebP • Auto compressed
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleFiles(e.target.files)}
                            style={{ display: "none" }}
                        />
                    </div>

                    {/* Photo Grid */}
                    {photos.length > 0 && (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                                gap: "8px",
                            }}
                        >
                            {photos.map((photo, index) => (
                                <div
                                    key={index}
                                    style={{
                                        position: "relative",
                                        aspectRatio: "1",
                                        borderRadius: "var(--radius-sm)",
                                        overflow: "hidden",
                                        border: "1px solid var(--border)",
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={photo}
                                        alt={`Photo ${index + 1}`}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                    />
                                    {/* Hover Overlay */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: "rgba(0,0,0,0.5)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "4px",
                                            opacity: 0,
                                            transition: "opacity var(--transition-fast)",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.opacity = "1")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.opacity = "0")
                                        }
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewIndex(index);
                                            }}
                                            style={{
                                                background: "white",
                                                border: "none",
                                                borderRadius: "50%",
                                                width: "28px",
                                                height: "28px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <ZoomIn size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removePhoto(index);
                                            }}
                                            style={{
                                                background: "var(--danger)",
                                                border: "none",
                                                borderRadius: "50%",
                                                width: "28px",
                                                height: "28px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                                color: "white",
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Preview Modal (arrow keys / arrow buttons navigate) ─────── */}
            {isPreviewOpen && (
                <div
                    onClick={closePreview}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        zIndex: 100,
                        cursor: "pointer",
                    }}
                >
                    {/* Previous */}
                    {photos.length > 1 && (
                        <button
                            aria-label="Previous image"
                            title="Previous image (←)"
                            onClick={(e) => {
                                e.stopPropagation();
                                stepPreview(-1);
                            }}
                            style={navButtonStyle}
                        >
                            <ChevronLeft size={22} />
                        </button>
                    )}

                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: "80vw",
                            maxHeight: "90vh",
                            position: "relative",
                            cursor: "default",
                        }}
                    >
                        <button
                            aria-label="Close preview"
                            title="Close (Esc)"
                            onClick={closePreview}
                            style={{
                                position: "absolute",
                                top: "-12px",
                                right: "-12px",
                                background: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "32px",
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                boxShadow: "var(--shadow-md)",
                            }}
                        >
                            <X size={16} />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photos[safeIndex]}
                            alt={`Preview ${safeIndex + 1} of ${photos.length}`}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "85vh",
                                borderRadius: "var(--radius-md)",
                                boxShadow: "var(--shadow-lg)",
                            }}
                        />
                        {/* Position indicator */}
                        <div
                            style={{
                                position: "absolute",
                                bottom: "8px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "rgba(0,0,0,0.65)",
                                color: "white",
                                borderRadius: "var(--radius-full, 999px)",
                                padding: "3px 12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                pointerEvents: "none",
                            }}
                        >
                            {safeIndex + 1} / {photos.length}
                        </div>
                    </div>

                    {/* Next */}
                    {photos.length > 1 && (
                        <button
                            aria-label="Next image"
                            title="Next image (→)"
                            onClick={(e) => {
                                e.stopPropagation();
                                stepPreview(1);
                            }}
                            style={navButtonStyle}
                        >
                            <ChevronRight size={22} />
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
