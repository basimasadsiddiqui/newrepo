import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Supported metal identifiers
 */
export type MetalTypeEnum = "XAU" | "XAG" | "DIA"; // Gold, Silver, Diamond

/**
 * Service Layer for managing Metal Rates (Gold, Silver, Diamond)
 * This acts as the centralized source of truth for all rate lookups.
 */
export const metalRateService = {
    /**
     * Get the latest active rate for a specific metal in PKR.
     * This is highly optimized and expected to be called frequently (e.g., per invoice creation).
     */
    async getLatestMetalRate(orgId: string, metal: MetalTypeEnum): Promise<number | null> {
        try {
            const rateRecord = await prisma.metalRate.findUnique({
                where: {
                    orgId_metal: {
                        orgId,
                        metal,
                    },
                },
            });

            if (!rateRecord) return null;

            // Convert Prisma Decimal to standard JS number
            return rateRecord.ratePerGram.toNumber();
        } catch (error) {
            console.error(`[metalRateService] Failed to fetch rate for ${metal}:`, error);
            return null;
        }
    },

    /**
     * Get all currently active rates for an organization.
     */
    async getAllRates(orgId: string) {
        try {
            const rates = await prisma.metalRate.findMany({
                where: { orgId },
            });
            return rates.map(r => ({
                ...r,
                ratePerGram: r.ratePerGram.toNumber()
            }));
        } catch (error) {
            console.error(`[metalRateService] Failed to fetch all rates:`, error);
            return [];
        }
    },

    /**
     * Update the rate for a metal and automatically log it to the history table.
     * Use a transaction to ensure both operations succeed or fail together.
     */
    async updateMetalRate({
        orgId,
        metal,
        ratePerGram,
        source = "API",
        updatedBy = null,
    }: {
        orgId: string;
        metal: MetalTypeEnum;
        ratePerGram: number;
        source?: string;
        updatedBy?: string | null;
    }) {
        try {
            const decimalRate = new Prisma.Decimal(ratePerGram);

            const result = await prisma.$transaction(async (tx) => {
                // 1. Upsert the active rate
                const activeRate = await tx.metalRate.upsert({
                    where: {
                        orgId_metal: {
                            orgId,
                            metal,
                        },
                    },
                    update: {
                        ratePerGram: decimalRate,
                        lastUpdated: new Date(),
                        source,
                        updatedBy,
                    },
                    create: {
                        orgId,
                        metal,
                        ratePerGram: decimalRate,
                        source,
                        updatedBy,
                    },
                });

                // 2. Insert into history
                await tx.metalRateHistory.create({
                    data: {
                        orgId,
                        metal,
                        ratePerGram: decimalRate,
                        source,
                        updatedBy,
                    },
                });

                return activeRate;
            });

            return { success: true, data: result };
        } catch (error) {
            console.error(`[metalRateService] Failed to update rate for ${metal}:`, error);
            return { success: false, error: "Failed to update metal rate" };
        }
    },
};
