/**
 * Seed Script for Product Gallery
 * Generates 50+ realistic jewellery items with varied statuses and pricing.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const ORG_ID = "org-akhtar"; // Hardcoded for this demo

const METALS = [
    { name: "Gold", purity: "22K" },
    { name: "Gold", purity: "21K" },
    { name: "Gold", purity: "18K" },
    { name: "Silver", purity: "925" },
];

const CATEGORIES = ["Ring", "Necklace", "Bangle", "Earring", "Bracelet", "Chain", "Pendant"];

// Helper to get random item
function getRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Helper for random decimal
function randomDecimal(min: number, max: number, precision = 3): number {
    const val = Math.random() * (max - min) + min;
    return parseFloat(val.toFixed(precision));
}

async function main() {
    console.log("🌱 Starting Gallery Seeding...");

    // 1. Ensure Org exists
    const org = await prisma.organization.upsert({
        where: { id: ORG_ID },
        update: {},
        create: { id: ORG_ID, name: "Akhtar Jewellers" },
    });

    // 2. Ensure Categories
    const categoryMap = new Map<string, string>();
    for (const catName of CATEGORIES) {
        const cat = await prisma.category.upsert({
            where: { orgId_name: { orgId: ORG_ID, name: catName } },
            update: {},
            create: { orgId: ORG_ID, name: catName },
        });
        categoryMap.set(catName, cat.id);
    }

    // 3. Ensure Metal Types
    const metalMap = new Map<string, string>();
    for (const m of METALS) {
        const metal = await prisma.metalType.upsert({
            where: { orgId_name_purity: { orgId: ORG_ID, name: m.name, purity: m.purity } },
            update: {},
            create: {
                orgId: ORG_ID,
                name: m.name,
                purity: m.purity,
                purityValue: m.name === "Gold" ? (m.purity === "22K" ? 91.6 : 87.5) : 92.5
            },
        });
        metalMap.set(`${m.name}-${m.purity}`, metal.id);
    }

    // 4. Create Dummy Products (Inventory Items) using Products as base
    // We will create Products first then InventoryItems or just quick Product+Item combo

    const statusDist = [
        ...Array(30).fill("AVAILABLE"),
        ...Array(10).fill("SOLD"),
        ...Array(5).fill("RESERVED"),
        ...Array(5).fill("AVAILABLE"), // For low stock sim
    ];

    for (let i = 0; i < 50; i++) {
        const catName = getRandom(CATEGORIES);
        const metalKey = getRandom(Array.from(metalMap.keys()));
        const metalId = metalMap.get(metalKey)!;

        // Generate weights
        const grossWeight = randomDecimal(3, 50);
        const stoneWeight = Math.random() > 0.7 ? randomDecimal(0.5, 5) : 0;
        const netWeight = grossWeight - stoneWeight;

        // Create Base Product
        const product = await prisma.product.create({
            data: {
                orgId: ORG_ID,
                name: `${metalKey} ${catName} ${1000 + i}`,
                designCode: `DSN-${1000 + i}`,
                categoryId: categoryMap.get(catName)!,
                metalTypeId: metalId,
                makingCharges: randomDecimal(500, 5000, 2),
                description: `Beautiful ${metalKey} ${catName}`,
            }
        });

        const status = statusDist[i] || "AVAILABLE";
        const isLowStock = i >= 45; // Last 5 are low stock logic (just 1 qty but we can pretend)

        // Create Inventory Item
        await prisma.inventoryItem.create({
            data: {
                orgId: ORG_ID,
                productId: product.id,
                sku: `SKU-${2000 + i}`,
                grossWeight,
                netWeight,
                stoneWeight,
                makingCharges: randomDecimal(100, 1000, 2), // Override
                wastagePercent: randomDecimal(0, 5, 2),
                retailPrice: randomDecimal(50000, 200000, 0),
                wholesalePrice: randomDecimal(45000, 180000, 0),
                designCode: product.designCode,
                status: status as any,
                quantity: 1,
                importedAt: new Date(),
                soldAt: status === "SOLD" ? new Date() : null,
            }
        });
    }

    console.log("✅ Gallery Seeding Completed!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
