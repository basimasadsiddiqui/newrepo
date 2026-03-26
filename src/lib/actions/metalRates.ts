"use server";

import { metalRateService, MetalTypeEnum } from "@/lib/services/metalRateService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function getActiveMetalRates(orgId: string = "org-default-001") {
    try {
        const rates = await metalRateService.getAllRates(orgId);
        return { success: true, data: rates };
    } catch (error) {
        console.error("Failed to fetch active metal rates:", error);
        return { success: false, error: "Unable to load rates" };
    }
}

export async function manualUpdateMetalRate(
    metal: MetalTypeEnum,
    ratePerGram: number,
    orgId: string = "org-default-001"
) {
    try {
        if (ratePerGram <= 0) {
            return { success: false, error: "Rate must be greater than 0" };
        }

        // --- STEP 4 REQUIREMENT: INTERNET FAILOVER LOGIC ---
        // Manual entry must NEVER override API when internet is working.
        // We ping the primary API to check its health.
        const goldApiKey = process.env.GOLD_API_KEY || "goldapi-jkinksmluw455d-io";
        try {
            const goldRes = await fetch("https://www.goldapi.io/api/XAU/USD", {
                headers: { "x-access-token": goldApiKey },
                // Very short timeout so we don't hang the UI forever if offline
                signal: AbortSignal.timeout(3000)
            });

            if (goldRes.ok) {
                // API is healthy. Reject manual entry!
                return {
                    success: false,
                    error: "API is active and healthy. Manual overrides are disabled. Please use 'Sync Live API Rates'."
                };
            }
        } catch (apiError) {
            // API ping failed (network error, timeout, etc). We ALLOW manual override.
            console.log("Gold API ping failed, allowing manual override fallback.");
        }
        // --- END FAILOVER LOGIC ---

        // Hardcoding updatedBy to "Admin" for now since we don't have user session context here easily
        const result = await metalRateService.updateMetalRate({
            orgId,
            metal,
            ratePerGram,
            source: "MANUAL",
            updatedBy: "Admin",
        });

        if (result.success) {
            // Revalidate any pages that might be displaying the rates
            revalidatePath("/settings/rates");
            revalidatePath("/");
            return { success: true, data: result.data };
        } else {
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error("Manual rate update failed:", error);
        return { success: false, error: "Internal server error during update" };
    }
}

export async function getLocalPremium(orgId: string = "org-default-001") {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { metalPremiumPercent: true }
        });
        return { success: true, data: org?.metalPremiumPercent?.toNumber() || 0 };
    } catch (error) {
        console.error("Failed to fetch premium:", error);
        return { success: false, data: 0 };
    }
}

export async function updateLocalPremium(
    newPremium: number,
    orgId: string = "org-default-001"
) {
    try {
        await prisma.organization.update({
            where: { id: orgId },
            data: { metalPremiumPercent: newPremium }
        });

        // Revalidate the rates page
        revalidatePath("/settings/rates");

        return { success: true, data: newPremium };
    } catch (error) {
        console.error("Failed to update premium:", error);
        return { success: false, error: "Internal server error updating premium" };
    }
}
