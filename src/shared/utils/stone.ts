/**
 * Stone / gemstone amount calculation.
 * 1 carat = 0.2 g (so 1 g = 5 ct). Amount is TRUNCATED, never rounded up
 * (client: a 771.75 amount must show as 771, not 772).
 */
export type StoneRateBasis = "Per Carat" | "Per Cent" | "Per Gram" | "Per Piece" | "Lumpsum";

export interface StoneAmountInput {
    value: number;          // weight in the selected unit
    unit: "ct" | "g";
    rateBasis: StoneRateBasis;
    rate: number;
    pieces: number;
}

export function stoneRowAmount(r: StoneAmountInput): number {
    const wG  = r.unit === "ct" ? r.value * 0.2 : r.value;   // grams
    const wCt = r.unit === "g"  ? r.value / 0.2 : r.value;   // carats (1 g = 5 ct)
    let amt: number;
    if (r.rateBasis === "Per Carat")      amt = wCt * r.rate;
    else if (r.rateBasis === "Per Cent")  amt = wCt * 100 * r.rate;
    else if (r.rateBasis === "Per Gram")  amt = wG  * r.rate;
    else if (r.rateBasis === "Per Piece") amt = r.pieces * r.rate;
    else                                  amt = r.rate; // Lumpsum
    return Math.floor(amt);
}
