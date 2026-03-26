
// Patch BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function () {
    return this.toString()
}

import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Setup Adapter
const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('🔍 Verifying Inventory Data...')

    try {
        const productCount = await prisma.product.count()
        console.log(`Products: ${productCount}`)

        const itemCount = await prisma.inventoryItem.count()
        console.log(`Inventory Items: ${itemCount}`)

        const availableItems = await prisma.inventoryItem.count({ where: { status: 'AVAILABLE' } })
        console.log(`Available Items: ${availableItems}`)

        const soldItems = await prisma.inventoryItem.count({ where: { status: 'SOLD' } })
        console.log(`Sold Items: ${soldItems}`)

        const aggregate = await prisma.inventoryItem.aggregate({
            where: { status: 'AVAILABLE' },
            _sum: {
                grossWeight: true,
                netWeight: true,
                stoneWeight: true
            }
        })

        console.log(`Total Gross Weight (Available): ${aggregate._sum.grossWeight}`)
        console.log(`Total Net Weight (Available): ${aggregate._sum.netWeight}`)
        console.log(`Total Stone Weight (Available): ${aggregate._sum.stoneWeight}`)

        const goldItems = await prisma.inventoryItem.findMany({
            where: {
                status: 'AVAILABLE',
                // Assuming metalType is relation, verify if relation filtering works with adapter
                metalType: { is: { name: 'Gold' } }
            },
            take: 5,
            include: { product: true }
        })

        console.log('\nSample Gold Items:')
        goldItems.forEach(item => {
            console.log(`- ${item.product.name} (${item.sku}): GW ${item.grossWeight}, NW ${item.netWeight}`)
        })

    } catch (e) {
        console.error('VERIFICATION ERROR:', e)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
