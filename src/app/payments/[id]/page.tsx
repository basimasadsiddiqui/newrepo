"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PaymentStatus, PaymentMode } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, ArrowLeft, Banknote, Clock, AlertTriangle, ShieldCheck, FileText } from "lucide-react";
import { PaymentStatusPill } from "../page"; // Importing the pill we just made
import { Badge } from "@/components/ui/badge";

export default function PaymentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [payment, setPayment] = useState<any>(null);
    const [risk, setRisk] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetail = async () => {
            try {
                // Fetch Payment Data deeply including transactions
                const res = await fetch(`/api/payments/$params.id}`);
                const { data } = await res.json();
                setPayment(data);

                // Fetch Risk Score for the loaded party
                if (data.partyId) {
                    const riskRes = await fetch(`/api/parties/$data.partyId}/risk`);
                    const riskData = await riskRes.json();
                    setRisk(riskData.data);
                }
            } catch (error) {
                console.error("Error fetching payment detail:", error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) loadDetail();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!payment) {
        return <div className="p-12 text-center">Payment not found.</div>;
    }

    const { party, invoice, transactions, reminders } = payment;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/payments")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        Payment Detail
                        <PaymentStatusPill status={payment.status} />
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Invoice Ref: {invoice ? `#INV-$invoice.orderNumber}` : "Manual Entry"}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Party & Risk Info */}
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader className="pb-4 border-b bg-muted/20">
                            <CardTitle className="text-lg">Party Directory</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3">
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground uppercase">Name</p>
                                <p className="text-base font-medium">{party.name}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground uppercase">Category</p>
                                <p className="text-base capitalize">{payment.category.toLowerCase()}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground uppercase">Contact / Address</p>
                                <p className="text-sm">{party.mobile || "N/A"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={
                        risk?.level === "HIGH" ? "border-red-300 bg-red-50/20" :
                            risk?.level === "MEDIUM" ? "border-amber-300 bg-amber-50/20" :
                                "border-emerald-300 bg-emerald-50/20"
                    }>
                        <CardHeader className="pb-3 border-b border-inherit">
                            <CardTitle className="text-sm flex items-center gap-2">
                                {risk?.level === "HIGH" ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                                Dynamic Risk Profiling
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex justify-between items-center">
                            <div>
                                <p className="text-2xl font-bold">{risk?.score}/10</p>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mt-1">Tier: {risk?.level}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">Late Ratio: {(risk?.metrics?.lateRatio * 100).toFixed(0)}%</p>
                                <p className="text-sm text-muted-foreground">Avg Delay: {risk?.metrics?.avgDelayDays.toFixed(1)} days</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Middle Column: Financials & Timeline */}
                <div className="md:col-span-2 flex flex-col gap-6">
                    {/* Financial Summary */}
                    <Card>
                        <CardHeader className="pb-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Financial Breakdown</CardTitle>
                            <Button size="sm" disabled={payment.status === PaymentStatus.PAID}>
                                <Banknote className="h-4 w-4 mr-2" /> Record Transaction
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-3 gap-8">
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Total Due</p>
                                <p className="text-2xl font-bold">{formatCurrency(payment.totalAmount)}</p>
                            </div>
                            <div className="border-l pl-8">
                                <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Total Paid</p>
                                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(payment.paidAmount)}</p>
                            </div>
                            <div className="border-l pl-8">
                                <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Remaining</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(payment.remainingAmount)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chronological Timeline */}
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Interactive Ledger Timeline
                            </CardTitle>
                            <CardDescription>Visual history of invoice creation, partial payments, and background reminders.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 px-8">
                            <div className="relative border-l-2 border-muted pl-6 space-y-8 py-2">

                                {/* 1. Base Node: Invoice Creation */}
                                <div className="relative">
                                    <div className="absolute -left-[35px] top-1 h-5 w-5 rounded-full bg-blue-100 border-[3px] border-blue-500" />
                                    <p className="text-sm font-medium text-blue-600">Invoice Generated</p>
                                    <p className="text-lg font-bold">{formatCurrency(payment.totalAmount)} Requested</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(payment.invoiceDate)}</p>
                                </div>

                                {/* Map combined Reminders and Transactions sorted by Date */}
                                {(() => {
                                    const events = [
                                        ...transactions.map((t: any) => ({ ...t, eventType: 'TRANSACTION', date: new Date(t.date) })),
                                        ...reminders.map((r: any) => ({ ...r, eventType: 'REMINDER', date: new Date(r.sentAt) }))
                                    ].sort((a, b) => a.date.getTime() - b.date.getTime());

                                    return events.map((ev: any, idx: number) => {
                                        if (ev.eventType === 'TRANSACTION') {
                                            return (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[35px] top-1 h-5 w-5 rounded-full bg-emerald-100 border-[3px] border-emerald-500" />
                                                    <p className="text-sm font-medium text-emerald-600 uppercase">Payment Captured — {ev.mode}</p>
                                                    <p className="text-lg font-bold">+{formatCurrency(ev.amount)}</p>
                                                    {ev.mode === PaymentMode.GOLD || ev.mode === PaymentMode.MIXED ? (
                                                        <div className="text-xs mt-1 bg-muted/40 p-2 rounded-md border inline-block">
                                                            <span className="font-semibold">{ev.goldWeight}g</span> Gold locked @ {formatCurrency(ev.goldRate)}/g
                                                        </div>
                                                    ) : null}
                                                    <p className="text-xs text-muted-foreground mt-1">{formatDate(ev.date)} • {ev.notes || "No notes attached"} </p>
                                                </div>
                                            );
                                        }

                                        if (ev.eventType === 'REMINDER') {
                                            return (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[35px] top-1 h-5 w-5 rounded-full bg-amber-100 border-[3px] border-amber-500" />
                                                    <p className="text-sm font-medium text-amber-600">System Reminder Triggered</p>
                                                    <p className="text-base font-semibold">{ev.type.replace(/_/g, " ")}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Dispatched via {ev.channel} • {formatDate(ev.date)}</p>
                                                </div>
                                            );
                                        }
                                    });
                                })()}

                                {/* End Node: Full Settlement if PAID */}
                                {payment.status === PaymentStatus.PAID && (
                                    <div className="relative">
                                        <div className="absolute -left-[37px] top-1 h-6 w-6 rounded-full bg-emerald-500 border-4 border-white dark:border-background flex items-center justify-center">
                                            <ShieldCheck className="h-3 w-3 text-white" />
                                        </div>
                                        <p className="text-sm font-bold text-emerald-600 mt-1.5">Ledger Fully Settled</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(payment.paidDate)}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
