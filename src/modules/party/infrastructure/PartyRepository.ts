import prisma from "@core/database";

export const PartyRepository = {
    async findMany(orgId: string, search?: string) {
        return prisma.party.findMany({
            where: {
                orgId,
                ...(search
                    ? {
                          OR: [
                              { name: { contains: search, mode: "insensitive" } },
                              { mobile: { contains: search } },
                          ],
                      }
                    : {}),
            },
            orderBy: { name: "asc" },
        });
    },

    async findById(id: string) {
        return prisma.party.findUnique({ where: { id } });
    },

    async findOrCreate(
        orgId: string,
        name: string,
        mobile: string | null,
        type: "Customer" | "Supplier" | "Both"
    ) {
        const existing = await prisma.party.findFirst({
            where: {
                orgId,
                name: { equals: name, mode: "insensitive" },
                ...(mobile ? { mobile } : {}),
            },
        });
        if (existing) return existing;

        return prisma.party.create({
            data: { orgId, name, mobile, type, balance: 0 },
        });
    },

    async create(orgId: string, data: {
        name: string;
        mobile?: string | null;
        address?: string | null;
        type: "Customer" | "Supplier" | "Both";
    }) {
        return prisma.party.create({
            data: { orgId, ...data, balance: 0 },
        });
    },

    async update(id: string, data: Partial<{
        name: string;
        mobile: string | null;
        address: string | null;
        type: "Customer" | "Supplier" | "Both";
    }>) {
        return prisma.party.update({ where: { id }, data });
    },

    async delete(id: string) {
        return prisma.party.delete({ where: { id } });
    },
};
