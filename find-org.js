
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findActiveOrg() {
    console.log('--- Finding Active Organization ---');

    // 1. Find all organizations
    const orgs = await prisma.organization.findMany();
    console.log('Available Organizations:', orgs.map(o => ({ id: o.id, name: o.name })));

    // 2. Find any inventory item to see which Org it belongs to
    const item = await prisma.inventoryItem.findFirst();
    if (item) {
        console.log('Found an inventory item belonging to Org ID:', item.orgId);
    } else {
        console.log('WARNING: No inventory items found in the entire database!');
    }
}

findActiveOrg()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
