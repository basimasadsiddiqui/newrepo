export interface GemstonePreset {
    id: string;
    name: string;
    color: string;
    pricePerCarat: number;
    pricePerGram: number;
    defaultUnit: "carats" | "grams";
    notes: string;
}

const LS_KEY = "aj_gemstone_presets";

export const DEFAULT_GEMSTONE_PRESETS: GemstonePreset[] = [
    { id: "ruby",       name: "Ruby",       color: "#DC2626", pricePerCarat: 15000, pricePerGram: 75000, defaultUnit: "carats", notes: "Natural / synthetic" },
    { id: "emerald",    name: "Emerald",    color: "#16A34A", pricePerCarat: 12000, pricePerGram: 60000, defaultUnit: "carats", notes: "" },
    { id: "sapphire",   name: "Sapphire",   color: "#2563EB", pricePerCarat: 18000, pricePerGram: 90000, defaultUnit: "carats", notes: "" },
    { id: "pearl",      name: "Pearl",      color: "#E2E8F0", pricePerCarat:  2000, pricePerGram: 10000, defaultUnit: "grams",  notes: "Sea / freshwater" },
    { id: "topaz",      name: "Topaz",      color: "#F59E0B", pricePerCarat:  3000, pricePerGram: 15000, defaultUnit: "carats", notes: "" },
    { id: "amethyst",   name: "Amethyst",   color: "#7C3AED", pricePerCarat:  2500, pricePerGram: 12500, defaultUnit: "carats", notes: "" },
    { id: "turquoise",  name: "Turquoise",  color: "#0D9488", pricePerCarat:  1800, pricePerGram:  9000, defaultUnit: "carats", notes: "" },
    { id: "coral",      name: "Coral",      color: "#EA580C", pricePerCarat:  2200, pricePerGram: 11000, defaultUnit: "grams",  notes: "" },
];

export function loadGemstonePresets(): GemstonePreset[] {
    if (typeof window === "undefined") return DEFAULT_GEMSTONE_PRESETS;
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return DEFAULT_GEMSTONE_PRESETS;
        const parsed = JSON.parse(raw) as GemstonePreset[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GEMSTONE_PRESETS;
    } catch {
        return DEFAULT_GEMSTONE_PRESETS;
    }
}

export function saveGemstonePresets(presets: GemstonePreset[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, JSON.stringify(presets));
}
