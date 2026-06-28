/**
 * ============================================================================
 * PARTY STATEMENT / LEDGER PAGE
 * ============================================================================
 * Per-supplier (or customer) statement showing running CASH and GOLD (24k)
 * balances and every ledger entry. Supports recording a gold-return / supplier
 * gold claim that adjusts the gold balance.
 * ============================================================================
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Coins, Wallet } from "lucide-react";
import { formatCurrency, formatWeight } from "@shared/utils";

interface LedgerRow {
    id: string;
    date: string;
    type: "DEBIT" | "CREDIT";
    amount: number;
    balance: number;
    goldWeight: number;
    goldBalance: number;
    narration: string | null;
    invoiceId: string | null;
    orderNumber: number | null;
    invoiceTransactionType: "SALE" | "PURCHASE" | null;
}

interface LedgerData {
    party: { id: string; name: string; mobile: string | null; type: string; balance: number; goldBalance: number };
    entries: LedgerRow[];
}

export default function PartyStatementPage() {
    const params = useParams();
    const id = params?.id as string;

    const [data, setData] = useState<LedgerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [returnGold, setReturnGold] = useState<number>(0);
    const [returnNote, setReturnNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchLedger = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/parties/${id}/ledger`);
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchLedger();
    }, [id, fetchLedger]);

    const submitGoldReturn = async () => {
        if (returnGold <= 0) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/parties/${id}/ledger`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goldWeight: returnGold, narration: returnNote }),
            });
            const json = await res.json();
            if (json.success) {
                setReturnGold(0);
                setReturnNote("");
                await fetchLedger();
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin w-4 h-4" /> Loading statement…
            </div>
        );
    }

    if (!data) {
        return <div className="p-6 text-muted-foreground">Party not found.</div>;
    }

    const { party, entries } = data;

    return (
        <div className="p-6">
            <Link href="/parties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Parties
            </Link>

            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{party.name}</h1>
                    <div className="text-sm text-muted-foreground">{party.type}{party.mobile ? ` · ${party.mobile}` : ""}</div>
                </div>
                <div className="flex gap-3">
                    <div className="bg-card border border-border rounded-lg px-5 py-3 min-w-[160px]">
                        <div className="text-xs uppercase text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Cash Balance</div>
                        <div className={`text-xl font-bold font-mono ${party.balance < 0 ? "text-blue-600" : "text-foreground"}`}>
                            {formatCurrency(Math.abs(party.balance))}
                            <span className="text-xs font-normal text-muted-foreground ml-1">{party.balance < 0 ? "we owe" : party.balance > 0 ? "owes us" : ""}</span>
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-5 py-3 min-w-[160px]">
                        <div className="text-xs uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1"><Coins className="w-3 h-3" /> Gold Balance (24k)</div>
                        <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">{formatWeight(Math.abs(party.goldBalance))}</div>
                    </div>
                </div>
            </div>

            {/* Gold return / supplier claim */}
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
                <div className="text-sm font-semibold mb-2">Record Gold Return / Supplier Claim</div>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Gold returned (g, 24k)</label>
                        <input type="number" min={0} step={0.001} value={returnGold || ""}
                            onChange={(e) => setReturnGold(Number(e.target.value))}
                            placeholder="0.000"
                            className="w-40 px-3 py-2 bg-background border border-border rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-muted-foreground mb-1">Note (optional)</label>
                        <input type="text" value={returnNote}
                            onChange={(e) => setReturnNote(e.target.value)}
                            placeholder="e.g. Gold returned against guarantee shortfall"
                            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <button onClick={submitGoldReturn} disabled={submitting || returnGold <= 0}
                        className="btn btn-primary disabled:opacity-50">
                        {submitting ? "Saving…" : "Record"}
                    </button>
                </div>
            </div>

            {/* Ledger table */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Reference</th>
                                <th className="px-4 py-3 text-right">Gold (24k)</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3 text-right">Gold Balance</th>
                                <th className="px-4 py-3 text-right">Cash Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {entries.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No ledger entries yet.</td></tr>
                            ) : (
                                entries.map((e) => (
                                    <tr key={e.id} className="hover:bg-muted/50">
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{format(new Date(e.date), "dd MMM yyyy")}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.type === "CREDIT" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                                                {e.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {e.orderNumber != null ? (
                                                <Link href={e.invoiceTransactionType === "PURCHASE" ? `/purchase?id=${e.invoiceId}` : `/?id=${e.invoiceId}`} className="text-primary hover:underline">
                                                    #{e.orderNumber}
                                                </Link>
                                            ) : null}
                                            <span className="text-muted-foreground">{e.orderNumber != null && e.narration ? " · " : ""}{e.narration || (e.orderNumber == null ? "—" : "")}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-amber-700 dark:text-amber-400">{e.goldWeight !== 0 ? formatWeight(e.goldWeight) : "—"}</td>
                                        <td className="px-4 py-3 text-right font-mono">{e.amount !== 0 ? formatCurrency(e.amount) : "—"}</td>
                                        <td className="px-4 py-3 text-right font-mono text-amber-700 dark:text-amber-400">{formatWeight(e.goldBalance)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(e.balance)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
