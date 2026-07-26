/**
 * ============================================================================
 * INVOICE PAGE – Main Orchestrator
 * ============================================================================
 *
 * Layout (restructured — no horizontal scroll):
 * ┌──────────────────────────────────────────────────────┐
 * │  Invoice Header (full width, Sale/Purchase toggle)   │
 * ├────────────────────────────────┬─────────────────────┤
 * │  Item Entry Form              │  Rules Panel         │
 * │                               │  + Photo System      │
 * ├────────────────────────────────┴─────────────────────┤
 * │  Item Grid (FULL WIDTH — no horizontal scroll)       │
 * ├──────────────────────────────────────────────────────┤
 * │  Invoice Summary (full width)                        │
 * └──────────────────────────────────────────────────────┘
 *
 * STATE: All state is managed here and passed to children.
 * CALCULATIONS: Real-time via useMemo + calculationEngine.
 * ============================================================================
 */

"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { useSearchParams } from "next/navigation";

// ── Hooks ──
import { useKeyboardNav } from "@/hooks/useKeyboardNav";

// ── PDF ──
import { generateInvoicePdf } from "@/lib/pdfGenerator";

// ── Components ──
import InvoiceHeader from "@/components/invoice/InvoiceHeader";
import ItemEntryForm from "@/components/invoice/ItemEntryForm";
import JewelleryRulesPanel from "@/components/invoice/JewelleryRulesPanel";
import BulkAddModal from "@/components/invoice/BulkAddModal";
import BulkEntryPanel, { type BulkRow } from "@/components/invoice/BulkEntryPanel";
import ItemGrid from "@/components/invoice/ItemGrid";
import InvoiceSummary from "@/components/invoice/InvoiceSummary";
import PhotoSystem from "@/components/invoice/PhotoSystem";
import DiamondDetailsDialog from "@/components/invoice/DiamondDetailsDialog";

// ── Calculation Engine ──
import {
  calculateLineItem,
  calculateInvoiceSummary,
  goldRateToPerGram,
  goldRateToPerGramPakka,
  calcOldGoldValue,
  calcPasaDeduction,
} from "@/lib/calculationEngine";
import type { PolishLabourBasis, LabourBasis, KaatBasis } from "@/lib/calculationEngine";

// ── Types ──
import type {
  Category,
  DiamondEntry,
  InvoiceItem,
  ItemEntryFormData,
  PartySearchResult,
  PartyRiskProfile,
  MetalTypeOption,
  RateType,
  TransactionType,
} from "@/types";

// ─── Demo Data ──────────────────────────────────────────────────



// ─── Default Item Entry Form State ──────────────────────────────

const DEFAULT_ITEM_FORM: ItemEntryFormData = {
  categoryId: "",
  description: "",
  tagCaption: "",
  pieces: 1,
  carat: 21,
  size: "",
  isRepairingOrder: false,
  isSampleGold: false,
  estimatedGoldWeight: 0,
  stoneWeight: 0,
  stoneRate: 0,
  beadsWeight: 0,
  diamondWeight: 0,
  stoneAmount: 0,
  beadsAmount: 0,
  diamondAmount: 0,
  imageUrl: null,
  metalTypeId: null,
  metalName: "Gold",
  guaranteedRatti: 0,
  goldReturnClaim: 0,
};

// Purchase mode: keep category/description/carat/pieces/metal — only clear weight & stones
function purchaseStickyReset(prev: ItemEntryFormData): ItemEntryFormData {
  return {
    ...prev,
    estimatedGoldWeight: 0,
    stoneWeight: 0,
    stoneRate: 0,
    beadsWeight: 0,
    diamondWeight: 0,
    stoneAmount: 0,
    beadsAmount: 0,
    diamondAmount: 0,
    imageUrl: null,
    isRepairingOrder: false,
    isSampleGold: false,
    guaranteedRatti: 0,
    goldReturnClaim: 0,
  };
}

const DRAFT_ITEMS_STORAGE_KEY = "draft_invoice_items";

let itemCounter = 0;
function generateItemId(): string {
  return `item-${Date.now()}-${++itemCounter}`;
}

function isInlineImage(imageUrl: string | null | undefined): boolean {
  return typeof imageUrl === "string" && imageUrl.startsWith("data:");
}

function createPersistedDraftItems(
  items: InvoiceItem[],
  options?: { stripAllImages?: boolean; stripDiamondEntries?: boolean }
): InvoiceItem[] {
  return items.map((item) => ({
    ...item,
    imageUrl:
      options?.stripAllImages || isInlineImage(item.imageUrl)
        ? null
        : item.imageUrl,
    diamondEntries: options?.stripDiamondEntries ? undefined : item.diamondEntries,
  }));
}

function isStorageQuotaError(error: unknown): boolean {
  return error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014);
}

// ═══════════════════════════════════════════════════════════════
// MAIN INVOICE PAGE
// ═══════════════════════════════════════════════════════════════

interface InvoiceMainProps {
  defaultTransactionType: TransactionType;
  hideToggle?: boolean;
  /** When true, all added items are flagged isBulkPurchase and bulk modal auto-opens on load */
  isBulkMode?: boolean;
}

export default function InvoiceMain({ defaultTransactionType, hideToggle = false, isBulkMode = false }: InvoiceMainProps) {
  // ── API Data ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [metalTypes, setMetalTypes] = useState<MetalTypeOption[]>([]);
  const [metals, setMetals] = useState<string[]>([]);
  const [, setIsLoading] = useState<boolean>(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null); // Null = New Invoice

  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const stockItemIdParam = searchParams.get("stockItemId");
  const autoAddStockParam = searchParams.get("autoAdd");
  const invoiceIdParam = searchParams.get("id");

  // ── Invoice Header ──
  const [orderNumber] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [receiptNo, setReceiptNo] = useState<string>("");
  const [rateType, setRateType] = useState<RateType>("FIXED");
  const [dueDate, setDueDate] = useState<string>("");
  const [status, setStatus] = useState<string>("DRAFT");

  // Initialize from prop first, then URL param if present (though prop is main control)
  const [transactionType, setTransactionType] = useState<TransactionType>(defaultTransactionType);

  // ── Party (unified Customer / Supplier) ──
  const [partyId, setPartyId] = useState<string>("");
  const [partyName, setPartyName] = useState<string>(""); // Acts as both search input and name
  const [partyMobile, setPartyMobile] = useState<string>("");
  const [partyBalance, setPartyBalance] = useState<string>("0");
  const [partyResults, setPartyResults] = useState<PartySearchResult[]>([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState<boolean>(false);
  const [partyRisk, setPartyRisk] = useState<PartyRiskProfile | null>(null); // NEW: Risk Data
  const [loadingRisk, setLoadingRisk] = useState<boolean>(false); // NEW: Risk Loading State

  // Search Debounce Ref
  // Using useRef to persist the timeout ID across renders
  const debounceRef = useState<{ timeout: NodeJS.Timeout | null }>({ timeout: null })[0];

  // ── Gold Rate & Carat ──
  const [goldRate, setGoldRate] = useState<number>(0);
  const [, setGoldCarat] = useState<number>(24);

  // ── Jewellery Rules ──
  const [polishBasis, setPolishBasis] = useState<PolishLabourBasis>("Per Tola");
  const [polishRate, setPolishRate] = useState<number>(2.0);
  const [labourBasis, setLabourBasis] = useState<LabourBasis>("Per Tola");
  const [labourRate, setLabourRate] = useState<number>(0);
  const [kaatBasis, setKaatBasis] = useState<KaatBasis>("Ratti Kaat");
  const [kaatRate, setKaatRate] = useState<number>(0);

  // ── Purchase Invoice Specific ──
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>("");
  const [currency, setCurrency] = useState<string>("PKR");
  const [currencyRate, setCurrencyRate] = useState<number>(1);
  const [intlOunceRate, setIntlOunceRate] = useState<number>(0);

  // ── Party Old Gold ──
  const [partyGoldWeight, setPartyGoldWeight] = useState<number>(0);
  const [partyGoldCarat, setPartyGoldCarat] = useState<number>(24);

  // ── Pasa Rate ──
  const [pasaRate, setPasaRate] = useState<number>(0);

  // ── Item Entry Form ──
  const [itemForm, setItemForm] = useState<ItemEntryFormData>(DEFAULT_ITEM_FORM);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // ── Line Items ──
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);
  const [imageTargetIndex, setImageTargetIndex] = useState<number | null>(null);
  const stockItemPrefillRef = useRef<string | null>(null);
  const draftStorageWarningShownRef = useRef<boolean>(false);

  // ── Diamond Dialog ──
  const [isDiamondDialogOpen, setIsDiamondDialogOpen] = useState<boolean>(false);
  const [diamondEntries, setDiamondEntries] = useState<DiamondEntry[]>([]);
  const [shouldAutoAdd, setShouldAutoAdd] = useState<boolean>(false);

  // ── Bulk Add Modal (Purchase) — only for re-categorize flow ──
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  // null = new bulk; number = index of item being re-categorised (replace mode)
  const [categorizingItemIndex, setCategorizingItemIndex] = useState<number | null>(null);
  // Track which tab is active in BulkEntryPanel so we can expand the container
  const [bulkPanelMode, setBulkPanelMode] = useState<"quick" | "categorize">("quick");

  // Load from localStorage OR from DB (when ?id= param is present)
  useEffect(() => {
    if (invoiceIdParam) {
      // ── Load existing invoice from DB ──
      (async () => {
        try {
          const res = await fetch(`/api/invoices/${invoiceIdParam}`);
          const json = await res.json();
          if (!json.success || !json.data) {
            toast.error("Invoice not found");
            setHasHydrated(true);
            return;
          }
          const inv = json.data;
          // Populate header fields
          setInvoiceId(inv.id);
          setDate(inv.date ? new Date(inv.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
          setReceiptNo(inv.receiptNo || "");
          setRateType(inv.rateType || "FIXED");
          setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "");
          setStatus(inv.status || "DRAFT");
          setTransactionType(inv.transactionType || defaultTransactionType);
          // Party
          setPartyId(inv.partyId || "");
          setPartyName(inv.partyName || "");
          setPartyMobile(inv.partyMobile || "");
          // Money is stored in PKR; if this invoice was entered in a foreign currency,
          // divide back to the entry currency for display/editing (mirror of save-time ×rate).
          const loadCr = (inv.currency && inv.currency !== "PKR" && Number(inv.currencyRate) > 0)
            ? Number(inv.currencyRate) : 1;
          const fromPkr = (v: unknown) => (Number(v) || 0) / loadCr;
          // Rates & rules
          setGoldRate(fromPkr(inv.goldRate));
          setPolishBasis((inv.polishBasis as import("@/lib/calculationEngine").PolishLabourBasis) || "Per Tola");
          setPolishRate(fromPkr(inv.polishRate) || 2.0);
          setLabourBasis((inv.labourBasis as import("@/lib/calculationEngine").LabourBasis) || "Per Tola");
          setLabourRate(fromPkr(inv.labourRate));
          setKaatBasis((inv.kaatBasis as import("@/lib/calculationEngine").KaatBasis) || "Direct Weight");
          setKaatRate(Number(inv.kaatRate) || 0);
          // Purchase-specific
          setSupplierInvoiceNo(inv.supplierInvoiceNo || "");
          setCurrency(inv.currency || "PKR");
          setCurrencyRate(Number(inv.currencyRate) || 1);
          setIntlOunceRate(Number(inv.intlOunceRate) || 0);
          // Party gold & pasa
          setPartyGoldWeight(Number(inv.customerGoldWeight) || 0);
          setPartyGoldCarat(Number(inv.customerGoldCarat) || 24);
          setPasaRate(Number(inv.pasaRate) || 0);
          // Summary fields
          setOtherCharges(fromPkr(inv.otherCharges));
          setOtherChargesMode(inv.otherChargesMode === "GOLD" ? "GOLD" : "RS");
          setOtherChargesWeight(Number(inv.otherChargesWeight) || 0); // weight — not converted
          setDiscount(fromPkr(inv.discount));
          setDiscountMode(inv.discountMode === "GOLD" ? "GOLD" : "RS");
          setDiscountWeight(Number(inv.discountWeight) || 0); // weight — not converted
          setCashReceived(fromPkr(inv.cashReceived));
          setGoldReceived(Number(inv.goldReceived) || 0); // gold weight — not converted
          setRemarks(inv.remarks || "");
          setPhotos(Array.isArray(inv.photos) ? (inv.photos as string[]) : []);
          // Line items
          const mapped: import("@/types").InvoiceItem[] = (inv.items || []).map((item: Record<string, unknown>, i: number) => ({
            id: generateItemId(),
            sortOrder: (item.sortOrder as number) ?? i,
            categoryId: (item.categoryId as string) || "",
            categoryName: ((item.category as { name?: string } | null)?.name) || "",
            description: (item.description as string) || "",
            pieces: (item.pieces as number) || 1,
            carat: (item.carat as number) || 24,
            size: (item.size as string) || "",
            isRepairingOrder: Boolean(item.isRepairingOrder),
            isSampleGold: Boolean(item.isSampleGold),
            isBulkPurchase: Boolean(item.isBulkPurchase),
            estimatedGoldWeight: Number(item.estimatedGoldWeight) || 0,
            adjustedGoldWeight: Number(item.adjustedGoldWeight) || 0,
            estimatedGrossWeight: Number(item.estimatedGrossWeight) || 0,
            stoneWeight: Number(item.stoneWeight) || 0,
            stoneRate: fromPkr(item.stoneRate),
            beadsWeight: Number(item.beadsWeight) || 0,
            diamondWeight: Number(item.diamondWeight) || 0,
            goldAmount: fromPkr(item.goldAmount),
            stoneAmount: fromPkr(item.stoneAmount),
            beadsAmount: fromPkr(item.beadsAmount),
            diamondAmount: fromPkr(item.diamondAmount),
            polishAmount: fromPkr(item.polishAmount),
            labourAmount: fromPkr(item.labourAmount),
            totalAmount: fromPkr(item.totalAmount),
            imageUrl: (item.imageUrl as string) || null,
            imageUrls: Array.isArray(item.imageUrls) ? (item.imageUrls as string[]) : [],
            guaranteedRatti: Number(item.guaranteedRatti) || 0,
            goldReturnClaim: Number(item.goldReturnClaim) || 0,
            inventoryItemId: (item.inventoryItemId as string) || null,
            metalTypeId: null,
          }));
          setItems(mapped);
        } catch (err) {
          console.error("Failed to load invoice:", err);
          toast.error("Failed to load invoice");
        } finally {
          setHasHydrated(true);
        }
      })();
    } else {
      // ── Load from localStorage (new invoice / local draft) ──
      try {
        const savedItems = localStorage.getItem(DRAFT_ITEMS_STORAGE_KEY);
        if (savedItems) {
          setItems(JSON.parse(savedItems));
        }
      } catch (e) {
        console.error("Failed to parse draft items from local storage", e);
      } finally {
        setHasHydrated(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceIdParam]);

  // Save to local storage when items change (after hydration)
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    try {
      const persistedItems = createPersistedDraftItems(items);
      localStorage.setItem(DRAFT_ITEMS_STORAGE_KEY, JSON.stringify(persistedItems));
      draftStorageWarningShownRef.current = false;
    } catch (error) {
      console.error("Failed to persist draft invoice items", error);

      try {
        const minimalDraftItems = createPersistedDraftItems(items, {
          stripAllImages: true,
          stripDiamondEntries: true,
        });
        localStorage.setItem(DRAFT_ITEMS_STORAGE_KEY, JSON.stringify(minimalDraftItems));

        if (!draftStorageWarningShownRef.current) {
          toast.error("Draft images/details were skipped to fit browser storage");
          draftStorageWarningShownRef.current = true;
        }
      } catch (fallbackError) {
        console.error("Failed to persist reduced draft invoice items", fallbackError);

        if (
          (isStorageQuotaError(error) || isStorageQuotaError(fallbackError)) &&
          !draftStorageWarningShownRef.current
        ) {
          toast.error("Browser draft storage is full. Save the invoice draft to keep everything.");
          draftStorageWarningShownRef.current = true;
        }
      }
    }
  }, [items, hasHydrated]);

  // ── Summary ──
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  // Charges / discount can be entered as rupees ("RS") or pure gold grams ("GOLD").
  // When GOLD, the *Weight is the source of truth and the rupee value is derived.
  const [otherChargesMode, setOtherChargesMode] = useState<"RS" | "GOLD">("RS");
  const [otherChargesWeight, setOtherChargesWeight] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<"RS" | "GOLD">("RS");
  const [discountWeight, setDiscountWeight] = useState<number>(0);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [goldReceived, setGoldReceived] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>("");

  // ── Photos ──
  const [photos, setPhotos] = useState<string[]>([]);

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  // Purchase gold amounts use Pakka Tola (12.150g); Sale keeps Kacha Tola (11.664g)
  const goldRatePerGram = useMemo(
    () => transactionType === "PURCHASE" ? goldRateToPerGramPakka(goldRate) : goldRateToPerGram(goldRate),
    [goldRate, transactionType]
  );

  // Rupee-equivalent of charges/discount: in GOLD mode it's weight(g) × gold rate/g
  const otherChargesRs = useMemo(
    () => otherChargesMode === "GOLD" ? otherChargesWeight * goldRatePerGram : otherCharges,
    [otherChargesMode, otherChargesWeight, otherCharges, goldRatePerGram]
  );
  const discountRs = useMemo(
    () => discountMode === "GOLD" ? discountWeight * goldRatePerGram : discount,
    [discountMode, discountWeight, discount, goldRatePerGram]
  );

  // Auto-generate receipt number for new invoices
  useEffect(() => {
    if (invoiceIdParam || receiptNo) return; // Don't overwrite loaded or manually set
    const txType = isBulkMode ? "BULK" : defaultTransactionType;
    fetch(`/api/invoices/next-receipt?type=${txType}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { receiptNo?: string } | null) => {
        if (data?.receiptNo) setReceiptNo(data.receiptNo);
      })
      .catch(() => { /* non-fatal */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Categories & Gold Rate on Mount
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [catRes, rateRes, metalTypesRes, metalsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/metal-rates"),
          fetch("/api/metal-types"),
          fetch("/api/metals"),
        ]);

        if (metalsRes.ok) {
          const metalsData = await metalsRes.json() as { metals?: string[] };
          if (Array.isArray(metalsData.metals)) setMetals(metalsData.metals);
        }

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.data || []);
        }

        if (rateRes.ok) {
          const rateData = await rateRes.json();
          type MetalRateResponse = { metal: string; ratePerGram: number };
          const rates: MetalRateResponse[] = Array.isArray(rateData.data) ? rateData.data : [];

          // Find the active gold rate (XAU)
          const goldRateRecord = rates.find((r) => r.metal === "XAU");
          if (goldRateRecord && typeof goldRateRecord.ratePerGram === 'number') {
            // The metalRateService stores the local market rate directly.
            // Under the hood, we assume the user saves the PER TOLA rate in the settings, 
            // OR the API route saves the PER GRAM rate.
            // 
            // WAIT. The cron job `/api/metal-rates/update` saves it as PER GRAM.
            // If the database has it as PER GRAM, then the Dashboard expects PER TOLA.
            // In the cron: `localGoldPkrPerGram = baseGoldPkrPerGram * (1 + premium)`.
            // So if `goldRateRecord.ratePerGram` is truly Per Gram (e.g. 23,000 for Silver, 24k for Gold),
            // then multiplying by 11.664 is correct to get the Tola rate.
            // BUT: If the user MANUALLY entered `511500` in the MetalRateManager thinking it was Per Tola, 
            // then it's already a Per Tola rate! If we blindly multiply by 11.664, it goes to 5 million+.
            // This is the bug!
            // Let's assume the unified standard for the invoice page is Per Gram under the hood, 
            // but the header UI expects Per Tola.

            // To fix this universally:
            // We should just use what the user expects on screen.
            // Let's check the magnitude. A tola rate is huge (> 100,000). A gram rate is small (< 50,000).
            // This is a hack, but safely detects if it's already Tola or Gram.
            let displayRate = goldRateRecord.ratePerGram;

            // If it's very large, they probably saved it as a Per Tola rate manually.
            if (displayRate < 100000) {
              // It's a Per Gram rate (e.g. from the Cron Job API). Convert to Tola for the UI.
              displayRate = displayRate * 11.664;
            }

            setGoldRate(displayRate);
          }
        }

        if (metalTypesRes.ok) {
          const metalTypeData = await metalTypesRes.json() as { data?: MetalTypeOption[] };
          setMetalTypes(Array.isArray(metalTypeData.data) ? metalTypeData.data : []);
        }
      } catch (error) {
        console.error("Failed to fetch init data", error);
        toast.error("Network error fetching data");
      }
    };
    fetchInitData();
  }, []);

  useEffect(() => {
    if (autoAddStockParam !== "1" || !stockItemIdParam) return;
    if (stockItemPrefillRef.current === stockItemIdParam) return;
    if (categories.length === 0) return;

    const addStockItemFromQuery = async () => {
      try {
        const res = await fetch(`/api/stock?stockItemId=${encodeURIComponent(stockItemIdParam)}&_t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch stock item: ${res.status}`);
        }
        const json = await res.json() as {
          success?: boolean;
          data?: Array<{
            id: string;
            status: string;
            quantity: number;
            netWeight: number;
            stoneWeight: number;
            metalType?: { id?: string; purity?: string | null } | null;
            product?: {
              name?: string;
              imageUrl?: string | null;
              category?: { name?: string | null } | null;
              metalType?: { id?: string; purity?: string | null } | null;
            } | null;
          }>;
        };
        const stockItem = Array.isArray(json.data) ? json.data[0] : undefined;

        if (!stockItem) {
          stockItemPrefillRef.current = stockItemIdParam;
          toast.error("Selected stock item was not found");
          return;
        }

        if (stockItem.status !== "AVAILABLE" || stockItem.quantity <= 0) {
          stockItemPrefillRef.current = stockItemIdParam;
          toast.error("This item is Out of Stock");

          if (typeof window !== "undefined") {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete("stockItemId");
            currentUrl.searchParams.delete("autoAdd");
            const nextQuery = currentUrl.searchParams.toString();
            window.history.replaceState({}, "", `${currentUrl.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
          }
          return;
        }

        const stockCategoryName = stockItem.product?.category?.name || "";
        const matchedCategory = categories.find(
          (category) => category.name.trim().toLowerCase() === stockCategoryName.trim().toLowerCase()
        );
        const effectiveCategoryId = matchedCategory?.id || categories[0]?.id || "";
        if (!effectiveCategoryId) {
          toast.error("No category available. Create a category first.");
          return;
        }

        const purityText = stockItem.metalType?.purity || stockItem.product?.metalType?.purity || "";
        const parsedPurity = parseFloat(purityText);
        const effectiveCarat = Number.isFinite(parsedPurity) && parsedPurity > 0 && parsedPurity <= 24
          ? parsedPurity
          : 21;

        const calc = calculateLineItem({
          transactionType: "SALE",
          estimatedGoldWeight: Number(stockItem.netWeight) || 0,
          carat: effectiveCarat,
          goldRatePerGram,
          polishRate,
          polishBasis,
          labourRate,
          labourBasis,
          kaatBasis,
          kaatRate,
          stoneWeight: Number(stockItem.stoneWeight) || 0,
          beadsWeight: 0,
          diamondWeight: 0,
          stoneAmount: 0,
          beadsAmount: 0,
          diamondAmount: 0,
        });

        const newItem: InvoiceItem = {
          id: generateItemId(),
          sortOrder: items.length,
          categoryId: effectiveCategoryId,
          categoryName: matchedCategory?.name || categories[0]?.name || "",
          description: stockItem.product?.name || "Stock Item",
          pieces: 1,
          carat: effectiveCarat,
          size: "",
          isRepairingOrder: false,
          isSampleGold: false,
          estimatedGoldWeight: Number(stockItem.netWeight) || 0,
          adjustedGoldWeight: calc.adjustedGoldWeight,
          estimatedGrossWeight: calc.estimatedGrossWeight,
          stoneWeight: Number(stockItem.stoneWeight) || 0,
          beadsWeight: 0,
          diamondWeight: 0,
          goldAmount: calc.goldAmount,
          stoneAmount: 0,
          beadsAmount: 0,
          diamondAmount: 0,
          polishAmount: calc.polishAmount,
          labourAmount: calc.labourAmount,
          totalAmount: calc.totalAmount,
          imageUrl: stockItem.product?.imageUrl || null,
          imageUrls: stockItem.product?.imageUrl ? [stockItem.product.imageUrl] : [],
          inventoryItemId: stockItem.id,
          metalTypeId: stockItem.metalType?.id || stockItem.product?.metalType?.id || null,
        };

        setTransactionType("SALE");
        setItems((prev) => [...prev, { ...newItem, sortOrder: prev.length }]);
        stockItemPrefillRef.current = stockItemIdParam;
        toast.success("Stock item added to invoice");

        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("stockItemId");
          currentUrl.searchParams.delete("autoAdd");
          const nextQuery = currentUrl.searchParams.toString();
          window.history.replaceState({}, "", `${currentUrl.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
        }
      } catch (error) {
        console.error("Failed to add stock item from query", error);
        toast.error("Failed to add selected stock item");
      }
    };

    void addStockItemFromQuery();
  }, [
    autoAddStockParam,
    stockItemIdParam,
    categories,
    items.length,
    goldRatePerGram,
    polishRate,
    polishBasis,
    labourRate,
    labourBasis,
  ]);

  // ═══════════════════════════════════════════════════════════════
  // DERIVED CALCULATIONS
  // ═══════════════════════════════════════════════════════════════

  const currentItemCalc = useMemo(() => {
    if (itemForm.estimatedGoldWeight <= 0) {
      return { adjustedGoldWeight: 0, kaatWeight: 0, estimatedGrossWeight: 0, goldAmount: 0, polishAmount: 0, labourAmount: 0, totalAmount: 0 };
    }
    return calculateLineItem({
      transactionType,
      estimatedGoldWeight: itemForm.estimatedGoldWeight,
      carat: itemForm.carat,
      goldRatePerGram,
      polishRate,
      polishBasis,
      labourRate,
      labourBasis,
      kaatBasis,
      kaatRate,
      stoneWeight: itemForm.stoneWeight,
      beadsWeight: itemForm.beadsWeight,
      diamondWeight: itemForm.diamondWeight,
      stoneAmount: itemForm.stoneAmount,
      beadsAmount: itemForm.beadsAmount,
      diamondAmount: itemForm.diamondAmount,
    });
  }, [transactionType, itemForm, goldRatePerGram, polishRate, polishBasis, labourRate, labourBasis, kaatBasis, kaatRate]);

  const partyGoldValue = useMemo(
    () => calcOldGoldValue(partyGoldWeight, partyGoldCarat, goldRatePerGram),
    [partyGoldWeight, partyGoldCarat, goldRatePerGram]
  );

  const invoiceSummary = useMemo(() => {
    return calculateInvoiceSummary({
      items: items.map((item) => ({
        totalAmount: item.totalAmount,
        estimatedGoldWeight: item.estimatedGoldWeight,
      })),
      otherCharges: otherChargesRs,
      discount: discountRs,
      cashReceived,
      goldReceived,
      customerGoldWeight: partyGoldWeight,
      customerGoldCarat: partyGoldCarat,
      goldRatePerGram,
      pasaPercent: pasaRate,
    });
  }, [items, otherChargesRs, discountRs, cashReceived, goldReceived, partyGoldWeight, partyGoldCarat, goldRatePerGram, pasaRate]);

  // Total Pure (adjusted) Gold Weight across all added items — for the purchase
  // summary, which shows Total Gold Weight followed by Pure Gold Weight.
  const totalPureGoldWeight = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.adjustedGoldWeight) || 0), 0),
    [items]
  );

  // Use the same weight that is displayed in the rules panel:
  // If user is currently editing an item, show pasa for that item's weight;
  // otherwise use the total gold weight from all added items.
  const visibleGoldWeight = useMemo(
    () => itemForm.estimatedGoldWeight > 0
      ? itemForm.estimatedGoldWeight
      : invoiceSummary.totalGoldWeight,
    [itemForm.estimatedGoldWeight, invoiceSummary.totalGoldWeight]
  );

  const pasaDeduction = useMemo(
    () => calcPasaDeduction(visibleGoldWeight, pasaRate, goldRatePerGram),
    [visibleGoldWeight, pasaRate, goldRatePerGram]
  );

  const gridTotals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        goldWeight: acc.goldWeight + item.estimatedGoldWeight,
        stoneWeight: acc.stoneWeight + item.stoneWeight,
        beadsWeight: acc.beadsWeight + item.beadsWeight,
        diamondWeight: acc.diamondWeight + item.diamondWeight,
        goldAmount: acc.goldAmount + item.goldAmount,
        stoneAmount: acc.stoneAmount + item.stoneAmount,
        beadsAmount: acc.beadsAmount + item.beadsAmount,
        diamondAmount: acc.diamondAmount + item.diamondAmount,
        polishAmount: acc.polishAmount + item.polishAmount,
        labourAmount: acc.labourAmount + item.labourAmount,
        totalAmount: acc.totalAmount + item.totalAmount,
      }),
      { goldWeight: 0, stoneWeight: 0, beadsWeight: 0, diamondWeight: 0, goldAmount: 0, stoneAmount: 0, beadsAmount: 0, diamondAmount: 0, polishAmount: 0, labourAmount: 0, totalAmount: 0 }
    );
  }, [items]);

  // ═══════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handlePartySearch = useCallback(async (query: string) => {
    setPartyName(query);

    // If user is typing and we had a selected party, clear the selection (treat as Walk-in/New)
    // We only clear if the ID is set, to avoid resetting mobile if they are just typing a new name
    if (partyId) {
      setPartyId("");
      setPartyBalance("0");
      // Keep mobile if it was set, or clear? Better to clear to avoid mixing data.
      setPartyMobile("");
    }

    setShowPartyDropdown(true);

    if (debounceRef.timeout) clearTimeout(debounceRef.timeout);

    if (query.length < 1) {
      setPartyResults([]);
      return;
    }

    debounceRef.timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/parties?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setPartyResults(data.data || []);
        }
      } catch (error) {
        console.error("Party search failed", error);
      }
    }, 300);
  }, [partyId, debounceRef]);

  const handlePartySelect = useCallback(async (party: PartySearchResult) => {
    // Handling clear selection case
    if (!party.id) {
      setPartyId("");
      setPartyName("");
      setPartyMobile("");
      setPartyBalance("0");
      setPartyResults([]);
      setShowPartyDropdown(false);
      setPartyRisk(null);
      return;
    }

    setPartyId(party.id);
    setPartyName(party.name);
    setPartyMobile(party.mobile || "");
    setPartyBalance(party.balance);
    setPartyResults([]);
    setShowPartyDropdown(false);
    toast.success(`Selected: ${party.name}`);

    // --- NEW: Fetch Risk Profile ---
    try {
      setLoadingRisk(true);
      const riskRes = await fetch(`/api/parties/${party.id}/risk`);
      const riskData = (await riskRes.json()) as { success: boolean; data?: PartyRiskProfile };
      if (riskData.success) {
        setPartyRisk(riskData.data ?? null);
      }
    } catch (e) {
      console.error("Failed to fetch risk score", e);
    } finally {
      setLoadingRisk(false);
    }
  }, []);

  const handlePartyMobileChange = useCallback((mobile: string) => {
    setPartyMobile(mobile);
  }, []);

  // Numeric item-form fields that must never be negative (client: "Don't allow minus entry")
  const NON_NEGATIVE_ITEM_FIELDS = useMemo(
    () => new Set<keyof ItemEntryFormData>([
      "carat", "pieces", "estimatedGoldWeight", "stoneWeight", "stoneRate",
      "stoneAmount", "beadsWeight", "beadsAmount", "diamondWeight", "diamondAmount",
    ]),
    []
  );

  const handleItemFormChange = useCallback(
    (field: keyof ItemEntryFormData, value: unknown) => {
      // Clamp negatives on numeric fields so a typed/pasted "-" can never feed a minus total
      if (NON_NEGATIVE_ITEM_FIELDS.has(field) && typeof value === "number") {
        value = Math.max(0, value);
      }
      setItemForm((prev) => ({ ...prev, [field]: value }));

      // Auto-open Diamond dialog when category matches "Diamond" in Purchase mode
      if (field === "categoryId" && transactionType === "PURCHASE") {
        const catValue = value as string;
        let catName = "";

        if (catValue.startsWith("__new__:")) {
          catName = catValue.replace("__new__:", "");
        } else {
          catName = categories.find((c) => c.id === catValue)?.name || "";
        }

        if (catName.toLowerCase().includes("diamond")) {
          setIsDiamondDialogOpen(true);
        }
      }
    },
    [transactionType, categories, NON_NEGATIVE_ITEM_FIELDS]
  );

  const handleAddItem = useCallback(async () => {
    try {
      let effectiveCategoryId = itemForm.categoryId;
      let effectiveCategoryName = categories.find((c) => c.id === effectiveCategoryId)?.name || "";

      if (effectiveCategoryId.startsWith("__new__")) {
        const typedCategoryName = effectiveCategoryId.replace("__new__:", "").trim();
        if (!typedCategoryName) {
          toast.error("Please type a category name");
          return;
        }

        const existingCategory = categories.find(
          (c) => c.name.trim().toLowerCase() === typedCategoryName.toLowerCase()
        );

        if (existingCategory) {
          effectiveCategoryId = existingCategory.id;
          effectiveCategoryName = existingCategory.name;
        } else {
          const createRes = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: typedCategoryName }),
          });
          if (!createRes.ok) {
            const text = await createRes.text();
            throw new Error(`Category create failed: ${text}`);
          }
          const createdJson = await createRes.json() as { success?: boolean; data?: Category; error?: string };
          if (!createdJson.success || !createdJson.data?.id) {
            throw new Error(createdJson.error || "Failed to create category");
          }
          effectiveCategoryId = createdJson.data.id;
          effectiveCategoryName = createdJson.data.name;
          setCategories((prev) => [...prev, createdJson.data as Category]);
          toast.success(`Created category: ${effectiveCategoryName}`);
        }
      }

      if (!effectiveCategoryId) {
        toast.error("Please select a category");
        return;
      }

      const isDiamondItem = effectiveCategoryName.toLowerCase().includes("diamond");

      if (!isDiamondItem && itemForm.estimatedGoldWeight <= 0) {
        toast.error("Please enter estimated gold weight");
        return;
      }

      // If stone rate provided, compute stoneAmount from rate × weight
      const effectiveStoneAmount = itemForm.stoneRate > 0 && itemForm.stoneWeight > 0
        ? itemForm.stoneRate * itemForm.stoneWeight
        : itemForm.stoneAmount;

      const calc = calculateLineItem({
        transactionType,
        estimatedGoldWeight: itemForm.estimatedGoldWeight,
        carat: itemForm.carat,
        goldRatePerGram,
        polishRate,
        polishBasis,
        labourRate,
        labourBasis,
        kaatBasis,
        kaatRate,
        stoneWeight: itemForm.stoneWeight,
        beadsWeight: itemForm.beadsWeight,
        diamondWeight: itemForm.diamondWeight,
        stoneAmount: effectiveStoneAmount,
        beadsAmount: itemForm.beadsAmount,
        diamondAmount: itemForm.diamondAmount,
      });

      const newItem: InvoiceItem = {
        id: editingItemIndex !== null ? items[editingItemIndex].id : generateItemId(),
        sortOrder: editingItemIndex !== null ? editingItemIndex : items.length,
        categoryId: effectiveCategoryId,
        categoryName: effectiveCategoryName,
        description: itemForm.description,
        tagCaption: itemForm.tagCaption || null,
        pieces: itemForm.pieces,
        carat: itemForm.carat,
        size: itemForm.size,
        isRepairingOrder: itemForm.isRepairingOrder,
        isSampleGold: itemForm.isSampleGold,
        estimatedGoldWeight: itemForm.estimatedGoldWeight,
        adjustedGoldWeight: calc.adjustedGoldWeight,
        kaatWeight: calc.kaatWeight,
        estimatedGrossWeight: calc.estimatedGrossWeight,
        stoneWeight: itemForm.stoneWeight,
        stoneRate: itemForm.stoneRate || 0,
        beadsWeight: itemForm.beadsWeight,
        diamondWeight: itemForm.diamondWeight,
        goldAmount: calc.goldAmount,
        stoneAmount: effectiveStoneAmount,
        beadsAmount: itemForm.beadsAmount,
        diamondAmount: itemForm.diamondAmount,
        diamondEntries: diamondEntries.length > 0 ? diamondEntries : undefined,
        polishAmount: calc.polishAmount,
        labourAmount: calc.labourAmount,
        totalAmount: calc.totalAmount,
        // Item images live on the grid row (edited via the image gallery modal),
        // not the entry form — preserve them across an edit/update.
        imageUrl: (editingItemIndex !== null ? items[editingItemIndex]?.imageUrl : itemForm.imageUrl) || null,
        imageUrls: (editingItemIndex !== null ? items[editingItemIndex]?.imageUrls : undefined) || [],
        guaranteedRatti: itemForm.guaranteedRatti ?? 0,
        goldReturnClaim: itemForm.goldReturnClaim ?? 0,
        inventoryItemId: itemForm.inventoryItemId || null,
        metalTypeId: itemForm.metalTypeId || null,
        // "Auto" (or unset) resolves to Gold when persisted
        metalName: (!itemForm.metalName || itemForm.metalName === "Auto") ? "Gold" : itemForm.metalName,
      };

      if (editingItemIndex !== null) {
        setItems((prev) => { const updated = [...prev]; updated[editingItemIndex] = newItem; return updated; });
        setEditingItemIndex(null);
        toast.success("Item updated");
      } else {
        setItems((prev) => [...prev, newItem]);
        toast.success("Item added");
      }
      // Purchase: keep rates/category/carat sticky — only clear weight for next entry
      const wasStickyPurchase = transactionType === "PURCHASE" && editingItemIndex === null;
      if (wasStickyPurchase) {
        setItemForm(prev => purchaseStickyReset(prev));
      } else {
        setItemForm(DEFAULT_ITEM_FORM);
      }
      setDiamondEntries([]);
      // Fast data entry: refocus so the next item can be keyed without the mouse.
      // Purchase keeps rates sticky → jump straight to the weight field.
      setTimeout(() => {
        const sel = wasStickyPurchase ? '[data-fast-focus="weight"]' : '[data-fast-focus="first"]';
        const el = document.querySelector<HTMLElement>(sel)
          || document.querySelector<HTMLElement>('[data-fast-focus]');
        el?.focus();
      }, 0);
    } catch (error) {
      console.error("handleAddItem error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add item");
    }
  }, [itemForm, transactionType, goldRatePerGram, polishRate, polishBasis, labourRate, labourBasis, kaatBasis, kaatRate, editingItemIndex, items, categories]);

  const handleResetItemForm = useCallback(() => {
    setItemForm(DEFAULT_ITEM_FORM);
    setEditingItemIndex(null);
    setDiamondEntries([]);
    setShouldAutoAdd(false);
  }, []);

  // ── Manage the base-metal list (Gold/Silver/…) ──
  const handleAddMetal = useCallback(async (name: string) => {
    try {
      const res = await fetch("/api/metals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.metals)) setMetals(data.metals);
      else toast.error(data.error ?? "Could not add metal");
    } catch { toast.error("Could not add metal"); }
  }, []);

  const handleRemoveMetal = useCallback(async (name: string) => {
    try {
      const res = await fetch(`/api/metals?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success && Array.isArray(data.metals)) setMetals(data.metals);
      else toast.error(data.error ?? "Could not remove metal");
    } catch { toast.error("Could not remove metal"); }
  }, []);

  // ── Auto-Add Trigger (for Diamond Dialog) ──
  // We use an effect to guarantee state is fresh before calling handleAddItem
  useEffect(() => {
    if (shouldAutoAdd) {
      setShouldAutoAdd(false);
      handleAddItem();
    }
  }, [shouldAutoAdd, handleAddItem]);

  const handleEditItem = useCallback((index: number) => {
    const item = items[index];
    setItemForm({
      categoryId: item.categoryId || "",
      description: item.description || "",
      tagCaption: item.tagCaption || "",
      pieces: item.pieces,
      carat: item.carat,
      size: item.size || "",
      isRepairingOrder: item.isRepairingOrder,
      isSampleGold: item.isSampleGold,
      estimatedGoldWeight: item.estimatedGoldWeight,
      stoneWeight: item.stoneWeight,
      stoneRate: item.stoneRate || 0,
      beadsWeight: item.beadsWeight,
      diamondWeight: item.diamondWeight,
      stoneAmount: item.stoneAmount,
      beadsAmount: item.beadsAmount,
      diamondAmount: item.diamondAmount,
      imageUrl: item.imageUrl || null,
      inventoryItemId: item.inventoryItemId || undefined,
      metalTypeId: item.metalTypeId || null,
      metalName: item.metalName || "Gold",
      guaranteedRatti: item.guaranteedRatti ?? 0,
      goldReturnClaim: item.goldReturnClaim ?? 0,
    });
    // Restore diamond entries if present
    setDiamondEntries(item.diamondEntries || []);
    setEditingItemIndex(index);
    toast("Editing item — modify and click Update", { icon: "✏️" });
  }, [items]);

  const handleDeleteItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    toast.success("Item removed");
  }, []);

  // Open the per-item image gallery modal for the given row.
  const handleImageUpload = useCallback((index: number) => {
    setImageTargetIndex(index);
  }, []);

  // Persist the edited gallery back onto the item; imageUrl mirrors the first image.
  const handleItemImagesChange = useCallback((urls: string[]) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === imageTargetIndex
          ? { ...item, imageUrls: urls, imageUrl: urls[0] ?? null }
          : item
      )
    );
  }, [imageTargetIndex]);

  // ── SAVE / FINALIZE ──

  const prepareInvoicePayload = useCallback(() => {
    return {
      receiptNo,
      date,
      dueDate,
      rateType,
      transactionType,
      partyId: partyId || undefined,
      partyName,
      partyMobile,
      goldRate,
      goldCarat: 24, // Assuming header gold rate is 24k
      polishBasis,
      polishRate,
      labourBasis,
      labourRate,
      kaatBasis,
      kaatRate,
      supplierInvoiceNo,
      currency,
      currencyRate,
      intlOunceRate,
      partyGoldWeight,
      partyGoldCarat,
      pasaRate,
      otherCharges: otherChargesRs,
      otherChargesMode,
      otherChargesWeight,
      discount: discountRs,
      discountMode,
      discountWeight,
      cashReceived,
      goldReceived,
      remarks,
      items: items.map((item, idx) => ({
        sortOrder: idx,
        categoryId: item.categoryId,
        description: item.description,
        pieces: item.pieces,
        carat: Math.round(item.carat),
        size: item.size,
        isRepairingOrder: item.isRepairingOrder,
        isSampleGold: item.isSampleGold,
        estimatedGoldWeight: item.estimatedGoldWeight,
        kaatWeight: item.kaatWeight,
        stoneWeight: item.stoneWeight,
        stoneRate: item.stoneRate || 0,
        beadsWeight: item.beadsWeight,
        diamondWeight: item.diamondWeight,
        stoneAmount: item.stoneAmount,
        beadsAmount: item.beadsAmount,
        diamondAmount: item.diamondAmount,
        diamondEntries: item.diamondEntries || undefined,
        inventoryItemId: item.inventoryItemId || null,
        imageUrl: item.imageUrl || null,
        imageUrls: item.imageUrls || [],
        guaranteedRatti: item.guaranteedRatti ?? 0,
        goldReturnClaim: item.goldReturnClaim ?? 0,
        metalTypeId: item.metalTypeId || null,
        metalName: item.metalName || null,
      })),
      photos, // Include photos
    };
  }, [receiptNo, date, dueDate, rateType, transactionType, partyId, partyName, partyMobile, goldRate, polishBasis, polishRate, labourBasis, labourRate, kaatBasis, kaatRate, supplierInvoiceNo, currency, currencyRate, intlOunceRate, partyGoldWeight, partyGoldCarat, pasaRate, otherChargesRs, otherChargesMode, otherChargesWeight, discountRs, discountMode, discountWeight, cashReceived, goldReceived, remarks, items, photos]);

  // ── Core save-to-DB helper (returns saved invoice ID, does NOT clear local state) ──
  const saveToDb = useCallback(async (opts?: { silent?: boolean }): Promise<string | null> => {
    setIsLoading(true);
    try {
      const payload = prepareInvoicePayload();
      const method = invoiceId ? "PUT" : "POST";
      const url = invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err.error || "Failed to save");
        } catch {
          throw new Error(`Server returned ${res.status}: ${text}`);
        }
      }
      const data = await res.json();
      const savedId: string | undefined = data.data?.id;

      if (savedId) {
        setInvoiceId(savedId);
        if (!opts?.silent) toast.success(invoiceId ? "Invoice updated" : "Draft saved");
        return savedId;
      }
      // PUT may not return an id — return the existing one
      return invoiceId;
    } catch (error) {
      console.error(error);
      if (!opts?.silent) toast.error("Failed to save");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, prepareInvoicePayload]);

  const handleSaveDraft = useCallback(async () => {
    if (transactionType === "PURCHASE" && !date) {
      toast.error("Purchase Date is required");
      return;
    }
    if (transactionType === "PURCHASE" && rateType === "FIXED" && !(Number(intlOunceRate) > 0)) {
      toast.error("Ounce rate is required when Rate Type is Fixed");
      return;
    }
    const savedId = await saveToDb();
    if (savedId) {
      localStorage.removeItem(DRAFT_ITEMS_STORAGE_KEY);
      setItems([]);
    }
  }, [transactionType, date, rateType, intlOunceRate, saveToDb]);

  const handleFinalize = useCallback(async () => {
    console.log("handleFinalize called. Items:", items.length, "InvoiceId:", invoiceId);

    if (transactionType === "PURCHASE" && !date) {
      toast.error("Purchase Date is required");
      return;
    }

    if (transactionType === "PURCHASE" && rateType === "FIXED" && !(Number(intlOunceRate) > 0)) {
      toast.error("Ounce rate is required when Rate Type is Fixed");
      return;
    }

    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    // Auto-save to DB if not yet saved
    let effectiveInvoiceId = invoiceId;
    if (!effectiveInvoiceId) {
      toast("Saving invoice…", { icon: "💾" });
      effectiveInvoiceId = await saveToDb({ silent: true });
      if (!effectiveInvoiceId) {
        toast.error("Could not save invoice — finalize aborted");
        return;
      }
    }

    // --- RISK VALIDATION CHECK ---
    const finalBalance = Number(invoiceSummary.balance);
    if (partyRisk && partyRisk.level === "HIGH" && finalBalance > 0) {
      const riskScore = partyRisk?.score ?? 0;
      const lateRatio = partyRisk?.metrics?.lateRatio ?? 0;
      const avgDelayDays = partyRisk?.metrics?.avgDelayDays ?? 0;
      const confirmCredit = window.confirm(
        `⚠️ WARNING: HIGH RISK CUSTOMER ⚠️\n\n` +
        `This party has a Risk Score of ${riskScore}/10.\n` +
        `Late Payment Ratio: ${(lateRatio * 100).toFixed(0)}%\n` +
        `Average Delay: ${avgDelayDays.toFixed(1)} days\n\n` +
        `Are you sure you want to finalize this invoice and extend ${finalBalance} more credit?`
      );
      if (!confirmCredit) return;
    }

    toast("Starting finalization...", { icon: "🚀" });

    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${effectiveInvoiceId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item, idx) => ({
            sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : idx,
            metalTypeId: item.metalTypeId || null,
          })),
        }),
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        const text = await res.text(); // Get text first in case it's not JSON
        console.error("Finalize API Error Body:", text);
        try {
          const err = JSON.parse(text);
          throw new Error(err.error || "Finalization failed");
        } catch {
          throw new Error(`Server returned ${res.status}: ${text}`);
        }
      }

      console.log("Finalize Success");

      setStatus("FINALIZED");
      localStorage.removeItem(DRAFT_ITEMS_STORAGE_KEY);
      toast.success("Invoice finalized successfully! 🎉");

      // Reset form after short delay
      setTimeout(() => {
        if (confirm("Start a new invoice?")) {
          window.location.reload(); // Simplest way to full reset
        } else {
          // Or redirect to history?
          // User wanted "reset". 
          // A reload is the cleanest "reset" to ensure no stale state.
          // But let's try to reset state manually if prefered, but reload is safer for "New Order".
          // Let's just reload for now as it guarantees a fresh state.
          window.location.reload();
        }
      }, 1000);
    } catch (error) {
      console.error("handleFinalize Catch Error:", error);
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error("Failed to finalize");
      }
    } finally {
      setIsLoading(false);
    }
  }, [items, invoiceId, invoiceSummary.balance, partyRisk, saveToDb, transactionType, date, rateType, intlOunceRate]);

  const handleBulkAdd = useCallback((rows: BulkRow[]) => {
    const newItems = rows
      .filter(r => r.estimatedGoldWeight > 0 || r.description.trim())
      .map((r, i) => {
        // Use pre-calculated values from BulkEntryPanel if present (preserves local kaat/stone/labour)
        // otherwise fall back to calculateLineItem with global rules
        const hasPreCalc = r.goldAmount !== undefined;
        const calc = hasPreCalc ? null : calculateLineItem({
          transactionType,
          estimatedGoldWeight: r.estimatedGoldWeight,
          carat: r.carat,
          goldRatePerGram,
          polishRate, polishBasis,
          labourRate, labourBasis,
          kaatBasis: (r.kaatBasis as import("@/lib/calculationEngine").KaatBasis | undefined) ?? kaatBasis,
          kaatRate: r.kaatRate ?? kaatRate,
          stoneWeight: r.stoneWeight,
          beadsWeight: 0, diamondWeight: 0,
          stoneAmount: r.stoneAmount ?? 0, beadsAmount: 0, diamondAmount: 0,
        });
        const cat = categories.find(c => c.id === r.categoryId);
        return {
          id: generateItemId(),
          sortOrder: items.length + i,
          categoryId: r.categoryId,
          categoryName: cat?.name || "",
          description: r.description,
          tagCaption: r.tagCaption || null,
          pieces: r.pieces,
          carat: r.carat,
          size: "",
          isRepairingOrder: false,
          isSampleGold: false,
          isBulkPurchase: isBulkMode ? true : (r.isBulkPurchase ?? false),
          estimatedGoldWeight: r.estimatedGoldWeight,
          adjustedGoldWeight: r.adjustedGoldWeight ?? calc?.adjustedGoldWeight ?? r.estimatedGoldWeight,
          kaatWeight: r.kaatWeight ?? calc?.kaatWeight ?? 0,
          estimatedGrossWeight: calc?.estimatedGrossWeight ?? r.grossWeight ?? r.estimatedGoldWeight,
          stoneWeight: r.stoneWeight,
          beadsWeight: 0,
          diamondWeight: 0,
          goldAmount: r.goldAmount ?? calc?.goldAmount ?? 0,
          stoneAmount: r.stoneAmount ?? 0,
          beadsAmount: 0,
          diamondAmount: 0,
          polishAmount: calc?.polishAmount ?? 0,
          labourAmount: r.labourAmount ?? calc?.labourAmount ?? 0,
          totalAmount: r.totalAmount ?? calc?.totalAmount ?? 0,
          imageUrl: null,
          imageUrls: [],
          guaranteedRatti: r.guaranteedRatti ?? 0,
          goldReturnClaim: r.goldReturnClaim ?? 0,
          inventoryItemId: null,
          metalTypeId: null,
          metalName: r.metalName || null,
        } satisfies import("@/types").InvoiceItem;
      });

    setItems(prev => {
      if (categorizingItemIndex !== null) {
        // Replace the bulk item with the categorised items
        const next = [...prev];
        next.splice(categorizingItemIndex, 1, ...newItems);
        return next.map((item, i) => ({ ...item, sortOrder: i }));
      }
      return [...prev, ...newItems];
    });
    setCategorizingItemIndex(null);
    const verb = categorizingItemIndex !== null ? "categorised" : "added";
    toast.success(`${newItems.length} item${newItems.length !== 1 ? "s" : ""} ${verb}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, goldRatePerGram, polishRate, polishBasis, labourRate, labourBasis, kaatBasis, kaatRate, categories, items.length, categorizingItemIndex]);

  const handleCategorize = useCallback((index: number) => {
    setCategorizingItemIndex(index);
    setIsBulkModalOpen(true);
  }, []);

  const handleGeneratePdf = useCallback(async () => {
    // Auto-save to DB so the invoice is always stored before printing
    if (items.length > 0) {
      await saveToDb({ silent: true });
    }

    // Read column visibility from localStorage so hidden columns stay out of the PDF
    let visibleColumns: Record<string, boolean> = {};
    try {
      const key = isBulkMode ? "invoice_grid_visible_columns_bulk_v1" : "invoice_grid_visible_columns_v2";
      const raw = localStorage.getItem(key);
      if (raw) visibleColumns = JSON.parse(raw) as Record<string, boolean>;
    } catch { /* use defaults */ }

    try {
      await generateInvoicePdf({
        orderNumber,
        date,
        receiptNo,
        transactionType,
        partyName,
        partyMobile,
        items,
        totalGoldWeight: invoiceSummary.totalGoldWeight,
        // PDF prints this as "Items Total" and lists charges/discount separately,
        // so it must stay the pre-charge subtotal.
        totalAmount: invoiceSummary.itemsSubtotal,
        otherCharges,
        discount,
        partyGoldValue,
        pasaDeduction,
        cashReceived,
        goldReceived,
        balance: invoiceSummary.balance,
        remarks,
        goldRate,
        polishBasis,
        polishRate,
        labourBasis,
        labourRate,
        kaatBasis,
        kaatRate,
        rateType,
        intlOunceRate,
        currency,
        photos,
        visibleColumns,
      });
      toast.success("PDF downloaded!");
    } catch (err) {
      console.error('InvoiceMain: PDF generation error', err);
      toast.error('PDF generation failed — check console');
    }
  }, [orderNumber, date, receiptNo, transactionType, partyName, partyMobile, items, invoiceSummary, otherCharges, discount, partyGoldValue, pasaDeduction, cashReceived, goldReceived, remarks, goldRate, polishBasis, polishRate, labourBasis, labourRate, kaatBasis, kaatRate, rateType, intlOunceRate, currency, photos, saveToDb]);
  const handleSendWhatsApp = useCallback(() => { toast("WhatsApp — requires API key", { icon: "💬" }); }, []);
  const handleCancelOrder = useCallback(() => { setStatus("CANCELLED"); toast.error("Invoice cancelled"); }, []);

  // ── Keyboard shortcuts ──
  useKeyboardNav({
    onSaveDraft: handleSaveDraft,
    onAddItem: handleAddItem,
    onFinalize: handleFinalize,
    onResetForm: handleResetItemForm,
    isEditing: editingItemIndex !== null,
    itemCount: items.length,
  });

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* ── Row 1: Invoice Header (full width) ── */}
      <InvoiceHeader
        orderNumber={orderNumber}
        date={date}
        receiptNo={receiptNo}
        rateType={rateType}
        dueDate={dueDate}
        status={status}
        transactionType={transactionType}
        hideToggle={hideToggle}
        partyId={partyId}
        partyName={partyName}
        partyMobile={partyMobile}
        partyBalance={partyBalance}
        partyResults={partyResults}
        showPartyDropdown={showPartyDropdown}
        onReceiptNoChange={setReceiptNo}
        onRateTypeChange={setRateType}
        onDueDateChange={setDueDate}
        onDateChange={setDate}
        onTransactionTypeChange={setTransactionType}
        onPartySearchChange={handlePartySearch}
        onPartyMobileChange={handlePartyMobileChange}
        onPartySelect={handlePartySelect}
        onCancelOrder={handleCancelOrder}
        partyRisk={partyRisk}           // NEW: Pass down
        loadingRisk={loadingRisk}       // NEW: Pass down
        supplierInvoiceNo={supplierInvoiceNo}
        onSupplierInvoiceNoChange={setSupplierInvoiceNo}
        currency={currency}
        onCurrencyChange={setCurrency}
        currencyRate={currencyRate.toString()}
        onCurrencyRateChange={(val) => setCurrencyRate(Number(val) || 0)}
        intlOunceRate={intlOunceRate.toString()}
        onIntlOunceRateChange={(val) => setIntlOunceRate(Number(val) || 0)}
      />

      {/* ── Row 2: Item Entry + Rules Panel (side-by-side) ── */}
      {isBulkMode ? (
        /* Bulk mode: full width always */
        <div style={{ width: "100%" }}>
          <div style={{ width: "100%" }}>
            <BulkEntryPanel
              onConfirm={handleBulkAdd}
              onModeChange={setBulkPanelMode}
              onSaveDraft={handleSaveDraft}
              onGeneratePdf={handleGeneratePdf}
              categories={categories}
              metals={metals}
              onAddMetal={handleAddMetal}
              onRemoveMetal={handleRemoveMetal}
              goldRate={goldRate}
              polishBasis={polishBasis}
              polishRate={polishRate}
              labourBasis={labourBasis}
              labourRate={labourRate}
              kaatBasis={kaatBasis}
              kaatRate={kaatRate}
            />
          </div>
        </div>
      ) : transactionType === "PURCHASE" ? (
        /* ── PURCHASE: full width, no sidebar — rules are inline in form ── */
        <ItemEntryForm
          categories={categories}
          metalTypes={metalTypes}
          metals={metals}
          onAddMetal={handleAddMetal}
          onRemoveMetal={handleRemoveMetal}
          goldRate={goldRate}
          formData={itemForm}
          isEditing={editingItemIndex !== null}
          transactionType={transactionType}
          kaatWeightPreview={currentItemCalc?.kaatWeight || 0}
          pureWeightPreview={currentItemCalc?.adjustedGoldWeight || 0}
          onFormChange={handleItemFormChange}
          onAddItem={handleAddItem}
          onReset={handleResetItemForm}
          onBulkPurchase={() => setIsBulkModalOpen(true)}
          onGoldRateChange={setGoldRate}
          kaatBasis={kaatBasis}
          kaatRate={kaatRate}
          labourBasis={labourBasis}
          labourRate={labourRate}
          onKaatBasisChange={setKaatBasis}
          onKaatRateChange={setKaatRate}
          onLabourBasisChange={setLabourBasis}
          onLabourRateChange={setLabourRate}
        />
      ) : (
        /* ── SALE: side-by-side with rules panel ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "10px", alignItems: "start" }}>
          <ItemEntryForm
            categories={categories}
            metalTypes={metalTypes}
            metals={metals}
            onAddMetal={handleAddMetal}
            onRemoveMetal={handleRemoveMetal}
            goldRate={goldRate}
            formData={itemForm}
            isEditing={editingItemIndex !== null}
            transactionType={transactionType}
            kaatWeightPreview={currentItemCalc?.kaatWeight || 0}
            pureWeightPreview={currentItemCalc?.adjustedGoldWeight || 0}
            onFormChange={handleItemFormChange}
            onAddItem={handleAddItem}
            onReset={handleResetItemForm}
            onBulkPurchase={() => setIsBulkModalOpen(true)}
            onGoldRateChange={undefined}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <JewelleryRulesPanel
              transactionType={transactionType}
              polishBasis={polishBasis}
              polishRate={polishRate}
              labourBasis={labourBasis}
              labourRate={labourRate}
              estimatedGoldWeight={itemForm.estimatedGoldWeight > 0 ? itemForm.estimatedGoldWeight : invoiceSummary.totalGoldWeight}
              adjustedGoldWeight={itemForm.estimatedGoldWeight > 0 ? currentItemCalc.adjustedGoldWeight : invoiceSummary.totalGoldWeight}
              estimatedGrossWeight={currentItemCalc.estimatedGrossWeight}
              customerGoldWeight={partyGoldWeight}
              customerGoldCarat={partyGoldCarat}
              customerGoldValue={partyGoldValue}
              pasaRate={pasaRate}
              pasaDeduction={pasaDeduction}
              goldRate={goldRate}
              kaatBasis={kaatBasis}
              kaatRate={kaatRate}
              onPolishBasisChange={setPolishBasis}
              onPolishRateChange={setPolishRate}
              onLabourBasisChange={setLabourBasis}
              onLabourRateChange={setLabourRate}
              onKaatBasisChange={setKaatBasis}
              onKaatRateChange={setKaatRate}
              onGoldRateChange={setGoldRate}
              onGoldCaratChange={setGoldCarat}
              onCustomerGoldWeightChange={setPartyGoldWeight}
              onCustomerGoldCaratChange={setPartyGoldCarat}
              onPasaRateChange={setPasaRate}
            />
            <PhotoSystem photos={photos} onPhotosChange={setPhotos} />
          </div>
        </div>
      )}

      {/* ── Per-item image gallery modal ── */}
      {imageTargetIndex !== null && items[imageTargetIndex] && (
        <div
          onClick={() => setImageTargetIndex(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(26,18,8,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 96vw)", maxHeight: "90vh", overflowY: "auto" }}>
            <PhotoSystem
              photos={items[imageTargetIndex].imageUrls ?? (items[imageTargetIndex].imageUrl ? [items[imageTargetIndex].imageUrl as string] : [])}
              onPhotosChange={handleItemImagesChange}
              label={`Item Images — ${items[imageTargetIndex].description || `Row ${imageTargetIndex + 1}`}`}
              maxPhotos={6}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setImageTargetIndex(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 3: Item Grid (FULL WIDTH — no horizontal scroll) ── */}
      <ItemGrid
        transactionType={transactionType}
        items={items}
        totals={gridTotals}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onImageUpload={handleImageUpload}
        onCategorize={transactionType === "PURCHASE" ? handleCategorize : undefined}
        isBulkMode={isBulkMode}
      />

      {/* ── Row 4: Invoice Summary (full width) ── */}
      <InvoiceSummary
        transactionType={transactionType}
        currency={currency}
        totalGoldWeight={invoiceSummary.totalGoldWeight}
        totalPureGoldWeight={totalPureGoldWeight}
        itemsSubtotal={invoiceSummary.itemsSubtotal}
        totalAmount={invoiceSummary.totalAmount}
        otherCharges={otherCharges}
        discount={discount}
        otherChargesRs={otherChargesRs}
        discountRs={discountRs}
        otherChargesMode={otherChargesMode}
        otherChargesWeight={otherChargesWeight}
        discountMode={discountMode}
        discountWeight={discountWeight}
        goldRatePerGram={goldRatePerGram}
        customerGoldValue={partyGoldValue}
        pasaDeduction={pasaDeduction}
        cashReceived={cashReceived}
        goldReceived={goldReceived}
        balance={invoiceSummary.balance}
        remarks={remarks}
        onOtherChargesChange={setOtherCharges}
        onDiscountChange={setDiscount}
        onOtherChargesModeChange={setOtherChargesMode}
        onOtherChargesWeightChange={setOtherChargesWeight}
        onDiscountModeChange={setDiscountMode}
        onDiscountWeightChange={setDiscountWeight}
        onCashReceivedChange={setCashReceived}
        onGoldReceivedChange={setGoldReceived}
        onRemarksChange={setRemarks}
        onSaveDraft={handleSaveDraft}
        onFinalize={handleFinalize}
        onGeneratePdf={handleGeneratePdf}
        onSendWhatsApp={handleSendWhatsApp}
        onClearNew={() => {
          if (confirm("Start a new invoice? Unsaved changes will be lost.")) {
            window.location.reload();
          }
        }}
        onExit={() => {
          window.location.href = "/dashboard";
        }}
        onPayment={() => {
          window.open("/payments", "_blank");
        }}
      />

      {/* ── Supplier receipt / photos — for all purchases (bulk + regular) ── */}
      {transactionType === "PURCHASE" && (
        <PhotoSystem photos={photos} onPhotosChange={setPhotos} label="Supplier Receipt / Photos" />
      )}

      {/* ── Bulk Add Modal (re-categorize existing bulk items only) ── */}
      <BulkAddModal
        isOpen={isBulkModalOpen && categorizingItemIndex !== null}
        onClose={() => { setIsBulkModalOpen(false); setCategorizingItemIndex(null); }}
        onConfirm={handleBulkAdd}
        onSaveDraft={handleSaveDraft}
        onGeneratePdf={handleGeneratePdf}
        categories={categories}
        goldRate={goldRate}
        polishBasis={polishBasis}
        polishRate={polishRate}
        labourBasis={labourBasis}
        labourRate={labourRate}
        kaatBasis={kaatBasis}
        kaatRate={kaatRate}
        initialMode="categorize"
        initialWeight={categorizingItemIndex !== null ? items[categorizingItemIndex]?.estimatedGoldWeight : undefined}
        initialCarat={categorizingItemIndex !== null ? items[categorizingItemIndex]?.carat : undefined}
        categorizeTitle={categorizingItemIndex !== null ? `Categorise: ${items[categorizingItemIndex]?.description || "Bulk Item"}` : undefined}
      />

      {/* ── Diamond Details Dialog ── */}
      <DiamondDetailsDialog
        isOpen={isDiamondDialogOpen}
        initialEntries={diamondEntries}
        onConfirm={(entries, totalWeight, totalAmount) => {
          setDiamondEntries(entries);
          setItemForm((prev) => ({
            ...prev,
            diamondWeight: totalWeight,
            diamondAmount: totalAmount,
          }));
          setIsDiamondDialogOpen(false);
          // Trigger the useEffect auto-add flag
          setShouldAutoAdd(true);
        }}
        onClose={() => setIsDiamondDialogOpen(false)}
      />
    </div>
  );
}
