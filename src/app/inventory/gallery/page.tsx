import { getGalleryItems } from "@/lib/data/gallery";
import GalleryFilterBar from "@/components/gallery/GalleryFilterBar";
import ProductGrid from "@/components/gallery/ProductGrid";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GalleryPage({ searchParams }: PageProps) {
    // Await params for Next.js 15+
    const params = await searchParams;

    const page = Number(params.page) || 1;
    const pageSize = Number(params.limit) || 12;
    const search = typeof params.search === "string" ? params.search : "";
    const metal = typeof params.metal === "string" ? params.metal : undefined;
    const category = typeof params.category === "string" ? params.category : undefined;
    const status = typeof params.status === "string" ? params.status : undefined;

    const data = await getGalleryItems({
        page,
        pageSize,
        search,
        metal,
        category,
        status
    });

    const totalPages = data.totalPages;

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 to-yellow-800 dark:from-yellow-400 dark:to-yellow-600">
                        Jewellery Gallery
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Live Inventory • {data.total} Items • Gold Rate: {data.goldRateUsed.toLocaleString()} / Tola
                    </p>
                </div>

                {/* Add Product Button (placeholder logic) */}
                <Link href="/inventory" className="btn btn-primary shadow-lg shadow-primary/20">
                    Manage Inventory
                </Link>
            </div>

            {/* Filters */}
            <GalleryFilterBar />

            {/* Grid */}
            <ProductGrid items={data.items} />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-4">
                    <Link
                        href={`?page=${page > 1 ? page - 1 : 1}`}
                        className={`p-2 rounded-full border border-border hover:bg-muted ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Link>

                    <span className="text-sm font-medium">
                        Page {page} of {totalPages}
                    </span>

                    <Link
                        href={`?page=${page < totalPages ? page + 1 : totalPages}`}
                        className={`p-2 rounded-full border border-border hover:bg-muted ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
            )}
        </div>
    );
}
