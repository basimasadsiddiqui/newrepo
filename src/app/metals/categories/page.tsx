import { Metadata } from "next";
import { prisma } from "@core/database";
import CategoriesManager from "@/components/metals/CategoriesManager";

export const metadata: Metadata = {
    title: "Product Categories | Akhtar Jewellers ERP",
    description: "Manage jewellery product categories.",
};

const ORG_ID = "org-akhtar";

export default async function CategoriesPage() {
    let categories: { id: string; name: string; isActive: boolean }[] = [];
    try {
        categories = await prisma.category.findMany({
            where: { orgId: ORG_ID },
            select: { id: true, name: true, isActive: true },
            orderBy: { name: "asc" },
        });
    } catch {
        // silently fall through to empty
    }

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-icon">
                    <span style={{ fontSize: "1.25rem" }}>🏷️</span>
                </div>
                <div className="page-header-text">
                    <h1>Product Categories</h1>
                    <p>Manage jewellery product taxonomy — rings, bangles, necklaces & more.</p>
                </div>
            </div>

            <CategoriesManager categories={categories} />
        </div>
    );
}
