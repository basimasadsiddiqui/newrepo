import prisma from "@core/database";
import { Prisma } from "@prisma/client";
import type { MetalTypeEnum } from "../domain";

export const metalRateService = {
    async getLatestMetalRate(orgId: string, metal: MetalTypeEnum): Promise<number | null> {
        try {
            const rateRecord = await prisma.metalRate.findUnique({
                where: { orgId_metal: { orgId, metal } },
            });
            if (!rateRecord) return null;
            return rateRecord.ratePerGram.toNumber();
        } catch (error) {
            console.error(`[metalRateService] Failed to fetch rate for ${metal}:`, error);
            return null;
        }
    },

    async getAllRates(orgId: string) {
        try {
            const rates = await prisma.metalRate.findMany({ where: { orgId } });
            return rates.map((r) => ({ ...r, ratePerGram: r.ratePerGram.toNumber() }));
        } catch (error) {
            console.error("[metalRateService] Failed to fetch all rates:", error);
            return [];
        }
    },

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
                const activeRate = await tx.metalRate.upsert({
                    where: { orgId_metal: { orgId, metal } },
                    update: { ratePerGram: decimalRate, lastUpdated: new Date(), source, updatedBy },
                    create: { orgId, metal, ratePerGram: decimalRate, source, updatedBy },
                });

                await tx.metalRateHistory.create({
                    data: { orgId, metal, ratePerGram: decimalRate, source, updatedBy },
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
