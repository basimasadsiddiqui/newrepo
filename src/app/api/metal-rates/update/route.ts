import { NextResponse } from "next/server";
import { metalRateService } from "@modules/metals/application/metalRateService";
import prisma from "@core/database";
import { resolveOrgId } from "@core/auth";

// Fallback in case FreeCurrencyAPI fails completely
const FALLBACK_USD_TO_PKR = 278.50;

export async function GET(req: Request) {
    try {
        // 1. Verify Authentication / Authorization (Cron secret check)
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        // If not running locally, require a cron secret for security
        if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = await resolveOrgId();
        const goldApiKey = process.env.GOLD_API_KEY || "goldapi-jkinksmluw455d-io";

        // 2. Fetch Organization Settings to get Local Market Premium
        // We look for our specific ORG. If it doesn't exist, we assume 0 premium.
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { metalPremiumPercent: true }
        });
        const premiumPercent = org?.metalPremiumPercent?.toNumber() || 0;

        // 3. Fetch Live USD to PKR exchange rate
        let usdToPkr = FALLBACK_USD_TO_PKR;

        try {
            // Using open.er-api.com as it supports PKR freely without key limits
            const exchangeRateRes = await fetch(`https://open.er-api.com/v6/latest/USD`, { cache: 'no-store' });
            if (exchangeRateRes.ok) {
                const exchangeData = await exchangeRateRes.json();
                if (exchangeData?.rates?.PKR) {
                    usdToPkr = exchangeData.rates.PKR;
                }
            } else {
                console.error("Exchange API returned error:", exchangeRateRes.statusText);
            }
        } catch (exErr) {
            console.error("Exchange API network fetch failed. Using fallback.", exErr);
        }

        // 4. Fetch Gold Rate (XAU)
        // Prefer the Pakistan-localized feed when available, but fall back to GoldAPI
        // if the RapidAPI subscription/key is missing or rejected.
        const rapidApiKey = process.env.RAPIDAPI_KEY;
        const rapidApiHost = "gold-prices-pakistan.p.rapidapi.com";

        let baseGoldPkrPerGram: number | null = null;
        let liveGoldUsdPerGram: number | null = null;
        let goldSource = "GOLDAPI";

        if (rapidApiKey) {
            try {
                const goldRes = await fetch("https://gold-prices-pakistan.p.rapidapi.com/history", {
                    headers: {
                        "x-rapidapi-host": rapidApiHost,
                        "x-rapidapi-key": rapidApiKey
                    },
                    cache: "no-store"
                });

                if (!goldRes.ok) {
                    const errorBody = await goldRes.text();
                    throw new Error(`Pakistan Gold API failed (${goldRes.status}): ${errorBody}`);
                }

                const goldData = await goldRes.json();

                // The API returns an object with dates as keys: { "21 Feb 2026": 517100.0, ... }
                // We get the first value (most recent).
                const latestDateKey = Object.keys(goldData)[0];
                const liveGoldPkrPerTola = goldData[latestDateKey];

                if (typeof liveGoldPkrPerTola !== "number" || liveGoldPkrPerTola <= 0) {
                    throw new Error("Could not parse latest gold rate from Pakistan API");
                }

                baseGoldPkrPerGram = liveGoldPkrPerTola / 11.664;
                liveGoldUsdPerGram = baseGoldPkrPerGram / usdToPkr;
                goldSource = "RAPIDAPI_PAKISTAN";
            } catch (rapidErr) {
                console.error("RapidAPI gold fetch failed. Falling back to GoldAPI.", rapidErr);
            }
        }

        if (baseGoldPkrPerGram === null || liveGoldUsdPerGram === null) {
            const goldRes = await fetch("https://www.goldapi.io/api/XAU/USD", {
                headers: { "x-access-token": goldApiKey },
                cache: "no-store",
            });

            if (!goldRes.ok) throw new Error(`Gold API failed: ${goldRes.statusText}`);
            const goldData = await goldRes.json();

            liveGoldUsdPerGram = goldData.price_gram_24k || (goldData.price / 31.1034768);
            if (!liveGoldUsdPerGram || liveGoldUsdPerGram <= 0) {
                throw new Error("Could not parse latest gold rate from GoldAPI");
            }

            baseGoldPkrPerGram = liveGoldUsdPerGram * usdToPkr;
        }

        // Apply Local Premium % (user might set to 0 now that it's localized, but we keep the feature)
        const localGoldPkrPerGram = baseGoldPkrPerGram * (1 + (premiumPercent / 100));

        // 5. Fetch Silver Rate (XAG)
        const silverRes = await fetch("https://www.goldapi.io/api/XAG/USD", {
            headers: { "x-access-token": goldApiKey },
            cache: "no-store",
        });

        if (!silverRes.ok) throw new Error(`Silver API failed: ${silverRes.statusText}`);
        const silverData = await silverRes.json();

        let liveSilverUsdPerGram = 0;
        if (silverData.price_gram_999) {
            liveSilverUsdPerGram = silverData.price_gram_999;
        } else {
            liveSilverUsdPerGram = silverData.price / 31.1034768;
        }

        const baseSilverPkrPerGram = liveSilverUsdPerGram * usdToPkr;
        const localSilverPkrPerGram = baseSilverPkrPerGram * (1 + (premiumPercent / 100));


        // 6. Save final LOCAL rates to Database
        await metalRateService.updateMetalRate({
            orgId,
            metal: "XAU",
            ratePerGram: localGoldPkrPerGram,
            source: "API",
        });

        await metalRateService.updateMetalRate({
            orgId,
            metal: "XAG",
            ratePerGram: localSilverPkrPerGram,
            source: "API",
        });

        return NextResponse.json({
            success: true,
            data: {
                international_exchange_rate_pkr: usdToPkr,
                premium_percent: premiumPercent,
                XAU: {
                    source: goldSource,
                    base_usd_per_gram: liveGoldUsdPerGram,
                    base_pkr_per_gram: baseGoldPkrPerGram,
                    final_local_pkr_per_gram: localGoldPkrPerGram
                },
                XAG: {
                    base_usd_per_gram: liveSilverUsdPerGram,
                    base_pkr_per_gram: baseSilverPkrPerGram,
                    final_local_pkr_per_gram: localSilverPkrPerGram
                },
                updatedAt: new Date().toISOString()
            }
        });

    } catch (error: unknown) {
        console.error("[CRON] Metal Rate Update Failed:", error);

        // Return 500 so CRON services know it failed and can trigger alerts
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to update metal rates"
        }, { status: 500 });
    }
}
