
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyGalleryData() {
    console.log('--- Verifying Gallery Data ---');

    // 1. Check Organizations
    const orgs = await prisma.organization.findMany();
    console.log('Organizations:', orgs.map(o => ({ id: o.id, name: o.name })));

    const ORG_ID = "org-akhtar"; // The ID used in gallery.ts
    const orgExists = orgs.some(o => o.id === ORG_ID);
    console.log(`Does hardcoded ORG_ID "${ORG_ID}" exist?`, orgExists);

    // 2. Check Inventory Items
    const totalItems = await prisma.inventoryItem.count();
    console.log('Total Inventory Items:', totalItems);

    // Check items for the specific org
    const galleryItems = await prisma.inventoryItem.findMany({
        where: {
            orgId: ORG_ID,
            deletedAt: null
        },
        include: {
            product: true
        },
        take: 5
    });

    console.log(`Inventory Items for ORG_ID "${ORG_ID}" (not deleted):`, galleryItems.length);

    if (galleryItems.length > 0) {
        console.log('Sample Item:', {
            id: galleryItems[0].id,
            productName: galleryItems[0].product.name,
            images: galleryItems[0].product.imageUrl,
            sku: galleryItems[0].sku,
            status: galleryItems[0].status
        });
    } else {
        // Check if items exist under OTHER orgs
        const otherItems = await prisma.inventoryItem.findFirst();
        if (otherItems) {
            console.log('Found item under different Org:', otherItems.orgId);
        }
    }

    // 3. Check Products (Are there products without inventory?)
    const totalProducts = await prisma.product.count();
    console.log('Total Products:', totalProducts);
}

verifyGalleryData()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
