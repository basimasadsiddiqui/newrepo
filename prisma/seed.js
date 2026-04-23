const { PrismaClient, Decimal } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

if (process.loadEnvFile) {
    try {
        process.loadEnvFile()
        console.log('✅ Loaded env file')
    } catch (e) {
        console.log('⚠️ Could not load env file:', e.message)
    }
}

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
    adapter,
    log: ['warn', 'error']
})

// Helper for randoms
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDec = (min, max, precision = 2) => {
    const val = Math.random() * (max - min) + min
    return new Decimal(val.toFixed(precision))
}
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)]

async function main() {
    console.log('🌱 Starting seed (JS mode)...')

    // 1. Ensure Organization
    const org = await prisma.organization.upsert({
        where: { id: 'org-default-001' },
        update: {},
        create: {
            id: 'org-default-001',
            name: 'Akhtar Jewellers',
            address: 'Gold Market, City Center',
            phone: '+92-300-1234567',
        },
    })
    console.log(`🏢 Organization: ${org.name}`)

    // 2. Metal Types
    const metals = [
        { name: 'Gold', purity: '24K', value: 99.9 },
        { name: 'Gold', purity: '22K', value: 91.6 },
        { name: 'Gold', purity: '21K', value: 87.5 },
        { name: 'Gold', purity: '18K', value: 75.0 },
        { name: 'Silver', purity: '999', value: 99.9 },
        { name: 'Silver', purity: '925', value: 92.5 },
        { name: 'Platinum', purity: '950', value: 95.0 },
    ]

    const metalMap = new Map() // key -> id

    for (const m of metals) {
        const key = `${m.name}-${m.purity}`
        const rec = await prisma.metalType.upsert({
            where: { orgId_name_purity: { orgId: org.id, name: m.name, purity: m.purity } },
            update: {},
            create: {
                orgId: org.id,
                name: m.name,
                purity: m.purity,
                purityValue: new Decimal(m.value),
            },
        })
        metalMap.set(key, rec.id)
    }
    console.log(`✨ Created ${metals.length} Metal Types`)

    // 3. Categories
    const categories = [
        'Rings', 'Bangles', 'Chains', 'Necklaces', 'Earrings', 'Bracelets', 'Coins',
        'Raw Gold Bars', 'Silver Bars', 'Loose Stones'
    ]
    const catMap = new Map()

    for (const c of categories) {
        const rec = await prisma.category.upsert({
            where: { orgId_name: { orgId: org.id, name: c } },
            update: {},
            create: { orgId: org.id, name: c },
        })
        catMap.set(c, rec.id)
    }
    console.log(`📂 Created ${categories.length} Categories`)

    // 4. Parties (Suppliers/Customers)
    const partiesData = [
        { name: 'Ahmed Bullion', type: 'Both' },
        { name: 'Karachi Gold Traders', type: 'Supplier' },
        { name: 'Royal Jewellers', type: 'Customer' },
        { name: 'Diamond Hub', type: 'Both' },
        { name: 'Silver World', type: 'Supplier' },
        { name: 'Retail Walk-in', type: 'Customer' },
        { name: 'Platinum Source', type: 'Supplier' },
        { name: 'Zain Jewels', type: 'Customer' },
    ]

    const supplierIds = []

    for (const p of partiesData) {
        let rec = await prisma.party.findFirst({
            where: { orgId: org.id, name: p.name }
        })
        if (!rec) {
            rec = await prisma.party.create({
                data: {
                    orgId: org.id,
                    name: p.name,
                    type: p.type,
                    mobile: `0300-${randomInt(1000000, 9999999)}`,
                },
            })
        }
        if (['Supplier', 'Both'].includes(p.type)) {
            supplierIds.push(rec.id)
        }
    }
    console.log(`👥 Created ${partiesData.length} Parties`)

    // 5. Products (Designs)
    const productsToCreate = []

    // Gold Products (20)
    for (let i = 1; i <= 20; i++) {
        const cat = randomItem(['Rings', 'Bangles', 'Chains', 'Necklaces', 'Earrings'])
        const purity = randomItem(['22K', '21K', '18K'])
        productsToCreate.push({
            name: `${purity} Gold ${cat} Design ${i}`,
            category: cat,
            metal: `Gold-${purity}`,
            isJewellery: true,
            skuPrefix: `G${i.toString().padStart(3, '0')}`,
            reorder: 2
        })
    }
    // Silver Products (15)
    for (let i = 1; i <= 15; i++) {
        const cat = randomItem(['Silver Bars', 'Coins', 'Bracelets', 'Rings'])
        const purity = randomItem(['999', '925'])
        productsToCreate.push({
            name: `${purity} Silver ${cat} Design ${i}`,
            category: cat,
            metal: `Silver-${purity}`,
            isJewellery: true,
            skuPrefix: `S${i.toString().padStart(3, '0')}`,
            reorder: 5
        })
    }
    // Platinum (5)
    for (let i = 1; i <= 5; i++) {
        productsToCreate.push({
            name: `Platinum Ring Design ${i}`,
            category: 'Rings',
            metal: 'Platinum-950',
            isJewellery: true,
            skuPrefix: `P${i.toString().padStart(3, '0')}`,
            reorder: 1
        })
    }
    // Raw / Stone (10)
    for (let i = 1; i <= 5; i++) {
        productsToCreate.push({
            name: `Raw Gold Bar ${i}0g`,
            category: 'Raw Gold Bars',
            metal: 'Gold-24K',
            isJewellery: false,
            skuPrefix: `RB${i}`,
            reorder: 10
        })
    }
    for (let i = 1; i <= 5; i++) {
        productsToCreate.push({
            name: `Loose Diamond Packet ${i}`,
            category: 'Loose Stones',
            metal: 'Gold-24K',
            isJewellery: false,
            skuPrefix: `LD${i}`,
            reorder: 50
        })
    }

    console.log(`📦 Generating ${productsToCreate.length} Products...`)
    let totalStockCount = 0

    for (const p of productsToCreate) {
        const catId = catMap.get(p.category)
        const metalId = metalMap.get(p.metal)

        // Create Product Master
        const product = await prisma.product.create({
            data: {
                orgId: org.id,
                name: p.name,
                designCode: `${p.skuPrefix}-M`,
                categoryId: catId,
                metalTypeId: metalId,
                isJewellery: p.isJewellery,
                reorderThreshold: p.reorder,
                makingCharges: randomDec(500, 5000),
                wastagePercent: randomDec(0, 5),
                description: `Auto-generated ${p.name}`,
            }
        })

        // Generate Stock for this product
        const stockCount = randomInt(1, 5) // 1-5 items per product design

        for (let k = 0; k < stockCount; k++) {
            const isSold = Math.random() < 0.2
            const isReserved = !isSold && Math.random() < 0.1
            // Enum strings: AVAILABLE, SOLD, RESERVED
            const status = isSold ? 'SOLD' : (isReserved ? 'RESERVED' : 'AVAILABLE')

            const gw = p.category.includes('Ring') ? randomDec(3, 15) :
                p.category.includes('Bangle') ? randomDec(15, 60) :
                    p.category.includes('Chain') ? randomDec(10, 40) :
                        p.category.includes('Bar') ? randomDec(50, 1000) : randomDec(2, 20)

            const stoneWt = p.isJewellery && Math.random() > 0.5 ? randomDec(0, 2) : new Decimal(0)
            const nw = gw.minus(stoneWt)

            const supplierId = randomItem(supplierIds)

            const item = await prisma.inventoryItem.create({
                data: {
                    orgId: org.id,
                    productId: product.id,
                    metalTypeId: metalId,
                    supplierId: supplierId,
                    sku: `${p.skuPrefix}-${k}-${randomInt(1000, 9999)}`,
                    grossWeight: gw,
                    netWeight: nw,
                    stoneWeight: stoneWt,
                    quantity: 1,
                    status: status,
                    location: 'Main Vault',
                }
            })

            // Purchase History
            await prisma.stockMovement.create({
                data: {
                    orgId: org.id,
                    inventoryItemId: item.id,
                    type: 'PURCHASE', // Using string directly as enum is confusing in JS without types
                    quantityChange: 1,
                    weightChange: nw,
                    remarks: 'Initial Purchase',
                    createdAt: new Date(Date.now() - randomInt(10000000, 50000000))
                }
            })

            if (status === 'SOLD') {
                await prisma.stockMovement.create({
                    data: {
                        orgId: org.id,
                        inventoryItemId: item.id,
                        type: 'SALE',
                        quantityChange: -1,
                        weightChange: nw.times(-1),
                        remarks: 'Sold to Customer',
                        createdAt: new Date()
                    }
                })
            }

            totalStockCount++
        }
    }

    console.log(`✅ JS Seed Complete! Generated ${totalStockCount} stock items.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
