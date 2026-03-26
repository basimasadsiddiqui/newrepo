/**
 * ============================================================================
 * PDF Invoice Generator – Akhtar Jewellers
 * ============================================================================
 *
 * Generates a professional invoice PDF using jsPDF + jspdf-autotable.
 *
 * Usage:
 *   import { generateInvoicePdf } from "@/lib/pdfGenerator";
 *   generateInvoicePdf(invoiceData);
 * ============================================================================
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceItem } from "@/types";

interface PdfInvoiceData {
    orderNumber: number;
    date: string;
    receiptNo: string;
    transactionType: "SALE" | "PURCHASE";
    partyName: string;
    partyMobile: string;
    items: InvoiceItem[];
    totalGoldWeight: number;
    totalAmount: number;
    otherCharges: number;
    discount: number;
    partyGoldValue: number;
    pasaDeduction: number;
    cashReceived: number;
    goldReceived: number;
    balance: number;
    remarks: string;
    goldRate: number;
    polishBasis: string;
    polishRate: number;
    labourBasis: string;
    labourRate: number;
    kaatBasis?: string;
    kaatRate?: number;
}

/**
 * Format a number to the standard PKR display format.
 */
function formatPkr(amount: number): string {
    return `Rs. ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Format grams for display.
 */
function formatGrams(weight: number): string {
    return `${weight.toFixed(3)} g`;
}

/**
 * Generate and download an invoice PDF.
 */
export function generateInvoicePdf(data: PdfInvoiceData): void {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    // ── Header ──
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(102, 0, 0); // Maroon
    doc.text("AKHTAR JEWELLERS", pageWidth / 2, y, { align: "center" });
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Main Bazaar, Lahore  •  042-37654321", pageWidth / 2, y, { align: "center" });
    y += 8;

    // ── Transaction Type Badge ──
    const isSale = data.transactionType === "SALE";
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isSale ? 102 : 26, isSale ? 0 : 107, isSale ? 0 : 60);
    doc.text(isSale ? "SALE INVOICE" : "PURCHASE INVOICE", pageWidth / 2, y, { align: "center" });
    y += 3;

    // ── Divider ──
    doc.setDrawColor(200, 170, 100);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // ── Invoice Info (2 columns) ──
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);

    const col1X = margin;
    const col2X = pageWidth / 2 + 10;

    if (isSale) {
        doc.text(`Order #: ${data.orderNumber}`, col1X, y);
    }
    doc.text(`Date: ${data.date}`, col2X, y);
    y += 5;

    doc.text(`Receipt: ${data.receiptNo || "—"}`, col1X, y);
    doc.text(`Gold Rate: ${formatPkr(data.goldRate)} / Tola`, col2X, y);
    y += 5;

    doc.text(`Party: ${data.partyName || "Walk-in"}`, col1X, y);
    doc.text(`Mobile: ${data.partyMobile || "—"}`, col2X, y);
    y += 5;

    doc.text(`Polish: ${data.polishRate} (${data.polishBasis})`, col1X, y);
    doc.text(`Labour: ${data.labourRate} (${data.labourBasis})`, col2X, y);
    y += 8;

    // ── Items Table ──
    const tableColumns = [
        { header: "#", dataKey: "sno" },
        { header: "Category", dataKey: "category" },
        { header: "Pcs", dataKey: "pcs" },
        { header: "Ct", dataKey: "carat" },
        { header: "Gold Wt", dataKey: "goldWt" },
        { header: "Gold Amt", dataKey: "goldAmt" },
        { header: "Stone", dataKey: "stoneAmt" },
        { header: "Polish", dataKey: "polishAmt" },
        { header: "Labour", dataKey: "labourAmt" },
        { header: "Total", dataKey: "total" },
    ];

    const tableRows = data.items.map((item, index) => ({
        sno: (index + 1).toString(),
        category: item.categoryName || "—",
        pcs: item.pieces.toString(),
        carat: `${item.carat}K`,
        goldWt: formatGrams(item.adjustedGoldWeight),
        goldAmt: formatPkr(item.goldAmount),
        stoneAmt: item.stoneAmount > 0 ? formatPkr(item.stoneAmount) : "—",
        polishAmt: formatPkr(item.polishAmount),
        labourAmt: formatPkr(item.labourAmount),
        total: formatPkr(item.totalAmount),
    }));

    autoTable(doc, {
        startY: y,
        columns: tableColumns,
        body: tableRows,
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak",
        },
        headStyles: {
            fillColor: [102, 0, 0], // Maroon
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8,
        },
        alternateRowStyles: {
            fillColor: [255, 248, 240],
        },
        columnStyles: {
            sno: { cellWidth: 8, halign: "center" },
            pcs: { cellWidth: 10, halign: "center" },
            carat: { cellWidth: 10, halign: "center" },
            goldWt: { cellWidth: 20, halign: "right" },
            goldAmt: { halign: "right" },
            stoneAmt: { halign: "right" },
            polishAmt: { halign: "right" },
            labourAmt: { halign: "right" },
            total: { halign: "right", fontStyle: "bold" },
        },
    });

    // Get final Y after table
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    // ── Summary Box ──
    const summaryX = pageWidth / 2 + 10;
    const summaryWidth = pageWidth / 2 - margin - 10;
    const lineHeight = 5.5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);

    const summaryLines: [string, string][] = [
        ["Total Gold Weight:", formatGrams(data.totalGoldWeight)],
        ["Items Total:", formatPkr(data.totalAmount)],
    ];

    if (data.otherCharges > 0) summaryLines.push(["Other Charges:", formatPkr(data.otherCharges)]);
    if (data.discount > 0) summaryLines.push(["Discount:", `- ${formatPkr(data.discount)}`]);
    if (data.partyGoldValue > 0) summaryLines.push(["Old Gold Value:", `- ${formatPkr(data.partyGoldValue)}`]);
    if (data.pasaDeduction > 0) summaryLines.push(["Pasa Deduction:", `- ${formatPkr(data.pasaDeduction)}`]);
    if (data.cashReceived > 0) summaryLines.push(["Cash Received:", formatPkr(data.cashReceived)]);

    for (const [label, value] of summaryLines) {
        doc.setFont("helvetica", "normal");
        doc.text(label, summaryX, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, summaryX + summaryWidth, y, { align: "right" });
        y += lineHeight;
    }

    // Balance (highlighted)
    y += 2;
    doc.setDrawColor(102, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(summaryX, y - 1, summaryX + summaryWidth, y - 1);
    y += 3;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(102, 0, 0);
    doc.text("Balance:", summaryX, y);
    doc.text(formatPkr(data.balance), summaryX + summaryWidth, y, { align: "right" });
    y += 8;

    // ── Remarks ──
    if (data.remarks) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100);
        doc.text(`Remarks: ${data.remarks}`, margin, y);
        y += 6;
    }

    // ── Footer ──
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });
    doc.text("This is a computer-generated invoice.", pageWidth / 2, footerY + 4, { align: "center" });

    // ── Download ──
    const fileName = `AJ_Invoice_${data.orderNumber}_${data.date.replace(/-/g, "")}.pdf`;
    doc.save(fileName);
}
