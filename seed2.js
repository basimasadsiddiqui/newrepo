const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

// Load environment variables
if (process.loadEnvFile) {
    process.loadEnvFile()
}

// Setup Adapter
const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Helper for randoms
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDec = (min, max, precision = 3) => {
    const val = Math.random() * (max - min) + min
    return val.toFixed(precision) // Return string
}
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)]

async function main() {
    console.log('🌱 Starting seed (JS mode - Adapter PG)...')

    try {
        // 1. Ensure Organization
        console.log('Creating Org...')
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
        console.log('Creating Metals...')
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
            try {
                const key = `${m.name}-${m.purity}`
                const rec = await prisma.metalType.upsert({
                    where: { orgId_name_purity: { orgId: org.id, name: m.name, purity: m.purity } },
                    update: {},
                    create: {
                        orgId: org.id,
                        name: m.name,
                        purity: m.purity,
                        purityValue: m.value,
                    },
                })
                metalMap.set(key, rec.id)
            } catch (err) {
                console.error(`Failed to create metal ${m.name} ${m.purity}:`, err)
            }
        }
        console.log(`✨ Created Metals`)

        // 3. Categories
        console.log('Creating Categories...')
        const categories = [
            'Rings', 'Bangles', 'Chains', 'Necklaces', 'Earrings', 'Bracelets', 'Coins',
            'Raw Gold Bars', 'Silver Bars', 'Loose Stones'
        ]
        const catMap = new Map()

        for (const c of categories) {
            try {
                const rec = await prisma.category.upsert({
                    where: { orgId_name: { orgId: org.id, name: c } },
                    update: {},
                    create: { orgId: org.id, name: c },
                })
                catMap.set(c, rec.id)
            } catch (err) {
                console.error(`Failed to create category ${c}:`, err)
            }
        }
        console.log(`📂 Created Categories`)

        // 4. Parties
        console.log('Creating Parties...')
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
            try {
                const rec = await prisma.party.upsert({
                    where: { orgId_name: { orgId: org.id, name: p.name } },
                    update: {},
                    create: {
                        orgId: org.id,
                        name: p.name,
                        type: p.type,
                        mobile: `0300-${randomInt(1000000, 9999999)}`,
                    },
                })
                if (['Supplier', 'Both'].includes(p.type)) {
                    supplierIds.push(rec.id)
                }
            } catch (err) {
                console.error(`Failed to create party ${p.name}:`, err)
            }
        }
        console.log(`👥 Created Parties`)

        // 5. Products
        console.log('Creating Products...')
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

        console.log(`📦 Generating ${productsToCreate.length} Products...`)

        let totalStockCount = 0

        for (const p of productsToCreate) {
            try {
                const catId = catMap.get(p.category)
                const metalId = metalMap.get(p.metal)

                if (!catId || !metalId) continue

                // Create Product
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

                // Generate Stock
                const stockCount = randomInt(1, 4)

                for (let k = 0; k < stockCount; k++) {
                    const gwVal = parseFloat(randomDec(2, 50))
                    const stoneWtVal = p.isJewellery && Math.random() > 0.5 ? Math.random() : 0
                    const nwVal = gwVal - stoneWtVal

                    const supplierId = randomItem(supplierIds) || supplierIds[0]

                    const isSold = Math.random() < 0.2
                    const status = isSold ? 'SOLD' : 'AVAILABLE'

                    const item = await prisma.inventoryItem.create({
                        data: {
                            orgId: org.id,
                            productId: product.id,
                            metalTypeId: metalId,
                            supplierId: supplierId,
                            sku: `${p.skuPrefix}-${k}-${randomInt(1000, 9999)}`,
                            grossWeight: gwVal.toFixed(3),
                            netWeight: nwVal.toFixed(3),
                            stoneWeight: stoneWtVal.toFixed(3),
                            quantity: 1,
                            status: status,
                            location: 'Main Vault',
                        }
                    })

                    // Transaction
                    await prisma.stockMovement.create({
                        data: {
                            orgId: org.id,
                            inventoryItemId: item.id,
                            type: 'PURCHASE',
                            quantityChange: 1,
                            weightChange: nwVal.toFixed(3),
                            remarks: 'Initial Purchase'
                        }
                    })

                    totalStockCount++
                }
            } catch (err) {
                console.error('Failed to create product/stock for', p.name, err)
            }
        }

        console.log(`✅ JS Seed Complete! Generated ${totalStockCount} stock items.`)

    } catch (e) {
        console.error('CRITICAL FAILURE:', e)
    } finally {
        await prisma.$disconnect()
        await pool.end()
    }
}

main()
    .catch((e) => {
        console.error('MAIN ERROR:', e)
        process.exit(1)
    })
