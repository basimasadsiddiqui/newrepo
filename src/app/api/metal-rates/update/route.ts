import { NextResponse } from "next/server";
import { metalRateService } from "@/lib/services/metalRateService";
import prisma from "@/lib/prisma";

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

        const orgId = "org-default-001"; // In a multi-tenant system, CRON might loop through orgs
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

        // 4. Fetch Gold Rate (XAU) from New Pakistan API
        const rapidApiKey = "3eb308323cmsh138ea7713424f9cp194528jsn8405c9364a6a";
        const rapidApiHost = "gold-prices-pakistan.p.rapidapi.com";

        const goldRes = await fetch("https://gold-prices-pakistan.p.rapidapi.com/history", {
            headers: {
                "x-rapidapi-host": rapidApiHost,
                "x-rapidapi-key": rapidApiKey
            },
            cache: "no-store"
        });

        if (!goldRes.ok) throw new Error(`Pakistan Gold API failed: ${goldRes.statusText}`);
        const goldData = await goldRes.json();

        // The API returns an object with dates as keys: { "21 Feb 2026": 517100.0, ... }
        // We get the first value (most recent)
        const latestDateKey = Object.keys(goldData)[0];
        const liveGoldPkrPerTola = goldData[latestDateKey];

        if (!liveGoldPkrPerTola) throw new Error("Could not parse latest gold rate from Pakistan API");

        // Convert Tola to Gram (1 Tola = 11.664 Grams)
        const baseGoldPkrPerGram = liveGoldPkrPerTola / 11.664;

        // Apply Local Premium % (user might set to 0 now that it's localized, but we keep the feature)
        const localGoldPkrPerGram = baseGoldPkrPerGram * (1 + (premiumPercent / 100));

        // Note: For response payloads that previously used USD values, we'll set it to 0 or calculate it backwards.
        const liveGoldUsdPerGram = baseGoldPkrPerGram / usdToPkr;

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

    } catch (error: any) {
        console.error("[CRON] Metal Rate Update Failed:", error);

        // Return 500 so CRON services know it failed and can trigger alerts
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to update metal rates"
        }, { status: 500 });
    }
}
