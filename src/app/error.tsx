"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Application Error:", error);
    }, [error]);

    return (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--maroon)" }}>
            <h2>Something went wrong!</h2>
            <pre style={{
                textAlign: "left",
                background: "#f8d7da",
                color: "#721c24",
                padding: "1rem",
                borderRadius: "4px",
                margin: "20px auto",
                maxWidth: "600px",
                overflow: "auto"
            }}>
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
            </pre>
            <button
                onClick={() => reset()}
                style={{
                    padding: "10px 20px",
                    background: "var(--maroon)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                }}
            >
                Try again
            </button>
        </div>
    );
}
