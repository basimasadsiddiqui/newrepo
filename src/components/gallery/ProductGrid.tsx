import ProductCard from "./ProductCard";
import { PackageOpen } from "lucide-react";

interface ProductGridProps {
    items: any[];
}

export default function ProductGrid({ items }: ProductGridProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg bg-muted/20">
                <PackageOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No Items Found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your filters or search criteria.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {items.map((item) => (
                <ProductCard key={item.id} product={item} />
            ))}
        </div>
    );
}
