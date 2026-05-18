import prisma from "@core/database";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import PrintButton from "./PrintButton";

export default async function PrintInvoicePage({ params }: { params: { id: string } }) {
    // Await params as required by Next.js 15+ dynamic route rules
    const resolvedParams = await params;

    // In some builds, string resolution from awaited params is better
    const id = String(resolvedParams?.id || '');

    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!invoice) {
        notFound();
    }

    // A helper to format numbers to 2 decimal places for currency
    const formatCurrency = (val: any) => Number(val).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="print-container text-black font-mono">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: 3in 7in;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        width: 3in;
                    }
                    .print-container {
                        width: 100%;
                        padding: 10px;
                        font-family: monospace;
                        font-size: 10px;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                
                /* Screen preview styles */
                @media screen {
                    body {
                        background: #f0f0f0;
                        display: flex;
                        justify-content: center;
                        padding: 20px;
                    }
                    .print-container {
                        background: white;
                        width: 3in;
                        min-height: 7in;
                        padding: 20px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        font-family: monospace;
                        font-size: 10px;
                    }
                }
            `}} />

            {/* Print Button Header (Screen Only) */}
            <div className="no-print mb-4 flex flex-col items-center border-b pb-2 gap-2">
                <span className="text-gray-500 font-sans text-xs">3x7" Receipt Preview</span>
                <PrintButton />
            </div>

            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="font-bold text-xl uppercase mb-1">Akhtar Jewellers</h1>
                <p className="text-[10px]">Your Trusted Jeweller</p>
                <p className="text-[10px] border-b border-black pb-2 mb-2">Branch: Main</p>
            </div>

            {/* Invoice Info */}
            <div className="mb-4 text-[10px]">
                <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <span className="font-bold">{invoice.receiptNo || `INV-${invoice.orderNumber}`}</span>
                </div>
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{format(new Date(invoice.date), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{invoice.partyName || "Walk-in"}</span>
                </div>
                {invoice.partyMobile && (
                    <div className="flex justify-between">
                        <span>Mobile:</span>
                        <span>{invoice.partyMobile}</span>
                    </div>
                )}
            </div>

            <div className="border-b border-dashed border-black mb-2"></div>

            {/* Items Table */}
            <table className="w-full mb-2 text-[10px]">
                <thead>
                    <tr className="border-b border-black text-left">
                        <th className="font-normal w-1/2">Item</th>
                        <th className="font-normal text-right">Wt/g</th>
                        <th className="font-normal text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="align-top py-1">
                                {item.pieces}x {item.description || "Jewellery"} <br />
                                <span className="text-[8px]">{item.carat}K</span>
                            </td>
                            <td className="align-top text-right py-1">
                                {Number(item.adjustedGoldWeight).toFixed(3)}
                            </td>
                            <td className="align-top text-right py-1">
                                {formatCurrency(item.totalAmount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-b border-dashed border-black mb-2"></div>

            {/* Totals */}
            <div className="space-y-1 mb-4 text-[10px]">
                <div className="flex justify-between">
                    <span>Total Weight:</span>
                    <span>{Number(invoice.totalGoldWeight).toFixed(3)} g</span>
                </div>

                {Number(invoice.otherCharges) > 0 && (
                    <div className="flex justify-between mt-1">
                        <span>Other Charges:</span>
                        <span>+ {formatCurrency(invoice.otherCharges)}</span>
                    </div>
                )}

                {Number(invoice.discount) > 0 && (
                    <div className="flex justify-between mt-1">
                        <span>Discount:</span>
                        <span>- {formatCurrency(invoice.discount)}</span>
                    </div>
                )}

                {Number(invoice.customerGoldValue) > 0 && (
                    <div className="flex justify-between text-[9px] mt-1">
                        <span>Old Gold Return:</span>
                        <span>- {formatCurrency(invoice.customerGoldValue)}</span>
                    </div>
                )}

                <div className="flex justify-between font-bold text-sm mt-2 border-t border-black pt-1">
                    <span>NET TOTAL:</span>
                    <span>PKR {formatCurrency(invoice.balance)}</span>
                </div>
            </div>

            <div className="border-b border-dashed border-black mb-4"></div>

            {/* Footer */}
            <div className="text-center text-[9px]">
                <p className="mb-1 leading-tight">Items once sold are not returnable for cash.</p>
                <p className="font-bold mt-2">Thank you for your visit!</p>
                <p className="mt-2 text-[8px] text-gray-500">Software by BiteRush/StudyCRM</p>
            </div>

            <div className="no-print mt-4 w-full">
                <PrintButton label="Print Receipt" className="w-full" />
            </div>
        </div>
    );
}
