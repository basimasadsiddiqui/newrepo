import prisma from './src/lib/prisma';

async function main() {
    const stockItems = await prisma.inventoryItem.findMany({
        where: { status: "AVAILABLE" },
        include: {
            product: {
                include: { category: true }
            },
            metalType: true,
        }
    });
    console.log("Found items:", stockItems.length);
    if (stockItems.length > 0) {
        console.log(JSON.stringify(stockItems[0], null, 2));
    }
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
