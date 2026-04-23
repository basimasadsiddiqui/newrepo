"use client";

/**
 * CameraCapture – local-hosted ERP photo capture
 *
 * Priority order:
 * 1. Enumerate all video input devices via getUserMedia.
 *    This works for USB webcams AND phones connected as webcams
 *    (using DroidCam, EpocCam, iVCam, or Android 14+ native USB webcam mode).
 * 2. File upload fallback (always available).
 *
 * NOTE: For Android USB webcam mode you need the phone to expose itself as a
 * UVC device.  Most Android 14+ phones support this natively in Developer Options.
 * On older phones: DroidCam (free) or similar app.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Upload, X, RefreshCw, Smartphone, Monitor } from "lucide-react";

interface CameraCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (dataUrl: string) => void;
    onFileUpload: (dataUrl: string) => void;
}

interface VideoDevice {
    deviceId: string;
    label: string;
    kind: MediaDeviceKind;
}

type Mode = "select" | "camera" | "upload";

export default function CameraCapture({ isOpen, onClose, onCapture, onFileUpload }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mode, setMode] = useState<Mode>("select");
    const [devices, setDevices] = useState<VideoDevice[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [cameraError, setCameraError] = useState<string>("");
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Enumerate video input devices
    const loadDevices = useCallback(async () => {
        try {
            // Must request permissions first; labels are empty without a stream
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
            tempStream.getTracks().forEach(t => t.stop());

            const all = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = all
                .filter(d => d.kind === "videoinput")
                .map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || `Camera ${d.deviceId.slice(0, 6)}`,
                    kind: d.kind,
                }));
            setDevices(videoInputs);
            if (videoInputs.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(videoInputs[0].deviceId);
            }
        } catch {
            setCameraError("Camera permission denied. Use file upload below.");
        }
    }, [selectedDeviceId]);

    useEffect(() => {
        if (isOpen) {
            setMode("select");
            setCapturedImage(null);
            setCameraError("");
            loadDevices();
        } else {
            stopStream();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const startCamera = async (deviceId?: string) => {
        stopStream();
        setIsLoading(true);
        setCameraError("");
        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                    : { width: { ideal: 1280 }, height: { ideal: 720 } },
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setMode("camera");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Camera error";
            setCameraError(`Could not open camera: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedImage(dataUrl);
        stopStream();
    };

    const handleConfirmCapture = () => {
        if (capturedImage) onCapture(capturedImage);
    };

    const handleRetake = () => {
        setCapturedImage(null);
        startCamera(selectedDeviceId);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") onFileUpload(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleClose = () => {
        stopStream();
        setCapturedImage(null);
        setMode("select");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div style={{
                background: "var(--card-bg, #fff)",
                borderRadius: 10,
                width: "min(520px, 96vw)",
                maxHeight: "90vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--cream)",
                }}>
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 8 }}>
                        <Camera size={15} style={{ color: "var(--gold-dark)" }} />
                        Add Item Photo
                    </span>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={handleClose}>
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
                    {/* ── Device / Mode selector ── */}
                    {mode === "select" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {cameraError && (
                                <div style={{
                                    padding: "8px 12px",
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: 6,
                                    color: "#dc2626",
                                    fontSize: "0.8125rem",
                                }}>
                                    {cameraError}
                                </div>
                            )}

                            {devices.length > 0 && (
                                <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>
                                        Available cameras ({devices.length})
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        {devices.map((d, i) => {
                                            const isPhone = d.label.toLowerCase().includes("droid") ||
                                                d.label.toLowerCase().includes("ivcam") ||
                                                d.label.toLowerCase().includes("epoc") ||
                                                d.label.toLowerCase().includes("phone");
                                            return (
                                                <button
                                                    key={d.deviceId}
                                                    onClick={() => {
                                                        setSelectedDeviceId(d.deviceId);
                                                        startCamera(d.deviceId);
                                                    }}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 10,
                                                        padding: "10px 14px",
                                                        background: selectedDeviceId === d.deviceId ? "rgba(201,168,76,0.08)" : "var(--cream-light)",
                                                        border: `1px solid ${selectedDeviceId === d.deviceId ? "var(--gold)" : "var(--border)"}`,
                                                        borderRadius: 6,
                                                        cursor: "pointer",
                                                        textAlign: "left",
                                                        fontSize: "0.8125rem",
                                                    }}
                                                >
                                                    {isPhone
                                                        ? <Smartphone size={18} style={{ color: "var(--gold-dark)", flexShrink: 0 }} />
                                                        : <Monitor size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{d.label}</div>
                                                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                                            {isPhone ? "USB / wireless phone camera" : `Camera ${i + 1}`}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* USB webcam help */}
                            {!cameraError && devices.length > 0 && (
                                <div style={{
                                    fontSize: "0.7rem",
                                    color: "var(--text-muted)",
                                    padding: "6px 10px",
                                    background: "rgba(201,168,76,0.05)",
                                    borderRadius: 4,
                                    border: "1px solid rgba(201,168,76,0.15)",
                                }}>
                                    <strong>Phone via USB:</strong> Enable "USB Webcam" in Android 14+ Developer Options,
                                    or install DroidCam / iVCam on your phone — it will appear as a camera above.
                                </div>
                            )}

                            {/* File upload */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>
                                    — or upload a file —
                                </div>
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ justifyContent: "flex-start", gap: 8 }}
                                >
                                    <Upload size={14} /> Choose from computer / phone gallery
                                </button>
                                {/* Mobile: capture="environment" opens rear camera on phones */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                />
                            </div>

                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={loadDevices}
                                style={{ alignSelf: "flex-start", color: "var(--text-muted)" }}
                            >
                                <RefreshCw size={12} /> Refresh camera list
                            </button>
                        </div>
                    )}

                    {/* ── Camera live view ── */}
                    {mode === "camera" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {isLoading && (
                                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                                    Starting camera…
                                </div>
                            )}

                            {capturedImage ? (
                                // Preview captured image
                                <div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={capturedImage}
                                        alt="Captured"
                                        style={{ width: "100%", borderRadius: 6, border: "1px solid var(--border)" }}
                                    />
                                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                        <button className="btn btn-primary" onClick={handleConfirmCapture} style={{ flex: 1 }}>
                                            Use this photo
                                        </button>
                                        <button className="btn btn-ghost" onClick={handleRetake}>
                                            <RefreshCw size={13} /> Retake
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        style={{
                                            width: "100%",
                                            borderRadius: 6,
                                            background: "#000",
                                            border: "1px solid var(--border)",
                                            maxHeight: "340px",
                                            objectFit: "cover",
                                        }}
                                    />
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleCapture}
                                            style={{ flex: 1 }}
                                            disabled={isLoading}
                                        >
                                            <Camera size={14} /> Capture
                                        </button>
                                        <button className="btn btn-ghost" onClick={() => { stopStream(); setMode("select"); }}>
                                            Back
                                        </button>
                                    </div>
                                    {/* Device switcher */}
                                    {devices.length > 1 && (
                                        <select
                                            className="form-select"
                                            value={selectedDeviceId}
                                            onChange={e => {
                                                setSelectedDeviceId(e.target.value);
                                                startCamera(e.target.value);
                                            }}
                                            style={{ fontSize: "0.75rem" }}
                                        >
                                            {devices.map(d => (
                                                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                                            ))}
                                        </select>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>
            </div>
        </div>
    );
}
