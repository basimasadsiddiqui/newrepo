"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

// The constants for accurate conversion
const RATTI_TO_GRAM = 0.1215;
const GRAM_TO_RATTI = 1 / RATTI_TO_GRAM;

interface RattiGramConverterProps {
    grams: number;
    ratti: number;
    onGramsChange: (val: number) => void;
    onRattiChange: (val: number) => void;
    label?: string;
}

export default function RattiGramConverter({
    grams,
    ratti,
    onGramsChange,
    onRattiChange,
    label = "Weight Converter"
}: RattiGramConverterProps) {
    // To prevent infinite loops during synchronization, we track which side is currently being edited.
    const [editSource, setEditSource] = useState<"grams" | "ratti" | null>(null);

    // Sync Grams to Ratti logic
    useEffect(() => {
        if (editSource === "grams") {
            const calculatedRatti = grams * GRAM_TO_RATTI;
            // Round to 3 decimal places to avoid floating point garbage
            const roundedRatti = Number(calculatedRatti.toFixed(3));

            // Only update if it actually changed to prevent infinite loops
            if (Math.abs(roundedRatti - ratti) > 0.001) {
                onRattiChange(roundedRatti);
            }
        }
    }, [grams, editSource, onRattiChange, ratti]);

    // Sync Ratti to Grams logic
    useEffect(() => {
        if (editSource === "ratti") {
            const calculatedGrams = ratti * RATTI_TO_GRAM;
            // Round to 3 decimal places
            const roundedGrams = Number(calculatedGrams.toFixed(3));

            if (Math.abs(roundedGrams - grams) > 0.001) {
                onGramsChange(roundedGrams);
            }
        }
    }, [ratti, editSource, onGramsChange, grams]);

    const handleGramsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditSource("grams");
        const val = parseFloat(e.target.value);
        onGramsChange(isNaN(val) ? 0 : val);
    };

    const handleRattiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditSource("ratti");
        const val = parseFloat(e.target.value);
        onRattiChange(isNaN(val) ? 0 : val);
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 w-full max-w-sm">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <ArrowLeftRight size={12} />
                    {label}
                </span>
                <span className="text-[10px] text-gray-400">1 Ratti = 0.1215g</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Grams</label>
                    <input
                        type="number"
                        className="form-input w-full h-8 text-sm"
                        value={Number(grams).toString()} // Convert to string to avoid 0 padding issues when editing
                        onChange={handleGramsChange}
                        onFocus={() => setEditSource("grams")}
                        onBlur={() => setEditSource(null)}
                        step="0.001"
                        min="0"
                    />
                </div>

                <div className="text-gray-300 font-bold mt-4">⇄</div>

                <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Ratti</label>
                    <input
                        type="number"
                        className="form-input w-full h-8 text-sm"
                        value={Number(ratti).toString()}
                        onChange={handleRattiChange}
                        onFocus={() => setEditSource("ratti")}
                        onBlur={() => setEditSource(null)}
                        step="0.001"
                        min="0"
                    />
                </div>
            </div>
        </div>
    );
}
