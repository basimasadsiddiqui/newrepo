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

import { useState, useCallback, useMemo, useEffect, useRef, type ChangeEvent } from "react";
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
import ItemGrid from "@/components/invoice/ItemGrid";
import InvoiceSummary from "@/components/invoice/InvoiceSummary";
import PhotoSystem from "@/components/invoice/PhotoSystem";
import DiamondDetailsDialog from "@/components/invoice/DiamondDetailsDialog";

// ── Calculation Engine ──
import {
  calculateLineItem,
  calculateInvoiceSummary,
  goldRateToPerGram,
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
  pieces: 1,
  carat: 21,
  size: "",
  isRepairingOrder: false,
  isSampleGold: false,
  estimatedGoldWeight: 0,
  stoneWeight: 0,
  beadsWeight: 0,
  diamondWeight: 0,
  stoneAmount: 0,
  beadsAmount: 0,
  diamondAmount: 0,
  imageUrl: null,
  metalTypeId: null,
};

let itemCounter = 0;
function generateItemId(): string {
  return `item-${Date.now()}-${++itemCounter}`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN INVOICE PAGE
// ═══════════════════════════════════════════════════════════════

interface InvoiceMainProps {
  defaultTransactionType: TransactionType;
  hideToggle?: boolean;
}

export default function InvoiceMain({ defaultTransactionType, hideToggle = false }: InvoiceMainProps) {
  // ── API Data ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [metalTypes, setMetalTypes] = useState<MetalTypeOption[]>([]);
  const [, setIsLoading] = useState<boolean>(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null); // Null = New Invoice

  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const stockItemIdParam = searchParams.get("stockItemId");
  const autoAddStockParam = searchParams.get("autoAdd");

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
  const [labourRate, setLabourRate] = useState<number>(1200.0);
  const [kaatBasis, setKaatBasis] = useState<KaatBasis>("Direct Weight");
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
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  const stockItemPrefillRef = useRef<string | null>(null);

  // ── Diamond Dialog ──
  const [isDiamondDialogOpen, setIsDiamondDialogOpen] = useState<boolean>(false);
  const [diamondEntries, setDiamondEntries] = useState<DiamondEntry[]>([]);
  const [shouldAutoAdd, setShouldAutoAdd] = useState<boolean>(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('draft_invoice_items');
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      }
    } catch (e) {
      console.error("Failed to parse draft items from local storage", e);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  // Save to local storage when items change (after hydration)
  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem('draft_invoice_items', JSON.stringify(items));
    }
  }, [items, hasHydrated]);

  // ── Summary ──
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [goldReceived, setGoldReceived] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>("");

  // ── Photos ──
  const [photos, setPhotos] = useState<string[]>([]);

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  const goldRatePerGram = useMemo(() => goldRateToPerGram(goldRate), [goldRate]);

  // Fetch Categories & Gold Rate on Mount
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [catRes, rateRes, metalTypesRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/metal-rates"),
          fetch("/api/metal-types"),
        ]);

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
        adjustedGoldWeight: item.adjustedGoldWeight,
      })),
      otherCharges,
      discount,
      cashReceived,
      goldReceived,
      customerGoldWeight: partyGoldWeight,
      customerGoldCarat: partyGoldCarat,
      goldRatePerGram,
      pasaPercent: pasaRate,
    });
  }, [items, otherCharges, discount, cashReceived, goldReceived, partyGoldWeight, partyGoldCarat, goldRatePerGram, pasaRate]);

  // Use the same weight that is displayed in the rules panel:
  // If user is currently editing an item, show pasa for that item's weight;
  // otherwise use the total gold weight from all added items.
  const visibleGoldWeight = useMemo(
    () => currentItemCalc.adjustedGoldWeight > 0
      ? currentItemCalc.adjustedGoldWeight
      : invoiceSummary.totalGoldWeight,
    [currentItemCalc.adjustedGoldWeight, invoiceSummary.totalGoldWeight]
  );

  const pasaDeduction = useMemo(
    () => calcPasaDeduction(visibleGoldWeight, pasaRate, goldRatePerGram),
    [visibleGoldWeight, pasaRate, goldRatePerGram]
  );

  const gridTotals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        goldWeight: acc.goldWeight + item.adjustedGoldWeight,
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

  const handleItemFormChange = useCallback(
    (field: keyof ItemEntryFormData, value: unknown) => {
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
    [transactionType, categories]
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
        stoneAmount: itemForm.stoneAmount,
        beadsAmount: itemForm.beadsAmount,
        diamondAmount: itemForm.diamondAmount,
      });

      const newItem: InvoiceItem = {
        id: editingItemIndex !== null ? items[editingItemIndex].id : generateItemId(),
        sortOrder: editingItemIndex !== null ? editingItemIndex : items.length,
        categoryId: effectiveCategoryId,
        categoryName: effectiveCategoryName,
        description: itemForm.description,
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
        beadsWeight: itemForm.beadsWeight,
        diamondWeight: itemForm.diamondWeight,
        goldAmount: calc.goldAmount,
        stoneAmount: itemForm.stoneAmount,
        beadsAmount: itemForm.beadsAmount,
        diamondAmount: itemForm.diamondAmount,
        diamondEntries: diamondEntries.length > 0 ? diamondEntries : undefined,
        polishAmount: calc.polishAmount,
        labourAmount: calc.labourAmount,
        totalAmount: calc.totalAmount,
        imageUrl: itemForm.imageUrl || null,
        inventoryItemId: itemForm.inventoryItemId || null,
        metalTypeId: itemForm.metalTypeId || null,
      };

      if (editingItemIndex !== null) {
        setItems((prev) => { const updated = [...prev]; updated[editingItemIndex] = newItem; return updated; });
        setEditingItemIndex(null);
        toast.success("Item updated");
      } else {
        setItems((prev) => [...prev, newItem]);
        toast.success("Item added");
      }
      setItemForm(DEFAULT_ITEM_FORM);
      setDiamondEntries([]);
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
      pieces: item.pieces,
      carat: item.carat,
      size: item.size || "",
      isRepairingOrder: item.isRepairingOrder,
      isSampleGold: item.isSampleGold,
      estimatedGoldWeight: item.estimatedGoldWeight,
      stoneWeight: item.stoneWeight,
      beadsWeight: item.beadsWeight,
      diamondWeight: item.diamondWeight,
      stoneAmount: item.stoneAmount,
      beadsAmount: item.beadsAmount,
      diamondAmount: item.diamondAmount,
      imageUrl: item.imageUrl || null,
      inventoryItemId: item.inventoryItemId || undefined,
      metalTypeId: item.metalTypeId || null,
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

  const handleImageUpload = useCallback((index: number) => {
    setImageTargetIndex(index);
    itemImageInputRef.current?.click();
  }, []);

  const handleItemImageSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || imageTargetIndex === null) {
      setImageTargetIndex(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      setImageTargetIndex(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        toast.error("Failed to read image");
        setImageTargetIndex(null);
        return;
      }

      setItems((prev) =>
        prev.map((item, idx) =>
          idx === imageTargetIndex ? { ...item, imageUrl: result } : item
        )
      );
      toast.success("Item image updated");
      setImageTargetIndex(null);
    };
    reader.onerror = () => {
      toast.error("Failed to read image");
      setImageTargetIndex(null);
    };
    reader.readAsDataURL(file);
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
      otherCharges,
      discount,
      cashReceived,
      goldReceived,
      remarks,
      items: items.map((item, idx) => ({
        sortOrder: idx,
        categoryId: item.categoryId,
        description: item.description,
        pieces: item.pieces,
        // DB schema currently expects Int for carat.
        carat: Math.round(item.carat),
        size: item.size,
        isRepairingOrder: item.isRepairingOrder,
        isSampleGold: item.isSampleGold,
        estimatedGoldWeight: item.estimatedGoldWeight,
        kaatWeight: item.kaatWeight,
        stoneWeight: item.stoneWeight,
        beadsWeight: item.beadsWeight,
        diamondWeight: item.diamondWeight,
        stoneAmount: item.stoneAmount,
        beadsAmount: item.beadsAmount,
        diamondAmount: item.diamondAmount,
        diamondEntries: item.diamondEntries || undefined,
        inventoryItemId: item.inventoryItemId || null,
        imageUrl: item.imageUrl || null,
        metalTypeId: item.metalTypeId || null,
      })),
      photos, // Include photos
    };
  }, [receiptNo, date, dueDate, rateType, transactionType, partyId, partyName, partyMobile, goldRate, polishBasis, polishRate, labourBasis, labourRate, kaatBasis, kaatRate, supplierInvoiceNo, currency, currencyRate, intlOunceRate, partyGoldWeight, partyGoldCarat, pasaRate, otherCharges, discount, cashReceived, goldReceived, remarks, items, photos]);

  const handleSaveDraft = useCallback(async () => {
    if (transactionType === "PURCHASE" && !date) {
      toast.error("Purchase Date is required");
      return;
    }

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
        console.error("Save API Error Body:", text);
        try {
          const err = JSON.parse(text);
          throw new Error(err.error || "Failed to save");
        } catch {
          throw new Error(`Server returned ${res.status}: ${text}`);
        }
      }
      const data = await res.json();
      console.log("Draft saved response:", data);

      if (data.data?.id) {
        setInvoiceId(data.data.id);

        // Clear draft items and trigger hydration check to prevent re-saving stale items
        localStorage.removeItem('draft_invoice_items');
        setItems([]);

        toast.success(invoiceId ? "Invoice updated" : "Draft saved");
      } else {
        console.error("No ID returned in save response data:", data);
        toast.error("Saved but failed to retrieve ID");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save draft");
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, prepareInvoicePayload]);

  const handleFinalize = useCallback(async () => {
    console.log("handleFinalize called. Items:", items.length, "InvoiceId:", invoiceId);

    if (transactionType === "PURCHASE" && !date) {
      toast.error("Purchase Date is required");
      return;
    }

    if (items.length === 0) {
      console.warn("No items to finalize");
      toast.error("Add at least one item");
      return;
    }
    if (!invoiceId) {
      console.warn("No invoiceId, asking to save draft");
      toast.error("Please save draft first");
      return;
    }

    // --- NEW: RISK VALIDATION CHECK ---
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
      if (!confirmCredit) {
        return;
      }
    }

    toast("Starting finalization...", { icon: "🚀" });

    setIsLoading(true);
    try {
      console.log("Sending POST request to:", `/api/invoices/${invoiceId}/finalize`);
      const res = await fetch(`/api/invoices/${invoiceId}/finalize`, {
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
      localStorage.removeItem("draft_invoice_items");
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
  }, [items, invoiceId, invoiceSummary.balance, partyRisk]);

  const handleGeneratePdf = useCallback(() => {
    generateInvoicePdf({
      orderNumber,
      date,
      receiptNo,
      transactionType,
      partyName,
      partyMobile,
      items,
      totalGoldWeight: invoiceSummary.totalGoldWeight,
      totalAmount: invoiceSummary.totalAmount,
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
      polishRate: polishRate,
      labourBasis,
      labourRate: labourRate,
      kaatBasis,
      kaatRate,
    });
    toast.success("PDF downloaded!");
  }, [orderNumber, date, receiptNo, transactionType, partyName, partyMobile, items, invoiceSummary, otherCharges, discount, partyGoldValue, pasaDeduction, cashReceived, goldReceived, remarks, goldRate, polishBasis, polishRate, labourBasis, labourRate, kaatBasis, kaatRate]);
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "10px",
          alignItems: "start",
        }}
      >
        <ItemEntryForm
          categories={categories}
          metalTypes={metalTypes}
          goldRate={goldRate}
          formData={itemForm}
          isEditing={editingItemIndex !== null}
          transactionType={transactionType}
          kaatWeightPreview={currentItemCalc?.kaatWeight || 0}
          pureWeightPreview={currentItemCalc?.adjustedGoldWeight || 0}
          onFormChange={handleItemFormChange}
          onAddItem={handleAddItem}
          onReset={handleResetItemForm}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <JewelleryRulesPanel
            transactionType={transactionType}
            polishBasis={polishBasis}
            polishRate={polishRate}
            labourBasis={labourBasis}
            labourRate={labourRate}
            estimatedGoldWeight={currentItemCalc.adjustedGoldWeight > 0 ? itemForm.estimatedGoldWeight : invoiceSummary.totalGoldWeight}
            adjustedGoldWeight={currentItemCalc.adjustedGoldWeight > 0 ? currentItemCalc.adjustedGoldWeight : invoiceSummary.totalGoldWeight}
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

      {/* ── Row 3: Item Grid (FULL WIDTH — no horizontal scroll) ── */}
      <input
        ref={itemImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleItemImageSelected}
        style={{ display: "none" }}
      />
      <ItemGrid
        transactionType={transactionType}
        items={items}
        totals={gridTotals}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onImageUpload={handleImageUpload}
      />

      {/* ── Row 4: Invoice Summary (full width) ── */}
      <InvoiceSummary
        totalGoldWeight={invoiceSummary.totalGoldWeight}
        totalAmount={invoiceSummary.totalAmount}
        otherCharges={otherCharges}
        discount={discount}
        customerGoldValue={partyGoldValue}
        pasaDeduction={pasaDeduction}
        cashReceived={cashReceived}
        goldReceived={goldReceived}
        balance={invoiceSummary.balance}
        remarks={remarks}
        onOtherChargesChange={setOtherCharges}
        onDiscountChange={setDiscount}
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
