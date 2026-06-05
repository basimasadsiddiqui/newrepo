import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceItem } from "@shared/types";

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
    photos?: string[];
    visibleColumns?: Record<string, boolean>;
}

// ── colour palette ─────────────────────────────────────────────────────────────
const C = {
    maroon:    [120, 20,  20 ] as [number,number,number],
    maroonDk:  [90,  10,  10 ] as [number,number,number],
    gold:      [200, 165, 90 ] as [number,number,number],
    goldLight: [245, 235, 210] as [number,number,number],
    cream:     [253, 249, 242] as [number,number,number],
    white:     [255, 255, 255] as [number,number,number],
    text:      [30,  30,  30 ] as [number,number,number],
    textMid:   [80,  80,  80 ] as [number,number,number],
    textLight: [140, 140, 140] as [number,number,number],
};

function fmtNum(amount: number): string {
    if (amount === 0) return "—";
    return amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtG(weight: number): string {
    if (weight === 0) return "—";
    return weight.toFixed(3);
}

function imgFmt(dataUri: string): "JPEG" | "PNG" {
    return /data:image\/png/i.test(dataUri) ? "PNG" : "JPEG";
}

// ── column definitions ─────────────────────────────────────────────────────────
type ColDef = {
    key: string;
    header: string;
    dataKey: string;
    baseW: number;
    align: "left" | "center" | "right";
    purchaseOnly?: true;
    saleOnly?: true;
    bold?: true;
};

const ALL_COLS: ColDef[] = [
    { key: "sno",        header: "#",           dataKey: "sno",        baseW: 6,  align: "center" },
    { key: "description",header: "Description", dataKey: "category",   baseW: 0,  align: "left"   },
    { key: "pieces",     header: "Pcs",          dataKey: "pcs",        baseW: 8,  align: "center" },
    { key: "carat",      header: "Carat",        dataKey: "carat",      baseW: 12, align: "center" },
    { key: "goldWt",     header: "Gold Wt\n(g)", dataKey: "goldWt",     baseW: 16, align: "right"  },
    { key: "kaatWt",     header: "Kaat\n(g)",    dataKey: "kaatWt",     baseW: 14, align: "right",  purchaseOnly: true },
    { key: "pureWt",     header: "Pure Wt\n(g)", dataKey: "pureWt",     baseW: 16, align: "right",  purchaseOnly: true },
    { key: "stoneWt",    header: "Stone\n(g)",   dataKey: "stoneWt",    baseW: 14, align: "right"  },
    { key: "beadsWt",    header: "Beads\n(g)",   dataKey: "beadsWt",    baseW: 14, align: "right"  },
    { key: "diamondWt",  header: "Dmnd\n(g)",    dataKey: "diamondWt",  baseW: 14, align: "right"  },
    { key: "goldAmt",    header: "Gold Amt",     dataKey: "goldAmt",    baseW: 22, align: "right"  },
    { key: "stoneAmt",   header: "Stone Amt",    dataKey: "stoneAmt",   baseW: 18, align: "right"  },
    { key: "beadsAmt",   header: "Beads Amt",    dataKey: "beadsAmt",   baseW: 18, align: "right"  },
    { key: "diamondAmt", header: "Dmnd Amt",     dataKey: "diamondAmt", baseW: 18, align: "right"  },
    { key: "polishAmt",  header: "Polish",       dataKey: "polishAmt",  baseW: 16, align: "right",  saleOnly: true },
    { key: "labourAmt",  header: "Labour",       dataKey: "labourAmt",  baseW: 16, align: "right"  },
    { key: "total",      header: "Total",        dataKey: "total",      baseW: 22, align: "right",  bold: true },
];

export async function generateInvoicePdf(data: PdfInvoiceData): Promise<void> {
    const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M     = 12;
    const CW    = pageW - M * 2;

    const isSale    = data.transactionType === "SALE";
    const isPurchase = !isSale;
    let y = M;

    const ensureSpace = (need: number) => {
        if (y + need > pageH - 18) {
            doc.addPage();
            y = M;
        }
    };

    // ── HEADER BANNER ──────────────────────────────────────────────────────────
    doc.setFillColor(...C.maroon);
    doc.roundedRect(M, y, CW, 26, 3, 3, "F");

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text("AKHTAR JEWELLERS", pageW / 2, y + 9, { align: "center" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.goldLight);
    doc.text("Main Bazaar, Lahore  ·  042-37654321  ·  Finest Gold & Jewellery", pageW / 2, y + 16, { align: "center" });

    const badgeText = isSale ? "✦  SALE INVOICE  ✦" : "✦  BULK PURCHASE INVOICE  ✦";
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.gold);
    doc.text(badgeText, pageW / 2, y + 22, { align: "center" });

    y += 29;

    // ── META INFO BOX ──────────────────────────────────────────────────────────
    const metaH = 24;
    doc.setFillColor(...C.cream);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, CW, metaH, 2, 2, "FD");

    doc.setDrawColor(...C.goldLight);
    doc.setLineWidth(0.3);
    doc.line(M + CW / 2, y + 3, M + CW / 2, y + metaH - 3);

    const metaRows: [string, string, string, string][] = [
        [
            isSale ? "Order #" : "Receipt",
            isSale ? String(data.orderNumber) : (data.receiptNo || "—"),
            "Gold Rate",
            `Rs.${fmtNum(data.goldRate)} / Tola`,
        ],
        ["Date",   data.date,                       "Polish",  `${data.polishRate}  (${data.polishBasis})`],
        ["Party",  data.partyName || "Walk-in",     "Labour",  `${data.labourRate}  (${data.labourBasis})`],
        ["Mobile", data.partyMobile || "—",         "Receipt", data.receiptNo || "—"],
    ];

    const lx  = M + 4;
    const rx  = M + CW / 2 + 4;
    const LBL = 20;
    let   my  = y + 6;
    const MLH = 5;

    for (const [ll, lv, rl, rv] of metaRows) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.textMid);
        doc.text(ll + ":", lx, my);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.text);
        doc.text(lv, lx + LBL, my);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.textMid);
        doc.text(rl + ":", rx, my);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.text);
        doc.text(rv, rx + LBL, my);

        my += MLH;
    }

    y += metaH + 4;

    // ── ITEMS TABLE ────────────────────────────────────────────────────────────
    const vis  = data.visibleColumns ?? {};
    const show = (k: string) => vis[k] !== false;

    const hasImages = show("image") && data.items.some(i => i.imageUrl);
    const imageUrls = data.items.map(i => i.imageUrl || null);
    const IMG_W = 13;

    const visCols = ALL_COLS.filter(c => {
        if (c.purchaseOnly && !isPurchase) return false;
        if (c.saleOnly    && isPurchase)   return false;
        return show(c.key);
    });

    const fixedW = visCols
        .filter(c => c.key !== "description")
        .reduce((s, c) => s + c.baseW, 0)
        + (hasImages ? IMG_W : 0);

    let catW = CW - fixedW;
    let scale = 1;
    if (catW < 22) {
        scale = (CW - 22) / fixedW;
        catW  = 22;
    }

    const colStyles: Record<string, object> = {};
    if (hasImages) colStyles["img"] = { cellWidth: IMG_W, cellPadding: 1 };
    for (const c of visCols) {
        if (c.key === "description") {
            colStyles[c.dataKey] = { cellWidth: catW, halign: "left" };
        } else {
            colStyles[c.dataKey] = {
                cellWidth: Math.round(c.baseW * scale * 10) / 10,
                halign: c.align,
                ...(c.bold ? { fontStyle: "bold" } : {}),
            };
        }
    }

    const tblCols: { header: string; dataKey: string }[] = [
        ...(hasImages ? [{ header: "", dataKey: "img" }] : []),
        ...visCols.map(c => ({ header: c.header, dataKey: c.dataKey })),
    ];

    const tblRows = data.items.map((item, i) => ({
        img:       "",
        sno:       String(i + 1),
        category:  [item.categoryName, item.description].filter(Boolean).join("\n") || "—",
        pcs:       String(item.pieces),
        carat:     item.carat > 0 ? `${item.carat}K` : "—",
        goldWt:    fmtG(item.estimatedGoldWeight),
        kaatWt:    fmtG(item.kaatWeight ?? 0),
        pureWt:    fmtG(item.adjustedGoldWeight),
        stoneWt:   fmtG(item.stoneWeight),
        beadsWt:   fmtG(item.beadsWeight),
        diamondWt: fmtG(item.diamondWeight),
        goldAmt:   fmtNum(item.goldAmount),
        stoneAmt:  item.stoneAmount  > 0 ? fmtNum(item.stoneAmount)  : "—",
        beadsAmt:  item.beadsAmount  > 0 ? fmtNum(item.beadsAmount)  : "—",
        diamondAmt:item.diamondAmount > 0 ? fmtNum(item.diamondAmount): "—",
        polishAmt: item.polishAmount > 0  ? fmtNum(item.polishAmount) : "—",
        labourAmt: fmtNum(item.labourAmount),
        total:     fmtNum(item.totalAmount),
    }));

    const tblFs = visCols.length > 11 ? 6.5 : visCols.length > 9 ? 7 : 7.5;

    autoTable(doc, {
        startY:     y,
        columns:    tblCols,
        body:       tblRows,
        margin:     { left: M, right: M },
        tableWidth: CW,
        styles: {
            fontSize:      tblFs,
            cellPadding:   { top: 2.2, bottom: 2.2, left: 1.8, right: 1.8 },
            overflow:      "linebreak",
            valign:        "middle",
            textColor:     C.text,
            lineColor:     [220, 210, 195],
            lineWidth:     0.15,
            ...(hasImages ? { minCellHeight: 13 } : {}),
        },
        headStyles: {
            fillColor:  C.maroon,
            textColor:  255,
            fontStyle:  "bold",
            fontSize:   tblFs,
            halign:     "center",
            valign:     "middle",
            cellPadding: { top: 3, bottom: 3, left: 1.8, right: 1.8 },
        },
        alternateRowStyles: { fillColor: C.cream },
        columnStyles: colStyles,
        // Gold Wt column — always gold-tinted regardless of alternating rows
        didParseCell: (data) => {
            if (data.column.dataKey === "goldWt") {
                data.cell.styles.fillColor  = [245, 232, 190] as [number,number,number];
                data.cell.styles.textColor  = [120, 80, 10]   as [number,number,number];
                data.cell.styles.fontStyle  = "bold";
            }
        },
        didDrawCell: (cell) => {
            if (!hasImages) return;
            if (cell.column.dataKey !== "img" || cell.cell.section !== "body") return;
            const url = imageUrls[cell.row.index];
            if (!url) return;
            try {
                doc.addImage(url, imgFmt(url),
                    cell.cell.x + 0.5, cell.cell.y + 0.5,
                    cell.cell.width - 1, cell.cell.height - 1);
            } catch { /* skip bad images */ }
        },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

    // ── SUMMARY + SIGNATURE ROW ────────────────────────────────────────────────
    // Purchase: weight-first summary (no balance). Sale: amount-first summary.
    const pakkaTola = (data.totalGoldWeight / 12.150).toFixed(4);
    const kachaTola = (data.totalGoldWeight / 11.664).toFixed(4);

    const summaryLines: [string, string][] = isPurchase
        ? [
            ["Total Gold Weight :",      `${data.totalGoldWeight.toFixed(3)} g`],
            ["  Pakka Tola (÷12.150) :", `${pakkaTola} Tola`],
            ["  Kacha Tola (÷11.664) :", `${kachaTola} Tola`],
            ["Total Kaat Weight :",      `${data.items.reduce((s, i) => s + (i.kaatWeight ?? 0), 0).toFixed(3)} g`],
            ["Net Pure Weight :",        `${data.items.reduce((s, i) => s + i.adjustedGoldWeight, 0).toFixed(3)} g`],
            ["Total Stone Weight :",     `${data.items.reduce((s, i) => s + i.stoneWeight, 0).toFixed(3)} g`],
          ]
        : [
            ["Total Gold Wt :",          `${data.totalGoldWeight.toFixed(3)} g`],
            ["  Pakka Tola (÷12.150) :", `${pakkaTola} Tola`],
            ["  Kacha Tola (÷11.664) :", `${kachaTola} Tola`],
            ["Items Total :",            `Rs.${fmtNum(data.totalAmount)}`],
          ];

    if (!isPurchase) {
        if (data.otherCharges  > 0) summaryLines.push(["Other Charges :",   `+ Rs.${fmtNum(data.otherCharges)}`]);
        if (data.discount      > 0) summaryLines.push(["Discount :",        `- Rs.${fmtNum(data.discount)}`]);
        if (data.partyGoldValue > 0) summaryLines.push(["Old Gold Value :",  `- Rs.${fmtNum(data.partyGoldValue)}`]);
        if (data.pasaDeduction  > 0) summaryLines.push(["Pasa Deduction :", `- Rs.${fmtNum(data.pasaDeduction)}`]);
        if (data.cashReceived  > 0) summaryLines.push(["Cash Received :",   `Rs.${fmtNum(data.cashReceived)}`]);
    }

    const SUM_LH  = 5.4;
    const sumBodyH = summaryLines.length * SUM_LH;
    const sumTotalH = sumBodyH + 6 + 12;

    ensureSpace(sumTotalH + 20);

    const sumX = M + CW * 0.54;
    const sumW = CW * 0.46;

    doc.setFillColor(...C.cream);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(sumX, y, sumW, sumTotalH, 2, 2, "FD");

    doc.setFillColor(...C.goldLight);
    doc.roundedRect(sumX, y, sumW, 7, 2, 2, "F");
    doc.rect(sumX, y + 3, sumW, 4, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.maroon);
    doc.text("INVOICE SUMMARY", sumX + sumW / 2, y + 5, { align: "center" });

    let sy = y + 12;
    for (const [lbl, val] of summaryLines) {
        const isTolaLine = lbl.startsWith("  ");
        doc.setFontSize(isTolaLine ? 7 : 8);
        doc.setFont("helvetica", isTolaLine ? "italic" : "normal");
        doc.setTextColor(...(isTolaLine ? C.textLight : C.textMid));
        doc.text(lbl, sumX + 3, sy);
        doc.setFont("helvetica", isTolaLine ? "italic" : "bold");
        doc.setTextColor(...(isTolaLine ? C.textLight : C.text));
        doc.text(val, sumX + sumW - 3, sy, { align: "right" });
        sy += isTolaLine ? 4.5 : SUM_LH;
    }

    sy += 2;
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.4);
    doc.line(sumX + 3, sy, sumX + sumW - 3, sy);
    sy += 3;

    doc.setFillColor(...C.maroon);
    doc.rect(sumX, sy - 3, sumW, 11, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    if (isPurchase) {
        doc.text("Net Pure Weight:", sumX + 4, sy + 4);
        const netPure = data.items.reduce((s, i) => s + i.adjustedGoldWeight, 0);
        doc.text(`${netPure.toFixed(3)} g`, sumX + sumW - 4, sy + 4, { align: "right" });
    } else {
        doc.text("Balance Due:", sumX + 4, sy + 4);
        doc.text(`Rs.${fmtNum(data.balance)}`, sumX + sumW - 4, sy + 4, { align: "right" });
    }

    const sigY     = y + sumTotalH - 14;
    const sigAreaW = CW * 0.50;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.textLight);
    doc.setDrawColor(...C.textLight);
    doc.setLineWidth(0.25);

    const s1x = M + 4;
    const s2x = M + sigAreaW * 0.55;
    const sLen = sigAreaW * 0.38;

    doc.line(s1x, sigY, s1x + sLen, sigY);
    doc.line(s2x, sigY, s2x + sLen, sigY);
    doc.text("Customer Signature", s1x + sLen / 2, sigY + 4, { align: "center" });
    doc.text("Authorised Signature", s2x + sLen / 2, sigY + 4, { align: "center" });

    y += sumTotalH + 6;

    // ── REMARKS ────────────────────────────────────────────────────────────────
    if (data.remarks) {
        ensureSpace(14);
        doc.setFillColor(255, 251, 243);
        doc.setDrawColor(...C.goldLight);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CW, 10, 1.5, 1.5, "FD");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...C.textMid);
        doc.text(`Remarks: ${data.remarks}`, M + 3, y + 6);
        y += 14;
    }

    // ── INVOICE PHOTOS ─────────────────────────────────────────────────────────
    if (data.photos && data.photos.length > 0) {
        ensureSpace(20);
        y += 2;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.maroon);
        doc.text("INVOICE PHOTOS", M, y + 4);
        y += 8;

        const photoW = (CW - 6) / 2;
        const photoH = photoW * 0.62;

        for (let pi = 0; pi < data.photos.length; pi++) {
            const col = pi % 2;
            if (col === 0) ensureSpace(photoH + 4);
            const px = M + col * (photoW + 6);
            const py = y;
            try {
                doc.addImage(data.photos[pi], imgFmt(data.photos[pi]), px, py, photoW, photoH);
            } catch { /* skip */ }
            if (col === 1 || pi === data.photos.length - 1) y += photoH + 4;
        }
    }

    // ── FOOTER ─────────────────────────────────────────────────────────────────
    const totalPages = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
        doc.setPage(pg);
        const fy = pageH - 9;
        doc.setDrawColor(...C.gold);
        doc.setLineWidth(0.4);
        doc.line(M, fy - 3, pageW - M, fy - 3);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.textLight);
        doc.text(
            "Thank you for choosing Akhtar Jewellers — Computer-generated, no signature required.",
            pageW / 2, fy + 1, { align: "center" }
        );
        if (totalPages > 1) {
            doc.text(`Page ${pg} of ${totalPages}`, pageW - M, fy + 1, { align: "right" });
        }
    }

    const fileName = `AJ_Invoice_${data.orderNumber}_${data.date.replace(/-/g, "")}.pdf`;
    doc.save(fileName);
}
