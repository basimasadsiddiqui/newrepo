/**
 * ============================================================================
 * PARTY TABLE COMPONENT
 * ============================================================================
 *
 * Displays a list of customers and suppliers.
 * Features:
 * - Sortable columns (Name, Mobile, Type, Balance)
 * - Row actions: Edit, Delete
 * - Balance highlighting:
 *   - Green: Positive (They owe us / Receivable)
 *   - Red: Negative (We owe them / Payable)
 *
 * ============================================================================
 */

import { Party } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Edit2, Trash2 } from "lucide-react";

interface PartyTableProps {
    parties: Party[];
    onEdit: (party: Party) => void;
    onDelete: (id: string, name: string) => void;
    isLoading?: boolean;
}

export default function PartyTable({
    parties,
    onEdit,
    onDelete,
    isLoading = false,
}: PartyTableProps) {
    if (isLoading) {
        return (
            <div className="p-8 text-center text-gray-500 animate-pulse">
                Loading parties...
            </div>
        );
    }

    if (parties.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg">
                No parties found. click "Add Party" to create one.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-sm)]">
            <table className="data-grid w-full">
                <thead>
                    <tr>
                        <th className="w-[40px]">#</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Mobile</th>
                        <th>Address</th>
                        <th className="text-right">Balance (PKR)</th>
                        <th className="w-[100px] text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {parties.map((party, index) => {
                        const balance = parseFloat(party.balance);
                        const isReceivable = balance > 0;
                        const isPayable = balance < 0;

                        return (
                            <tr key={party.id} className="group">
                                <td className="text-gray-400 text-xs">{index + 1}</td>
                                <td className="font-medium text-[var(--maroon)]">
                                    {party.name}
                                </td>
                                <td>
                                    <span
                                        className={`badge ${party.type === "Customer"
                                                ? "bg-blue-50 text-blue-700"
                                                : party.type === "Supplier"
                                                    ? "bg-amber-50 text-amber-700"
                                                    : "bg-purple-50 text-purple-700"
                                            }`}
                                    >
                                        {party.type}
                                    </span>
                                </td>
                                <td className="font-mono text-xs text-gray-600">
                                    {party.mobile || "—"}
                                </td>
                                <td className="text-xs text-gray-500 truncate max-w-[200px]">
                                    {party.address || "—"}
                                </td>
                                <td className="text-right font-mono font-medium">
                                    {balance === 0 ? (
                                        <span className="text-gray-400">-</span>
                                    ) : (
                                        <span
                                            className={
                                                isReceivable
                                                    ? "text-[var(--success)]"
                                                    : "text-[var(--danger)]"
                                            }
                                        >
                                            {formatCurrency(balance)}
                                            <span className="text-[0.65rem] ml-1 uppercase opacity-70">
                                                {isReceivable ? "DR" : "CR"}
                                            </span>
                                        </span>
                                    )}
                                </td>
                                <td className="text-center">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onEdit(party)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                            title="Edit Party"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(party.id, party.name)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                            title="Delete Party"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
