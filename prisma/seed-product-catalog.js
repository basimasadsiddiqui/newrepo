/**
 * Seeds the ProductCatalog with the built-in item-name shortcuts so the
 * "Item Detail" autocomplete can suggest tag captions out of the box.
 *
 * Run: node prisma/seed-product-catalog.js
 */

const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

if (process.loadEnvFile) {
    try { process.loadEnvFile() } catch (_) {}
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] })

const ORG_ID = 'org-akhtar'

// Mirrors ITEM_SHORTCUTS in src/components/invoice/ItemEntryForm.tsx
const ITEM_SHORTCUTS = {
    rings: ["Gold Ring 21K", "Gold Ring 18K", "Diamond Ring", "Stone Ring", "Wedding Band", "Engagement Ring", "Signet Ring", "Plain Band"],
    necklaces: ["Gold Necklace 21K", "Gold Chain 21K", "Diamond Necklace", "Pearl Necklace", "Pendant Set", "Choker", "Layered Chain"],
    earrings: ["Gold Earrings 21K", "Diamond Stud Earrings", "Stone Earrings", "Hoop Earrings", "Jhoomka", "Chandbali", "Drop Earrings"],
    bangles: ["Gold Bangles 21K", "Stone Bangles Set", "Diamond Bangles", "Kundan Bangles", "Bridal Bangles Set"],
    bracelets: ["Gold Bracelet 21K", "Diamond Bracelet", "Stone Bracelet", "Charm Bracelet", "Bangle Bracelet"],
    pendants: ["Gold Pendant 21K", "Diamond Pendant", "Stone Pendant", "Religious Pendant", "Heart Pendant"],
    tikka: ["Bridal Tikka 21K", "Maang Tikka", "Diamond Tikka", "Kundan Tikka"],
    "nose pins": ["Nose Pin 21K", "Diamond Nose Pin", "Stone Nose Pin", "Nath"],
    "bridal sets": ["Full Bridal Set 21K", "Gold Bridal Set", "Diamond Bridal Set", "Kundan Bridal Set"],
    mangalsutra: ["Gold Mangalsutra 21K", "Diamond Mangalsutra", "Black Bead Mangalsutra"],
    "men's": ["Men's Ring 21K", "Men's Bracelet", "Men's Chain 21K", "Kada", "Men's Pendant"],
    diamond: ["Diamond Ring", "Diamond Necklace", "Diamond Bracelet", "Diamond Earrings", "Diamond Pendant", "Diamond Set"],
    gemstone: ["Ruby Ring", "Emerald Ring", "Sapphire Ring", "Stone Necklace", "Gemstone Set"],
}

function generatePrefix(name) {
    const words = name.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '')).filter(Boolean)
    for (let i = words.length - 1; i >= 0; i--) {
        if (words[i].length >= 3) return words[i].slice(0, 3).toUpperCase()
    }
    const joined = words.join('').toUpperCase()
    return (joined + 'XXX').slice(0, 3)
}

async function main() {
    const names = new Set()
    for (const list of Object.values(ITEM_SHORTCUTS)) {
        for (const name of list) names.add(name)
    }

    let created = 0
    for (const name of names) {
        const result = await prisma.productCatalog.upsert({
            where: { orgId_name: { orgId: ORG_ID, name } },
            update: {},
            create: { orgId: ORG_ID, name, prefix: generatePrefix(name) },
        })
        if (result) created++
    }

    console.log(`Seeded ${names.size} product catalog entries.`)
    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
