"use server";

import { metalRateService } from "./metalRateService";
import type { MetalTypeEnum } from "../domain";
import { revalidatePath } from "next/cache";
import prisma from "@core/database";
import { resolveOrgId } from "@core/auth";

export async function getActiveMetalRates(orgId?: string) {
    try {
        const resolvedOrgId = await resolveOrgId(orgId);
        const rates = await metalRateService.getAllRates(resolvedOrgId);
        return { success: true, data: rates };
    } catch (error) {
        console.error("Failed to fetch active metal rates:", error);
        return { success: false, error: "Unable to load rates" };
    }
}

export async function manualUpdateMetalRate(
    metal: MetalTypeEnum,
    ratePerGram: number,
    orgId?: string
) {
    try {
        if (ratePerGram <= 0) {
            return { success: false, error: "Rate must be greater than 0" };
        }

        const resolvedOrgId = await resolveOrgId(orgId);

        const result = await metalRateService.updateMetalRate({
            orgId: resolvedOrgId,
            metal,
            ratePerGram,
            source: "MANUAL",
            updatedBy: "Admin",
        });

        if (result.success) {
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

export async function getLocalPremium(orgId?: string) {
    try {
        const resolvedOrgId = await resolveOrgId(orgId);
        const org = await prisma.organization.findUnique({
            where: { id: resolvedOrgId },
            select: { metalPremiumPercent: true },
        });
        return { success: true, data: org?.metalPremiumPercent?.toNumber() || 0 };
    } catch (error) {
        console.error("Failed to fetch premium:", error);
        return { success: false, data: 0 };
    }
}

export async function updateLocalPremium(newPremium: number, orgId?: string) {
    try {
        const resolvedOrgId = await resolveOrgId(orgId);
        await prisma.organization.update({
            where: { id: resolvedOrgId },
            data: { metalPremiumPercent: newPremium },
        });
        revalidatePath("/settings/rates");
        return { success: true, data: newPremium };
    } catch (error) {
        console.error("Failed to update premium:", error);
        return { success: false, error: "Internal server error updating premium" };
    }
}
