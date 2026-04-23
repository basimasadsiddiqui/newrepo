const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

// Load environment variables for standalone execution
if (process.loadEnvFile) {
    process.loadEnvFile()
}

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

async function main() {
    console.log('🌱 Starting Gallery Seed (Adding Image Products)...')

    const ORG_ID = 'org-akhtar' // Assuming default org from main seed

    try {
        // 1. Ensure Org exists (just a check)
        const org = await prisma.organization.findUnique({ where: { id: ORG_ID } })
        if (!org) {
            console.error('❌ Default Organization not found. Please run main seed first.')
            return
        }

        // 2. Define New Products with Images
        const galleryProducts = [
            {
                name: 'Royal 22K Gold Ruby Ring',
                description: 'A luxurious 22K gold ring with intricate filigree design and a large central ruby stone.',
                categoryName: 'Rings',
                metalName: 'Gold',
                metalPurity: '22K',
                image: '/images/products/gold_ring_luxury.svg',
                skuPrefix: 'RN-LUX',
                makingCharges: 3500,
                weightRange: [5, 12] // g
            },
            {
                name: 'Traditional Bridal Gold Necklace',
                description: 'A traditional heavy gold bridal necklace with intricate craftsmanship.',
                categoryName: 'Necklaces',
                metalName: 'Gold',
                metalPurity: '22K',
                image: '/images/products/gold_necklace_traditional.svg',
                skuPrefix: 'NK-TRD',
                makingCharges: 12000,
                weightRange: [40, 80]
            },
            {
                name: 'Antique Gold Bangle Set',
                description: 'A set of 4 detailed 22K gold bangles with traditional Indian patterns.',
                categoryName: 'Bangles',
                metalName: 'Gold',
                metalPurity: '22K',
                image: '/images/products/gold_bangles_set.svg',
                skuPrefix: 'BG-SET',
                makingCharges: 5000,
                weightRange: [30, 60]
            },
            {
                name: 'VS Diamond Stud Earrings',
                description: 'Elegant diamond stud earrings set in 18K Gold.',
                categoryName: 'Earrings',
                metalName: 'Gold',
                metalPurity: '18K',
                image: '/images/products/diamond_studs.svg',
                skuPrefix: 'ER-DIA',
                makingCharges: 2500,
                weightRange: [2, 5],
                stoneWeight: 0.5 // fixed approx
            },
            {
                name: 'Men\'s Heavy Silver Bracelet',
                description: 'A thick silver chain bracelet for men.',
                categoryName: 'Bracelets',
                metalName: 'Silver',
                metalPurity: '925',
                image: '/images/products/silver_bracelet_mens.svg',
                skuPrefix: 'BR-SLV',
                makingCharges: 1500,
                weightRange: [20, 50]
            },
            {
                name: 'Classic Platinum Wedding Band',
                description: 'A simple, elegant platinum wedding band.',
                categoryName: 'Rings',
                metalName: 'Platinum',
                metalPurity: '950',
                image: '/images/products/platinum_band.svg',
                skuPrefix: 'RN-PLT',
                makingCharges: 4000,
                weightRange: [4, 8]
            }
        ]

        // 3. Process each product
        for (const p of galleryProducts) {
            console.log(`Processing: ${p.name}...`)

            // A. Find/Create Category
            let category = await prisma.category.findFirst({
                where: { orgId: ORG_ID, name: p.categoryName }
            })
            if (!category) {
                category = await prisma.category.create({
                    data: { orgId: ORG_ID, name: p.categoryName }
                })
            }

            // B. Find/Create MetalType
            let metal = await prisma.metalType.findFirst({
                where: { orgId: ORG_ID, name: p.metalName, purity: p.metalPurity }
            })
            if (!metal) {
                // Determine value approx
                let val = 0
                if (p.metalName === 'Gold') val = p.metalPurity === '24K' ? 99.9 : (p.metalPurity === '22K' ? 91.6 : 75.0)
                if (p.metalName === 'Silver') val = p.metalPurity === '999' ? 99.9 : 92.5
                if (p.metalName === 'Platinum') val = 95.0

                metal = await prisma.metalType.create({
                    data: {
                        orgId: ORG_ID,
                        name: p.metalName,
                        purity: p.metalPurity,
                        purityValue: val
                    }
                })
            }

            // C. Create Product
            // Check if exists by name to avoid dupes on re-run
            let product = await prisma.product.findFirst({
                where: { orgId: ORG_ID, name: p.name }
            })

            if (!product) {
                product = await prisma.product.create({
                    data: {
                        orgId: ORG_ID,
                        name: p.name,
                        description: p.description,
                        categoryId: category.id,
                        metalTypeId: metal.id,
                        imageUrl: p.image,
                        designCode: `${p.skuPrefix}-GEN`,
                        makingCharges: p.makingCharges,
                        isActive: true
                    }
                })
                console.log(`   -> Created Product: ${product.name}`)
            } else {
                // Update image if needed
                if (product.imageUrl !== p.image) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { imageUrl: p.image }
                    })
                    console.log(`   -> Updated Image for: ${product.name}`)
                }
            }

            // D. Create Inventory Items (Stock)
            // Check if we already have simple stock for this product
            const stockCount = await prisma.inventoryItem.count({
                where: { orgId: ORG_ID, productId: product.id, status: 'AVAILABLE' }
            })

            if (stockCount < 2) {
                // Add 2 items for each
                for (let i = 0; i < 2; i++) {
                    const gwVal = parseFloat(randomDec(p.weightRange[0], p.weightRange[1]))
                    const stoneWtVal = p.stoneWeight || 0
                    const nwVal = gwVal - stoneWtVal

                    await prisma.inventoryItem.create({
                        data: {
                            orgId: ORG_ID,
                            productId: product.id,
                            metalTypeId: metal.id,
                            sku: `${p.skuPrefix}-${randomInt(10000, 99999)}`,
                            grossWeight: gwVal,
                            netWeight: nwVal,
                            stoneWeight: stoneWtVal,
                            quantity: 1,
                            status: 'AVAILABLE',
                            location: 'Display Gallery',
                            makingCharges: p.makingCharges
                        }
                    })
                }
                console.log(`   -> Added 2 stock items`)
            } else {
                console.log(`   -> Stock already exists`)
            }
        }

        console.log('✅ Gallery Seed Complete!')

    } catch (e) {
        console.error('ERROR:', e)
    } finally {
        await prisma.$disconnect()
        await pool.end()
    }
}

main()
