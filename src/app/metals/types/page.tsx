import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MetalTypesManager from "@/components/metals/MetalTypesManager";

export const metadata: Metadata = {
    title: "Metal Types | Akhtar Jewellers ERP",
    description: "Manage metal types – Gold 24K, 22K, 18K, Silver, Platinum and more.",
};

const ORG_ID = "org-akhtar";

export default async function MetalTypesPage() {
    let metalTypes: {
        id: string;
        name: string;
        purity: string;
        purityValue: number;
        isActive: boolean;
        createdAt: Date;
    }[] = [];

    try {
        const raw = await prisma.metalType.findMany({
            where: { orgId: ORG_ID },
            orderBy: [{ name: "asc" }, { purity: "asc" }],
        });
        metalTypes = raw.map((mt) => ({
            id: mt.id,
            name: mt.name,
            purity: mt.purity,
            purityValue: Number(mt.purityValue),
            isActive: mt.isActive,
            createdAt: mt.createdAt,
        }));
    } catch {
        // silently fall through to empty
    }

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-icon">
                    <span style={{ fontSize: "1.25rem" }}>⚗️</span>
                </div>
                <div className="page-header-text">
                    <h1>Metal Types</h1>
                    <p>Gold 24K, 22K, 18K · Silver 999 · Platinum 950 · and more.</p>
                </div>
            </div>

            <MetalTypesManager metalTypes={metalTypes} />
        </div>
    );
}
