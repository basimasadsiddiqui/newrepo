"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { manualUpdateMetalRate } from "@/lib/actions/metalRates";
import type { MetalTypeEnum } from "@/lib/services/metalRateService";

type MetalRateDisplay = {
    id: string;
    orgId: string;
    metal: string;
    ratePerGram: number; // passed as number from service layer
    lastUpdated: Date;
    source: string;
    updatedBy: string | null;
};

export default function MetalRateManager({
    initialRates,
    initialPremium
}: {
    initialRates: MetalRateDisplay[],
    initialPremium: number
}) {
    const [rates, setRates] = useState<MetalRateDisplay[]>(initialRates);
    const [premium, setPremium] = useState<number>(initialPremium);
    const [isEditingPremium, setIsEditingPremium] = useState(false);
    const [newPremium, setNewPremium] = useState<string>("");

    const [editingMetal, setEditingMetal] = useState<MetalTypeEnum | null>(null);
    const [newRate, setNewRate] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState(false);

    const handleEditClick = (metal: MetalTypeEnum, currentRate: number) => {
        setEditingMetal(metal);
        setNewRate(currentRate.toString());
    };

    const handleCancelEdit = () => {
        setEditingMetal(null);
        setNewRate("");
    };

    const handleEditPremiumClick = () => {
        setIsEditingPremium(true);
        setNewPremium(premium.toString());
    };

    const handleCancelPremiumEdit = () => {
        setIsEditingPremium(false);
        setNewPremium("");
    };

    const handleSave = async (metal: MetalTypeEnum) => {
        const rateValue = parseFloat(newRate);
        if (isNaN(rateValue) || rateValue <= 0) {
            toast.error("Please enter a valid rate greater than 0");
            return;
        }

        setIsUpdating(true);
        try {
            const res = await manualUpdateMetalRate(metal, rateValue);
            if (res.success && res.data) {
                toast.success(`${metal} rate updated manually!`);

                const updatedData = res.data; // Store safely

                // Update local state without full reload
                setRates(prevRates => {
                    const existingIndex = prevRates.findIndex(r => r.metal === metal);

                    // We know res.data has ratePerGram, but map it fully to match MetalRateDisplay
                    const updatedDisplay: MetalRateDisplay = {
                        id: updatedData.id || `temp-${Date.now()}`,
                        orgId: updatedData.orgId || "org-default-001",
                        metal: updatedData.metal || metal,
                        ratePerGram: (updatedData.ratePerGram as any).toNumber ? (updatedData.ratePerGram as any).toNumber() : Number(updatedData.ratePerGram),
                        lastUpdated: updatedData.lastUpdated || new Date(),
                        source: updatedData.source || "MANUAL",
                        updatedBy: updatedData.updatedBy || "Admin"
                    };

                    if (existingIndex >= 0) {
                        const newArray = [...prevRates];
                        newArray[existingIndex] = updatedDisplay;
                        return newArray;
                    } else {
                        return [...prevRates, updatedDisplay];
                    }
                });
                setEditingMetal(null);
            } else {
                toast.error(res.error || "Failed to update rate");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("A network error occurred.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSavePremium = async () => {
        const premiumValue = parseFloat(newPremium);
        if (isNaN(premiumValue)) {
            toast.error("Please enter a valid premium percentage");
            return;
        }

        setIsUpdating(true);
        try {
            // We need to import updateLocalPremium dynamically or ensure it's imported at the top
            const { updateLocalPremium } = await import("@/lib/actions/metalRates");
            const res = await updateLocalPremium(premiumValue);

            if (res.success && res.data !== undefined) {
                toast.success(`Local Market Premium updated to ${res.data}%!`);
                setPremium(res.data);
                setIsEditingPremium(false);
            } else {
                toast.error(res.error || "Failed to update premium");
            }
        } catch (error) {
            console.error("Save premium error:", error);
            toast.error("A network error occurred.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleTriggerCron = async () => {
        setIsUpdating(true);
        const toastId = toast.loading("Fetching live rates from API...");
        try {
            const res = await fetch('/api/metal-rates/update');
            const data = await res.json();

            if (res.ok && data.success) {
                toast.success("Live rates synced successfully!", { id: toastId });
                // We should ideally re-fetch or reload the page to get the new rates. 
                // For now, a simple reload works perfectly for an admin tool.
                window.location.reload();
            } else {
                toast.error(`Sync failed: ${data.error}`, { id: toastId });
            }
        } catch (error) {
            toast.error("Failed to connect to sync API", { id: toastId });
        } finally {
            setIsUpdating(false);
        }
    };

    const getMetalName = (code: string) => {
        switch (code) {
            case "XAU": return "Gold (24K)";
            case "XAG": return "Silver (999)";
            case "DIA": return "Diamond (Per Carat)";
            default: return code;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto mt-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-maroon">Metal Rates Management</h2>
                    <p className="text-gray-500 text-sm mt-1">Manage daily pricing for gold, silver, and diamonds.</p>
                </div>
                <button
                    onClick={handleTriggerCron}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    Sync Live API Rates
                </button>
            </div>

            {/* Premium Configuration Card */}
            <div className="mb-6 bg-orange-50/50 border border-orange-100 rounded-lg p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-orange-900 border-b border-orange-200/50 pb-2 mb-3 inline-block">Market Premium Configuration</h3>
                        <p className="text-xs text-orange-700 mb-2 max-w-xl">
                            The Sarafa Bazaar trades higher than the raw international spot price. This percentage is automatically added to the base International API rate every time the CRON runs.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm font-medium text-gray-700">Current Premium Margin:</span>
                    {isEditingPremium ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.01"
                                value={newPremium}
                                onChange={(e) => setNewPremium(e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-orange-300 rounded focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                                autoFocus
                            />
                            <span className="text-gray-500 text-sm">%</span>
                            <button onClick={handleCancelPremiumEdit} disabled={isUpdating} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800">Cancel</button>
                            <button onClick={handleSavePremium} disabled={isUpdating} className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 font-medium shadow-sm">Save</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-orange-600">
                                {premium > 0 ? "+" : ""}{premium}%
                            </span>
                            <button
                                onClick={handleEditPremiumClick}
                                disabled={isUpdating}
                                className="text-sm text-orange-700 hover:text-orange-900 underline underline-offset-2"
                            >
                                Edit Premium Config
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-100">
                            <th className="py-3 px-4 font-semibold text-gray-700">Metal</th>
                            <th className="py-3 px-4 font-semibold text-gray-700">Rate (PKR)</th>
                            <th className="py-3 px-4 font-semibold text-gray-700">Source</th>
                            <th className="py-3 px-4 font-semibold text-gray-700">Last Updated</th>
                            <th className="py-3 px-4 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {["XAU", "XAG", "DIA"].map((metalCode) => {
                            const rateRecord = rates.find(r => r.metal === metalCode);
                            const isEditing = editingMetal === metalCode;
                            const isRateFound = !!rateRecord;

                            return (
                                <tr key={metalCode} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-4 font-medium text-gray-900">
                                        {getMetalName(metalCode)}
                                    </td>

                                    <td className="py-4 px-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={newRate}
                                                onChange={(e) => setNewRate(e.target.value)}
                                                className="w-32 px-3 py-1.5 border border-gray-300 rounded focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="text-lg font-semibold text-slate-800">
                                                {isRateFound ? `₨ ${(rateRecord.ratePerGram < 100000 ? rateRecord.ratePerGram * 11.664 : rateRecord.ratePerGram).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "Not Set"}
                                                <span className="text-sm text-gray-500 font-normal ml-1">
                                                    /{metalCode === "DIA" ? "ct" : "Tola"}
                                                </span>
                                            </span>
                                        )}
                                    </td>

                                    <td className="py-4 px-4">
                                        {isRateFound && !isEditing && (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rateRecord.source === 'API' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                {rateRecord.source}
                                                {rateRecord.updatedBy && ` (${rateRecord.updatedBy})`}
                                            </span>
                                        )}
                                    </td>

                                    <td className="py-4 px-4 text-sm text-gray-500">
                                        {isRateFound && !isEditing && new Date(rateRecord.lastUpdated).toLocaleString()}
                                    </td>

                                    <td className="py-4 px-4 text-right">
                                        {isEditing ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                                                    disabled={isUpdating}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleSave(metalCode as MetalTypeEnum)}
                                                    className="px-3 py-1 text-sm bg-maroon text-white rounded hover:bg-red-800"
                                                    disabled={isUpdating}
                                                >
                                                    {isUpdating ? "Saving..." : "Save"}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEditClick(metalCode as MetalTypeEnum, rateRecord?.ratePerGram || 0)}
                                                className="text-maroon hover:text-red-800 text-sm font-medium"
                                                disabled={isUpdating}
                                            >
                                                Edit Manually
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 bg-slate-50 p-4 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-slate-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-sm text-slate-600">
                    <strong>Note on Invoice Calculations:</strong> The rates established here are global defaults. However, when an invoice is created, the current global rate is <strong>locked</strong> into that specific invoice. If the global rate changes tomorrow, previous invoices will remain permanently unaffected to maintain ledger integrity.
                </p>
            </div>
        </div>
    );
}
