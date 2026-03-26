"use client";

import React from "react";

export default function PrintButton({ label = "Print", className = "" }: { label?: string; className?: string }) {
    return (
        <button
            onClick={() => window.print()}
            className={`bg-blue-600 font-sans text-white px-3 py-1 rounded text-sm hover:bg-blue-700 ${className}`}
        >
            {label}
        </button>
    );
}
