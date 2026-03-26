import { getInventoryItem } from "@/lib/actions/inventory";
import EditInventoryForm from "@/components/inventory/EditInventoryForm";
import { notFound } from "next/navigation";

interface EditPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditInventoryPage({ params }: EditPageProps) {
    const { id } = await params;
    const res = await getInventoryItem(id);

    if (!res.success || !res.data) {
        notFound();
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-maroon">Edit Inventory</h1>
            <EditInventoryForm item={res.data} />
        </div>
    );
}
