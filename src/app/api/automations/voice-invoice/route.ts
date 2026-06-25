import { NextRequest, NextResponse } from "next/server";
import { QuotaError, quotaErrorResponse } from "@modules/ai-automation/application/quotaError";
import { aiChat } from "@/lib/ai-providers";
import { isProviderPuterLLM } from "@/lib/ai-key-manager";
import prisma from "@core/database";

const ORG_ID = "org-akhtar";

// ── AI Parsing prompt ─────────────────────────────────────────────────────────

const PARSE_PROMPT = `You are an invoice data extractor for Akhtar Jewellers, a Pakistani jewellery shop.
The user will speak invoice details in Urdu, Roman Urdu, or English — sometimes mixed.
Extract structured invoice data and return ONLY valid JSON. No explanation, no markdown, no extra text.

JSON format to return:
{
  "partyName": "customer name as spoken",
  "transactionType": "SALE",
  "goldRate": null or number (rate per gram, PKR),
  "items": [
    {
      "description": "item description",
      "pieces": 1,
      "carat": 22,
      "estimatedGoldWeight": null or number (grams),
      "stoneWeight": null or number,
      "stoneRate": null or number,
      "makingCharges": null or number
    }
  ],
  "remarks": "any extra notes",
  "cashReceived": null or number,
  "discount": null or number
}

Rules:
- If party name not mentioned, use null for partyName
- carat default is 22 if not mentioned
- Extract all items mentioned (ring, necklace, bracelet, earrings, etc.)
- Urdu words: "sona" = gold, "chandi" = silver, "angoothi/ring" = ring, "necklace/haar" = necklace, "bali/tops" = earrings, "kangan/bangle" = bangle, "weight/wazan" = weight, "rate" = rate, "karat" = carat
- estimatedGoldWeight in grams (1 tola = 11.664 grams)
- makingCharges in PKR total (not per gram unless specified)`;

// ── Parse transcript via AI ───────────────────────────────────────────────────

async function parseTranscript(transcript: string) {
    const { text } = await aiChat(
        PARSE_PROMPT,
        [{ role: "user", content: `Extract invoice data from: "${transcript}"` }],
        600
    );

    // Strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as {
        partyName: string | null;
        transactionType: string;
        goldRate: number | null;
        items: {
            description: string;
            pieces: number;
            carat: number;
            estimatedGoldWeight: number | null;
            stoneWeight: number | null;
            stoneRate: number | null;
            makingCharges: number | null;
        }[];
        remarks: string;
        cashReceived: number | null;
        discount: number | null;
    };
}

// ── Create draft invoice in DB ────────────────────────────────────────────────

async function createDraftInvoice(parsed: Awaited<ReturnType<typeof parseTranscript>>) {
    // Look up party
    let partyId: string | null = null;
    let resolvedPartyName = parsed.partyName ?? "Walk-in Customer";

    if (parsed.partyName) {
        const party = await prisma.party.findFirst({
            where: {
                orgId: ORG_ID,
                name: { contains: parsed.partyName, mode: "insensitive" },
            },
            select: { id: true, name: true },
        });
        if (party) { partyId = party.id; resolvedPartyName = party.name; }
    }

    // Get current gold rate if not spoken
    let goldRate = parsed.goldRate;
    if (!goldRate) {
        const metalRate = await prisma.metalRate.findFirst({
            where: { orgId: ORG_ID, metal: { contains: "gold", mode: "insensitive" } },
            select: { ratePerGram: true },
        });
        goldRate = metalRate ? Number(metalRate.ratePerGram) : null;
    }

    // Look up a default category (use first category in org)
    const defaultCategory = await prisma.category.findFirst({
        where: { orgId: ORG_ID },
        select: { id: true },
    });

    const transactionType = (parsed.transactionType ?? "SALE") as "SALE" | "PURCHASE";

    // Compute line amounts server-side with the shared calculation engine so the
    // draft has real totals (previously totals were 0 — and the invalid
    // `makingCharges` field crashed the InvoiceItem create entirely).
    const { calculateLineItem, calculateInvoiceSummary } = await import(
        "@modules/invoice/application/calculationEngine"
    );

    // The voice prompt extracts goldRate as PKR *per gram* already — do NOT run it
    // through goldRateToPerGram (which would wrongly divide by the tola weight).
    const goldRatePerGram = goldRate ?? 0;

    const computedItems = parsed.items.map((item, i) => {
        const estimatedGoldWeight = item.estimatedGoldWeight ?? 0;
        const carat = item.carat ?? 22;
        const stoneWeight = item.stoneWeight ?? 0;
        const stoneRate = item.stoneRate ?? 0;
        const stoneAmount = stoneRate > 0 && stoneWeight > 0 ? stoneRate * stoneWeight : 0;
        // Spoken "making charges" are a per-item lump sum → InvoiceItem.labourAmount.
        const makingCharges = item.makingCharges ?? 0;

        const calc = calculateLineItem({
            transactionType,
            estimatedGoldWeight,
            carat,
            goldRatePerGram,
            polishRate: 0,
            polishBasis: "Per Tola",
            labourRate: makingCharges,
            labourBasis: "Lump Sum",
            pieces: item.pieces ?? 1,
            stoneWeight,
            beadsWeight: 0,
            diamondWeight: 0,
            stoneAmount,
            beadsAmount: 0,
            diamondAmount: 0,
        });

        return {
            sortOrder: i + 1,
            categoryId: defaultCategory?.id ?? null,
            description: item.description,
            pieces: item.pieces ?? 1,
            carat,
            estimatedGoldWeight,
            adjustedGoldWeight: calc.adjustedGoldWeight,
            estimatedGrossWeight: calc.estimatedGrossWeight,
            stoneWeight,
            stoneRate: stoneRate || null,
            goldAmount: calc.goldAmount,
            stoneAmount,
            polishAmount: calc.polishAmount,
            labourAmount: calc.labourAmount,
            totalAmount: calc.totalAmount,
        };
    });

    const summary = calculateInvoiceSummary({
        items: computedItems.map((c) => ({ totalAmount: c.totalAmount, estimatedGoldWeight: c.estimatedGoldWeight })),
        otherCharges: 0,
        discount: parsed.discount ?? 0,
        cashReceived: parsed.cashReceived ?? 0,
        goldReceived: 0,
        customerGoldWeight: 0,
        customerGoldCarat: 24,
        goldRatePerGram,
        pasaPercent: 0,
    });

    const invoice = await prisma.invoice.create({
        data: {
            orgId: ORG_ID,
            partyId: partyId ?? undefined,
            partyName: resolvedPartyName,
            transactionType,
            status: "DRAFT",
            date: new Date(),
            goldRate: goldRate ?? undefined,
            remarks: parsed.remarks ?? "",
            cashReceived: parsed.cashReceived ?? 0,
            discount: parsed.discount ?? 0,
            totalGoldWeight: summary.totalGoldWeight,
            totalAmount: summary.totalAmount,
            balance: summary.balance,
            items: { create: computedItems },
        },
        select: { id: true, orderNumber: true, partyName: true, transactionType: true },
    });

    // Open the actual invoice editor — root "/" for sales, "/purchase" for purchases.
    // Both pages load an existing invoice via the ?id= query param (see InvoiceMain).
    const editUrl = invoice.transactionType === "PURCHASE"
        ? `/purchase?id=${invoice.id}`
        : `/?id=${invoice.id}`;

    return { invoice, resolvedPartyName, goldRate, editUrl };
}

// ── Route handlers ────────────────────────────────────────────────────────────

// POST ?action=parse — extract data from transcript without saving
// POST ?action=create — parse + save draft invoice
export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") ?? "create";

    try {
        const { transcript } = await req.json() as { transcript: string };
        if (!transcript?.trim()) {
            return NextResponse.json({ success: false, error: "No transcript provided" }, { status: 400 });
        }

        // action === "create-direct" — client already parsed with Puter.js, just save
        if (action === "create-direct") {
            const { parsedData } = await req.clone().json() as { transcript: string; parsedData: Awaited<ReturnType<typeof parseTranscript>> };
            if (!parsedData) return NextResponse.json({ success: false, error: "parsedData required" }, { status: 400 });
            const { invoice, resolvedPartyName, goldRate, editUrl } = await createDraftInvoice(parsedData);
            return NextResponse.json({ success: true, invoiceId: invoice.id, orderNumber: invoice.orderNumber, partyName: resolvedPartyName, goldRate, itemCount: parsedData.items.length, editUrl });
        }

        // action === "parse" — check if Puter mode first
        const isPuter = await isProviderPuterLLM();
        if (isPuter && action === "parse") {
            return NextResponse.json({
                success: true, mode: "puter",
                puterSystemPrompt: PARSE_PROMPT,
                puterUserPrompt: `Extract invoice data from: "${transcript}"`,
            });
        }

        const parsed = await parseTranscript(transcript);

        if (action === "parse") {
            return NextResponse.json({ success: true, parsed });
        }

        // action === "create"
        const { invoice, resolvedPartyName, goldRate, editUrl } = await createDraftInvoice(parsed);

        return NextResponse.json({
            success: true,
            invoiceId: invoice.id,
            orderNumber: invoice.orderNumber,
            partyName: resolvedPartyName,
            goldRate,
            itemCount: parsed.items.length,
            editUrl,
        });
    } catch (err) {
        if (err instanceof QuotaError) {
            return NextResponse.json(quotaErrorResponse(err), { status: 402 });
        }
        console.error("Voice invoice error:", err);
        const msg = err instanceof Error ? err.message : "Failed";
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
