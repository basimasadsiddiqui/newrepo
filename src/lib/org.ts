import prisma from "@/lib/prisma";

const PREFERRED_ORG_IDS = ["org-akhtar", "org-default-001"] as const;

export async function resolveOrgId(explicitOrgId?: string): Promise<string> {
    if (explicitOrgId) {
        return explicitOrgId;
    }

    const preferredOrg = await prisma.organization.findFirst({
        where: { id: { in: [...PREFERRED_ORG_IDS] } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });

    if (preferredOrg) {
        return preferredOrg.id;
    }

    const firstOrg = await prisma.organization.findFirst({
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });

    if (firstOrg) {
        return firstOrg.id;
    }

    throw new Error("No organization found. Create an organization before managing metal rates.");
}
