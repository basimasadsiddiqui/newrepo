export interface BeadPreset {
    id: string;
    name: string;
    color: string;
    pricePerGram: number;
    notes: string;
}

const LS_KEY = "aj_bead_presets";

export const DEFAULT_BEAD_PRESETS: BeadPreset[] = [
    { id: "gold-beads",    name: "Gold Beads",    color: "#C9A84C", pricePerGram: 8000, notes: "" },
    { id: "silver-beads",  name: "Silver Beads",  color: "#94A3B8", pricePerGram: 250,  notes: "" },
    { id: "pearl-beads",   name: "Pearl Beads",   color: "#E2E8F0", pricePerGram: 5000, notes: "Natural / freshwater" },
    { id: "coral-beads",   name: "Coral Beads",   color: "#EA580C", pricePerGram: 3000, notes: "" },
    { id: "crystal-beads", name: "Crystal Beads", color: "#7DD3FC", pricePerGram: 800,  notes: "" },
    { id: "seed-beads",    name: "Seed Beads",    color: "#FDE68A", pricePerGram: 500,  notes: "" },
];

export function loadBeadPresets(): BeadPreset[] {
    if (typeof window === "undefined") return DEFAULT_BEAD_PRESETS;
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return DEFAULT_BEAD_PRESETS;
        const parsed = JSON.parse(raw) as BeadPreset[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BEAD_PRESETS;
    } catch {
        return DEFAULT_BEAD_PRESETS;
    }
}

export function saveBeadPresets(presets: BeadPreset[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, JSON.stringify(presets));
}
