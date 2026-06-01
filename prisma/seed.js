/**
 * Comprehensive seed — Akhtar Jewellers ERP
 * Populates: org, users, metal types, categories, stone types (as products),
 * parties, gold rates (30 days), metal rates, polish/labour config,
 * products, inventory, invoices (SALE + PURCHASE) with items,
 * payments, customer orders, ledger entries.
 *
 * Run: node prisma/seed.js
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

// ─── helpers ────────────────────────────────────────────────────────────────
const ri  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const rd  = (min, max, p = 3) => (Math.random() * (max - min) + min).toFixed(p)
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const daysAgo = n => new Date(Date.now() - n * 86_400_000)

// Pakistani gold rate range (Rs / tola, 24K) — realistic 2024-25
const BASE_GOLD_TOLA = 280000
const TOLA_TO_GRAM   = 11.664

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🌱  Starting Akhtar Jewellers full seed...\n')

    // ── 1. Organization ──────────────────────────────────────────────────────
    const org = await prisma.organization.upsert({
        where:  { id: 'org-default-001' },
        update: { name: 'Akhtar Jewellers', phone: '+92-300-1234567', address: 'Shop #7, Gold Market, Sarafa Bazaar, Karachi' },
        create: {
            id:      'org-default-001',
            name:    'Akhtar Jewellers',
            address: 'Shop #7, Gold Market, Sarafa Bazaar, Karachi',
            phone:   '+92-300-1234567',
            settings: { currency: 'PKR', weightUnit: 'gram', defaultCarat: 21 },
        },
    })
    console.log(`🏢  Org: ${org.name}`)

    // ── 2. Admin user ────────────────────────────────────────────────────────
    await prisma.user.upsert({
        where:  { email: 'admin@akhtarjewellers.pk' },
        update: {},
        create: {
            orgId:        org.id,
            name:         'Akhtar Sahib (Admin)',
            email:        'admin@akhtarjewellers.pk',
            passwordHash: '$2b$10$demoHashForDevOnly.doNotUseInProd',
            role:         'ADMIN',
        },
    })
    console.log('👤  Admin user ready')

    // ── 3. Metal types ───────────────────────────────────────────────────────
    const METALS = [
        { name: 'Gold',     purity: '24K', value: '0.9999' },
        { name: 'Gold',     purity: '22K', value: '0.9160' },
        { name: 'Gold',     purity: '21K', value: '0.8750' },
        { name: 'Gold',     purity: '18K', value: '0.7500' },
        { name: 'Silver',   purity: '999', value: '0.9990' },
        { name: 'Silver',   purity: '925', value: '0.9250' },
        { name: 'Platinum', purity: '950', value: '0.9500' },
    ]
    const metalMap = new Map()
    for (const m of METALS) {
        const rec = await prisma.metalType.upsert({
            where:  { orgId_name_purity: { orgId: org.id, name: m.name, purity: m.purity } },
            update: {},
            create: { orgId: org.id, name: m.name, purity: m.purity, purityValue: m.value },
        })
        metalMap.set(`${m.name}-${m.purity}`, rec.id)
    }
    console.log(`✨  ${METALS.length} metal types`)

    // ── 4. Categories ────────────────────────────────────────────────────────
    const CATEGORIES = [
        'Rings', 'Bangles', 'Chains', 'Necklaces', 'Earrings',
        'Bracelets', 'Pendants', 'Sets', 'Coins', 'Anklets',
        'Raw Gold Bars', 'Silver Bars',
        'Loose Stones', 'Diamonds', 'Precious Stones',
    ]
    const catMap = new Map()
    for (const c of CATEGORIES) {
        const rec = await prisma.category.upsert({
            where:  { orgId_name: { orgId: org.id, name: c } },
            update: {},
            create: { orgId: org.id, name: c },
        })
        catMap.set(c, rec.id)
    }
    console.log(`📂  ${CATEGORIES.length} categories`)

    // ── 5. Parties ───────────────────────────────────────────────────────────
    const PARTIES = [
        // Suppliers
        { name: 'Ahmed Bullion & Co.',       type: 'Supplier', mobile: '0321-2345678', address: 'Sarafa Bazar, Karachi' },
        { name: 'Karachi Gold Traders',      type: 'Supplier', mobile: '0333-3456789', address: 'Bolton Market, Karachi' },
        { name: 'Diamond Hub International', type: 'Supplier', mobile: '0312-4567890', address: 'Zaveri Bazaar, Karachi' },
        { name: 'Silver World Exports',      type: 'Supplier', mobile: '0300-5678901', address: 'Hyderabad' },
        { name: 'Lahore Gold Bazaar',        type: 'Supplier', mobile: '0311-6789012', address: 'Anarkali, Lahore' },
        { name: 'Malik Gems & Stones',       type: 'Supplier', mobile: '0345-7890123', address: 'Peshawar' },
        // Customers
        { name: 'Royal Jewellers Clifton',   type: 'Customer', mobile: '0301-8901234', address: 'Clifton, Karachi' },
        { name: 'Zain Jewels DHA',           type: 'Customer', mobile: '0322-9012345', address: 'DHA Phase 6, Karachi' },
        { name: 'Fatima Traders',            type: 'Customer', mobile: '0313-0123456', address: 'Gulshan, Karachi' },
        { name: 'Gold Palace Lahore',        type: 'Customer', mobile: '0303-1234567', address: 'Mall Road, Lahore' },
        { name: 'Muhammad Brothers',         type: 'Customer', mobile: '0336-2345678', address: 'Faisalabad' },
        // Both (wholesale + supply)
        { name: 'Al-Noor Jewel House',       type: 'Both',     mobile: '0314-3456789', address: 'Saddar, Karachi' },
        { name: 'City Gold Traders',         type: 'Both',     mobile: '0323-4567890', address: 'Jodia Bazaar, Karachi' },
        { name: 'Hassan & Sons Jewellers',   type: 'Both',     mobile: '0344-5678901', address: 'Rawalpindi' },
        { name: 'Pak Jewel House',           type: 'Both',     mobile: '0315-6789012', address: 'Multan' },
    ]
    const partyMap   = new Map() // name → id
    const supplierIds = []
    const customerIds = []
    for (const p of PARTIES) {
        let rec = await prisma.party.findFirst({ where: { orgId: org.id, name: p.name } })
        if (!rec) {
            rec = await prisma.party.create({
                data: { orgId: org.id, name: p.name, type: p.type, mobile: p.mobile, address: p.address },
            })
        }
        partyMap.set(p.name, rec.id)
        if (['Supplier', 'Both'].includes(p.type)) supplierIds.push(rec.id)
        if (['Customer', 'Both'].includes(p.type)) customerIds.push(rec.id)
    }
    console.log(`👥  ${PARTIES.length} parties`)

    // ── 6. Gold rates — 30 days of realistic PKR/tola history ───────────────
    const existingRates = await prisma.goldRate.count({ where: { orgId: org.id } })
    if (existingRates === 0) {
        const carats = [24, 22, 21, 18]
        const purities = { 24: 1.0, 22: 0.9167, 21: 0.875, 18: 0.75 }
        for (let day = 30; day >= 0; day--) {
            const fluctuation = (Math.random() - 0.48) * 3000  // slight upward drift
            const base24 = BASE_GOLD_TOLA + (30 - day) * 400 + fluctuation
            for (const carat of carats) {
                await prisma.goldRate.create({
                    data: {
                        orgId: org.id,
                        carat,
                        rate:  (base24 * purities[carat]).toFixed(2),
                        date:  daysAgo(day),
                    },
                })
            }
        }
        console.log('📈  31 days × 4 carats = 124 gold rate records')
    } else {
        console.log('📈  Gold rates already exist, skipping')
    }

    // ── 7. Metal rates (current) ─────────────────────────────────────────────
    const metalRatesData = [
        { metal: 'Gold-24K', ratePerGram: (BASE_GOLD_TOLA / TOLA_TO_GRAM).toFixed(2) },
        { metal: 'Gold-22K', ratePerGram: (BASE_GOLD_TOLA * 0.9167 / TOLA_TO_GRAM).toFixed(2) },
        { metal: 'Gold-21K', ratePerGram: (BASE_GOLD_TOLA * 0.875  / TOLA_TO_GRAM).toFixed(2) },
        { metal: 'Gold-18K', ratePerGram: (BASE_GOLD_TOLA * 0.75   / TOLA_TO_GRAM).toFixed(2) },
        { metal: 'Silver',   ratePerGram: '290.00' },
        { metal: 'Platinum', ratePerGram: '3200.00' },
    ]
    for (const mr of metalRatesData) {
        await prisma.metalRate.upsert({
            where:  { orgId_metal: { orgId: org.id, metal: mr.metal } },
            update: { ratePerGram: mr.ratePerGram, lastUpdated: new Date() },
            create: { orgId: org.id, metal: mr.metal, ratePerGram: mr.ratePerGram, source: 'SEED' },
        })
        await prisma.metalRateHistory.create({
            data: { orgId: org.id, metal: mr.metal, ratePerGram: mr.ratePerGram, source: 'SEED' },
        })
    }
    console.log(`💰  ${metalRatesData.length} metal rates`)

    // ── 8. Polish & Labour config ────────────────────────────────────────────
    const plExists = await prisma.polishLabourConfig.count({ where: { orgId: org.id } })
    if (plExists === 0) {
        await prisma.polishLabourConfig.create({
            data: {
                orgId:       org.id,
                polishBasis: 'Per Tola',
                polishRate:  '500.00',
                labourBasis: 'Per Tola',
                labourRate:  '1200.00',
                isDefault:   true,
            },
        })
        console.log('🔧  Polish & Labour config created')
    }

    // ── 9. Products & inventory ──────────────────────────────────────────────
    console.log('\n📦  Building products & inventory...')

    // Helper to create a product + stock items
    async function makeProduct({ name, cat, metal, isJewellery = true, skuPfx, reorder = 2, stockCount }) {
        const catId    = catMap.get(cat)
        const metalId  = metalMap.get(metal)
        if (!catId || !metalId) return null

        const product = await prisma.product.create({
            data: {
                orgId:          org.id,
                name,
                designCode:     skuPfx + '-M',
                categoryId:     catId,
                metalTypeId:    metalId,
                isJewellery,
                reorderThreshold: reorder,
                makingCharges:  rd(800, 4000),
                wastagePercent: rd(0.5, 4),
                description:    name,
            },
        })

        const items = []
        const count = stockCount ?? ri(1, 4)
        for (let k = 0; k < count; k++) {
            const isSold     = Math.random() < 0.15
            const isReserved = !isSold && Math.random() < 0.08
            const status     = isSold ? 'SOLD' : isReserved ? 'RESERVED' : 'AVAILABLE'

            const gw = cat === 'Rings'       ? rd(3, 12) :
                       cat === 'Bangles'     ? rd(18, 55) :
                       cat === 'Chains'      ? rd(10, 35) :
                       cat === 'Necklaces'   ? rd(20, 80) :
                       cat === 'Earrings'    ? rd(2, 8) :
                       cat === 'Bracelets'   ? rd(8, 30) :
                       cat === 'Sets'        ? rd(40, 120) :
                       cat === 'Pendants'    ? rd(2, 10) :
                       cat === 'Raw Gold Bars' ? rd(50, 500) :
                       cat === 'Silver Bars' ? rd(100, 1000) :
                       cat === 'Coins'       ? rd(8, 12) :
                       cat === 'Anklets'     ? rd(5, 18) :
                       rd(2, 20)

            const stoneWt = (isJewellery && Math.random() > 0.55) ? rd(0.2, 3) : '0.000'
            const nw = (parseFloat(gw) - parseFloat(stoneWt)).toFixed(3)

            const item = await prisma.inventoryItem.create({
                data: {
                    orgId:       org.id,
                    productId:   product.id,
                    metalTypeId: metalId,
                    supplierId:  pick(supplierIds),
                    sku:         `${skuPfx}-${k + 1}-${ri(1000, 9999)}`,
                    grossWeight: gw,
                    netWeight:   nw > 0 ? nw : '0.000',
                    stoneWeight: stoneWt,
                    quantity:    1,
                    status,
                    location:    pick(['Main Vault', 'Display Case A', 'Display Case B', 'Storage Room']),
                    importedAt:  daysAgo(ri(30, 180)),
                },
            })

            await prisma.stockMovement.create({
                data: {
                    orgId:           org.id,
                    inventoryItemId: item.id,
                    type:            'PURCHASE',
                    quantityChange:  1,
                    weightChange:    nw > 0 ? nw : '0.000',
                    remarks:         'Opening / purchase stock',
                    createdAt:       daysAgo(ri(30, 180)),
                },
            })
            if (status === 'SOLD') {
                await prisma.stockMovement.create({
                    data: {
                        orgId:           org.id,
                        inventoryItemId: item.id,
                        type:            'SALE',
                        quantityChange:  -1,
                        weightChange:    nw > 0 ? `-${nw}` : '0.000',
                        remarks:         'Sold',
                        createdAt:       daysAgo(ri(1, 29)),
                    },
                })
            }
            items.push(item)
        }
        return { product, items }
    }

    // Gold jewellery
    const goldJewellery = [
        { name: '21K Gold Ring — Classic Band',         cat: 'Rings',     metal: 'Gold-21K', skuPfx: 'GR001' },
        { name: '21K Gold Ring — Ladies Flower',        cat: 'Rings',     metal: 'Gold-21K', skuPfx: 'GR002' },
        { name: '22K Gold Ring — Gents Signet',         cat: 'Rings',     metal: 'Gold-22K', skuPfx: 'GR003' },
        { name: '21K Gold Bangle — Plain Kara',         cat: 'Bangles',   metal: 'Gold-21K', skuPfx: 'GB001' },
        { name: '22K Gold Bangle — Twisted Design',     cat: 'Bangles',   metal: 'Gold-22K', skuPfx: 'GB002' },
        { name: '21K Gold Bangle — Churi Set 4',        cat: 'Bangles',   metal: 'Gold-21K', skuPfx: 'GB003' },
        { name: '22K Gold Chain — Franco Link',         cat: 'Chains',    metal: 'Gold-22K', skuPfx: 'GC001' },
        { name: '21K Gold Chain — Figaro 18 inch',      cat: 'Chains',    metal: 'Gold-21K', skuPfx: 'GC002' },
        { name: '22K Gold Chain — Box Link 22 inch',    cat: 'Chains',    metal: 'Gold-22K', skuPfx: 'GC003' },
        { name: '21K Gold Necklace — Kundan Set',       cat: 'Necklaces', metal: 'Gold-21K', skuPfx: 'GN001' },
        { name: '22K Gold Necklace — Choker',           cat: 'Necklaces', metal: 'Gold-22K', skuPfx: 'GN002' },
        { name: '21K Gold Necklace — Bridal Rani Haar', cat: 'Necklaces', metal: 'Gold-21K', skuPfx: 'GN003' },
        { name: '21K Gold Earring — Jhumka Pair',       cat: 'Earrings',  metal: 'Gold-21K', skuPfx: 'GE001' },
        { name: '22K Gold Earring — Tops Pair',         cat: 'Earrings',  metal: 'Gold-22K', skuPfx: 'GE002' },
        { name: '21K Gold Earring — Chandelier Pair',   cat: 'Earrings',  metal: 'Gold-21K', skuPfx: 'GE003' },
        { name: '21K Gold Bracelet — Tennis Style',     cat: 'Bracelets', metal: 'Gold-21K', skuPfx: 'GBR001' },
        { name: '22K Gold Bracelet — ID Plate',         cat: 'Bracelets', metal: 'Gold-22K', skuPfx: 'GBR002' },
        { name: '21K Gold Pendant — Heart',             cat: 'Pendants',  metal: 'Gold-21K', skuPfx: 'GP001' },
        { name: '22K Gold Pendant — Crescent Moon',     cat: 'Pendants',  metal: 'Gold-22K', skuPfx: 'GP002' },
        { name: '21K Gold Bridal Set — Full 5pc',       cat: 'Sets',      metal: 'Gold-21K', skuPfx: 'GS001', stockCount: 2 },
        { name: '21K Gold Anklet Pair',                 cat: 'Anklets',   metal: 'Gold-21K', skuPfx: 'GA001' },
        { name: '22K Gold Coin — 5 Tola Stamp',        cat: 'Coins',     metal: 'Gold-22K', skuPfx: 'GCN001', isJewellery: false, stockCount: 5 },
        { name: '24K Raw Gold Bar — 10g',               cat: 'Raw Gold Bars', metal: 'Gold-24K', skuPfx: 'RGB001', isJewellery: false, stockCount: 4 },
        { name: '24K Raw Gold Bar — 50g',               cat: 'Raw Gold Bars', metal: 'Gold-24K', skuPfx: 'RGB002', isJewellery: false, stockCount: 3 },
    ]

    // Silver jewellery
    const silverJewellery = [
        { name: '925 Silver Ring — Oxidised',        cat: 'Rings',       metal: 'Silver-925', skuPfx: 'SR001' },
        { name: '925 Silver Bracelet — Chain Link',  cat: 'Bracelets',   metal: 'Silver-925', skuPfx: 'SBR001' },
        { name: '925 Silver Necklace — Ball Chain',  cat: 'Necklaces',   metal: 'Silver-925', skuPfx: 'SN001' },
        { name: '999 Silver Bar — 100g',             cat: 'Silver Bars', metal: 'Silver-999', skuPfx: 'SB001', isJewellery: false, stockCount: 6 },
        { name: '999 Silver Bar — 500g',             cat: 'Silver Bars', metal: 'Silver-999', skuPfx: 'SB002', isJewellery: false, stockCount: 4 },
    ]

    // Stones (stored as products under Loose Stones / Precious Stones / Diamonds)
    const stoneProducts = [
        // Diamonds
        { name: 'Diamond — 0.25 ct Round',     cat: 'Diamonds',        metal: 'Gold-24K', skuPfx: 'DM001', isJewellery: false, stockCount: 10 },
        { name: 'Diamond — 0.50 ct Round',     cat: 'Diamonds',        metal: 'Gold-24K', skuPfx: 'DM002', isJewellery: false, stockCount: 8 },
        { name: 'Diamond — 1.00 ct Princess',  cat: 'Diamonds',        metal: 'Gold-24K', skuPfx: 'DM003', isJewellery: false, stockCount: 5 },
        { name: 'Diamond — 2.00 ct Oval',      cat: 'Diamonds',        metal: 'Gold-24K', skuPfx: 'DM004', isJewellery: false, stockCount: 3 },
        // Rubies
        { name: 'Ruby — 3 Ratti (Burmese)',    cat: 'Precious Stones', metal: 'Gold-24K', skuPfx: 'RB001', isJewellery: false, stockCount: 12 },
        { name: 'Ruby — 5 Ratti (Ceylon)',     cat: 'Precious Stones', metal: 'Gold-24K', skuPfx: 'RB002', isJewellery: false, stockCount: 8 },
        { name: 'Ruby — 8 Ratti Premium',      cat: 'Precious Stones', metal: 'Gold-24K', skuPfx: 'RB003', isJewellery: false, stockCount: 5 },
        // Emeralds
        { name: 'Emerald — 2 Ratti (Zambian)', cat: 'Precious Stones', metal: 'Gold-24K', skuPfx: 'EM001', isJewellery: false, stockCount: 10 },
        { name: 'Emerald — 4 Ratti (Panjshir)',cat: 'Precious Stones', metal: 'Gold-24K', skuPfx: 'EM002', isJewellery: false, stockCount: 6 },
        // Sapphires
        { name: 'Blue Sapphire — 3 Ratti',    cat: 'Precious Stones', metal: 'Gold-24K', skuPfx: 'BS001', isJewellery: false, stockCount: 8 },
        { name: 'Yellow Sapphire — 4 Ratti',  cat: 'Precious Stones', metal: 'Gold-24K', skuPfx: 'YS001', isJewellery: false, stockCount: 7 },
        // Pearls
        { name: 'Pearl — Large Natural',       cat: 'Loose Stones',    metal: 'Gold-24K', skuPfx: 'PL001', isJewellery: false, stockCount: 15 },
        { name: 'Pearl — Medium Cultured',     cat: 'Loose Stones',    metal: 'Gold-24K', skuPfx: 'PL002', isJewellery: false, stockCount: 20 },
        // Others
        { name: 'Coral — 5 Ratti Red',         cat: 'Loose Stones',    metal: 'Gold-24K', skuPfx: 'CR001', isJewellery: false, stockCount: 10 },
        { name: 'Topaz — Blue 6 Ratti',        cat: 'Loose Stones',    metal: 'Gold-24K', skuPfx: 'TP001', isJewellery: false, stockCount: 8 },
        { name: 'Turquoise — 4 Ratti',         cat: 'Loose Stones',    metal: 'Gold-24K', skuPfx: 'TQ001', isJewellery: false, stockCount: 6 },
    ]

    let totalStockItems = 0
    for (const p of [...goldJewellery, ...silverJewellery, ...stoneProducts]) {
        const result = await makeProduct(p)
        if (result) totalStockItems += result.items.length
    }
    console.log(`✅  Products created, ${totalStockItems} inventory items`)

    // ── 10. Sample invoices ──────────────────────────────────────────────────
    console.log('\n🧾  Creating sample invoices...')

    const goldRatePerGram = (BASE_GOLD_TOLA / TOLA_TO_GRAM)

    // Helper: calculate totals for an invoice line
    function calcLine(goldWt, carat, ratePerGram, stoneAmt = 0) {
        const purity = carat / 24
        const adjWt  = parseFloat((goldWt * purity).toFixed(4))
        const goldAmt = parseFloat((adjWt * ratePerGram).toFixed(2))
        const total   = goldAmt + stoneAmt
        return { adjWt, goldAmt, stoneAmt, total, grossWt: goldWt }
    }

    // 5 SALE invoices
    const saleInvoices = [
        {
            partyName: 'Royal Jewellers Clifton', partyId: partyMap.get('Royal Jewellers Clifton'),
            date: daysAgo(25), status: 'FINALIZED',
            items: [
                { desc: '21K Gold Ring × 2',    cat: 'Rings',     pieces: 2, carat: 21, goldWt: 8.5,  stoneAmt: 0 },
                { desc: '21K Gold Earring Pair', cat: 'Earrings',  pieces: 2, carat: 21, goldWt: 5.2,  stoneAmt: 3500 },
            ],
        },
        {
            partyName: 'Zain Jewels DHA', partyId: partyMap.get('Zain Jewels DHA'),
            date: daysAgo(18), status: 'FINALIZED',
            items: [
                { desc: '22K Gold Chain Franco', cat: 'Chains',    pieces: 1, carat: 22, goldWt: 18.0, stoneAmt: 0 },
                { desc: '22K Gold Bracelet',     cat: 'Bracelets', pieces: 1, carat: 22, goldWt: 12.5, stoneAmt: 0 },
                { desc: '22K Gold Ring Gents',   cat: 'Rings',     pieces: 1, carat: 22, goldWt: 7.8,  stoneAmt: 8000 },
            ],
        },
        {
            partyName: 'Fatima Traders', partyId: partyMap.get('Fatima Traders'),
            date: daysAgo(10), status: 'FINALIZED',
            items: [
                { desc: '21K Bridal Full Set',   cat: 'Sets',      pieces: 1, carat: 21, goldWt: 95.0, stoneAmt: 45000 },
            ],
        },
        {
            partyName: 'Gold Palace Lahore', partyId: partyMap.get('Gold Palace Lahore'),
            date: daysAgo(5), status: 'DRAFT',
            items: [
                { desc: '21K Gold Bangles × 4',  cat: 'Bangles',   pieces: 4, carat: 21, goldWt: 28.0, stoneAmt: 0 },
                { desc: '21K Gold Necklace',      cat: 'Necklaces', pieces: 1, carat: 21, goldWt: 35.0, stoneAmt: 12000 },
            ],
        },
        {
            partyName: 'Muhammad Brothers', partyId: partyMap.get('Muhammad Brothers'),
            date: daysAgo(2), status: 'DRAFT',
            items: [
                { desc: '22K Gold Pendant × 3',  cat: 'Pendants',  pieces: 3, carat: 22, goldWt: 7.5,  stoneAmt: 5500 },
            ],
        },
    ]

    // 5 PURCHASE invoices
    const purchaseInvoices = [
        {
            partyName: 'Ahmed Bullion & Co.', partyId: partyMap.get('Ahmed Bullion & Co.'),
            date: daysAgo(28), status: 'FINALIZED', isBulk: true,
            items: [
                { desc: 'Bulk 21K Gold Purchase — Batch A', cat: 'Raw Gold Bars', pieces: 1, carat: 21, goldWt: 500.0, stoneAmt: 0 },
            ],
        },
        {
            partyName: 'Karachi Gold Traders', partyId: partyMap.get('Karachi Gold Traders'),
            date: daysAgo(20), status: 'FINALIZED',
            items: [
                { desc: 'Raw 24K Gold Bar × 5',  cat: 'Raw Gold Bars', pieces: 5, carat: 24, goldWt: 250.0, stoneAmt: 0 },
            ],
        },
        {
            partyName: 'Diamond Hub International', partyId: partyMap.get('Diamond Hub International'),
            date: daysAgo(14), status: 'FINALIZED',
            items: [
                { desc: 'Ruby 3 Ratti × 20',     cat: 'Precious Stones', pieces: 20, carat: 24, goldWt: 0.1,  stoneAmt: 180000 },
                { desc: 'Emerald 2 Ratti × 15',  cat: 'Precious Stones', pieces: 15, carat: 24, goldWt: 0.1,  stoneAmt: 135000 },
                { desc: 'Pearl Large × 30',       cat: 'Loose Stones',    pieces: 30, carat: 24, goldWt: 0.1,  stoneAmt: 60000 },
            ],
        },
        {
            partyName: 'Lahore Gold Bazaar', partyId: partyMap.get('Lahore Gold Bazaar'),
            date: daysAgo(7), status: 'DRAFT',
            items: [
                { desc: 'Bulk 22K Gold Purchase', cat: 'Raw Gold Bars', pieces: 1, carat: 22, goldWt: 300.0, stoneAmt: 0 },
            ],
        },
        {
            partyName: 'Malik Gems & Stones', partyId: partyMap.get('Malik Gems & Stones'),
            date: daysAgo(3), status: 'DRAFT',
            items: [
                { desc: 'Diamond 0.50ct × 10',   cat: 'Diamonds',        pieces: 10, carat: 24, goldWt: 0.1, stoneAmt: 500000 },
                { desc: 'Blue Sapphire 3 Ratti × 12', cat: 'Precious Stones', pieces: 12, carat: 24, goldWt: 0.1, stoneAmt: 96000 },
            ],
        },
    ]

    async function createInvoice(inv, txType) {
        let totalGoldWeight = 0
        let totalAmount = 0
        const itemsData = []

        for (const it of inv.items) {
            const catId = catMap.get(it.cat)
            const c = calcLine(it.goldWt, it.carat, goldRatePerGram, it.stoneAmt)
            totalGoldWeight += parseFloat(it.goldWt)
            totalAmount += c.total
            itemsData.push({
                categoryId:          catId,
                description:         it.desc,
                pieces:              it.pieces,
                carat:               it.carat,
                estimatedGoldWeight: it.goldWt.toFixed(4),
                adjustedGoldWeight:  c.adjWt.toFixed(4),
                estimatedGrossWeight: it.goldWt.toFixed(4),
                goldAmount:          c.goldAmt.toFixed(2),
                stoneAmount:         c.stoneAmt.toFixed(2),
                stoneWeight:         it.stoneAmt > 0 ? rd(0.5, 3) : '0.0000',
                polishAmount:        '0.00',
                labourAmount:        '0.00',
                totalAmount:         c.total.toFixed(2),
                isBulkPurchase:      !!(inv.isBulk),
            })
        }

        const cashRec = inv.status === 'FINALIZED' ? (totalAmount * rd(0.5, 1)).toFixed(2) : '0.00'
        const balance = (totalAmount - parseFloat(cashRec)).toFixed(2)

        const invoice = await prisma.invoice.create({
            data: {
                orgId:           org.id,
                date:            inv.date,
                status:          inv.status,
                transactionType: txType,
                partyId:         inv.partyId,
                partyName:       inv.partyName,
                goldRate:        (BASE_GOLD_TOLA).toFixed(2),
                totalGoldWeight: totalGoldWeight.toFixed(4),
                totalAmount:     totalAmount.toFixed(2),
                cashReceived:    cashRec,
                balance,
                receiptNo:       `${txType === 'SALE' ? 'SI' : 'PI'}-${ri(1000, 9999)}`,
                items:           { create: itemsData },
            },
        })

        // Payment for finalized invoices with outstanding balance
        if (inv.status === 'FINALIZED' && parseFloat(balance) > 0 && inv.partyId) {
            const payment = await prisma.payment.create({
                data: {
                    orgId:           org.id,
                    partyId:         inv.partyId,
                    invoiceId:       invoice.id,
                    category:        txType === 'SALE' ? 'RECEIVABLE' : 'PAYABLE',
                    status:          parseFloat(cashRec) > 0 ? 'PARTIAL' : 'PENDING',
                    totalAmount:     totalAmount.toFixed(2),
                    paidAmount:      cashRec,
                    remainingAmount: balance,
                    invoiceDate:     inv.date,
                    dueDate:         new Date(inv.date.getTime() + 30 * 86_400_000),
                },
            })

            if (parseFloat(cashRec) > 0) {
                await prisma.paymentTransaction.create({
                    data: {
                        paymentId: payment.id,
                        amount:    cashRec,
                        mode:      'CASH',
                        date:      inv.date,
                        notes:     'Initial payment on invoice',
                    },
                })
            }

            // Ledger entry for the party
            await prisma.ledgerEntry.create({
                data: {
                    orgId:     org.id,
                    partyId:   inv.partyId,
                    invoiceId: invoice.id,
                    type:      txType === 'SALE' ? 'DEBIT' : 'CREDIT',
                    amount:    totalAmount.toFixed(2),
                    balance:   balance,
                    narration: `${txType === 'SALE' ? 'Sale' : 'Purchase'} Invoice ${invoice.receiptNo}`,
                    date:      inv.date,
                },
            })
        }

        return invoice
    }

    let invoiceCount = 0
    for (const inv of saleInvoices) {
        await createInvoice(inv, 'SALE')
        invoiceCount++
    }
    for (const inv of purchaseInvoices) {
        await createInvoice(inv, 'PURCHASE')
        invoiceCount++
    }
    console.log(`🧾  ${invoiceCount} invoices with items, payments, and ledger entries`)

    // ── 11. Customer orders ──────────────────────────────────────────────────
    console.log('\n📋  Creating customer orders...')
    const orderData = [
        {
            party: 'Royal Jewellers Clifton', karigar: 'Al-Noor Jewel House',
            status: 'PENDING', dueIn: 15,
            items: [
                { desc: 'Custom 21K Ring with Ruby',   cat: 'Rings',   metal: 'Gold-21K', qty: 2, wt: 9.0,  rate: goldRatePerGram * 0.875 },
                { desc: 'Matching Earrings',           cat: 'Earrings',metal: 'Gold-21K', qty: 1, wt: 5.5,  rate: goldRatePerGram * 0.875 },
            ],
        },
        {
            party: 'Fatima Traders', karigar: 'Hassan & Sons Jewellers',
            status: 'PENDING', dueIn: 20,
            items: [
                { desc: 'Bridal Necklace 21K Kundan',  cat: 'Necklaces', metal: 'Gold-21K', qty: 1, wt: 65.0, rate: goldRatePerGram * 0.875 },
                { desc: '21K Bangles Set ×4',          cat: 'Bangles',   metal: 'Gold-21K', qty: 4, wt: 48.0, rate: goldRatePerGram * 0.875 },
            ],
        },
        {
            party: 'Gold Palace Lahore', karigar: 'City Gold Traders',
            status: 'COMPLETED', dueIn: -5,
            items: [
                { desc: '22K Gold Chain 24 inch',      cat: 'Chains',  metal: 'Gold-22K', qty: 1, wt: 22.0, rate: goldRatePerGram * 0.9167 },
            ],
        },
        {
            party: 'Zain Jewels DHA', karigar: 'Pak Jewel House',
            status: 'PENDING', dueIn: 10,
            items: [
                { desc: 'Gents 22K Ring with Sapphire',cat: 'Rings',   metal: 'Gold-22K', qty: 1, wt: 8.5,  rate: goldRatePerGram * 0.9167 },
            ],
        },
        {
            party: 'Muhammad Brothers', karigar: 'Al-Noor Jewel House',
            status: 'PENDING', dueIn: 25,
            items: [
                { desc: '21K Gold Anklet Pair',        cat: 'Anklets', metal: 'Gold-21K', qty: 2, wt: 14.0, rate: goldRatePerGram * 0.875 },
                { desc: '21K Pendant with Emerald',    cat: 'Pendants',metal: 'Gold-21K', qty: 1, wt: 4.5,  rate: goldRatePerGram * 0.875 },
            ],
        },
    ]

    for (const od of orderData) {
        const partyId  = partyMap.get(od.party)
        const karigarId = partyMap.get(od.karigar)
        if (!partyId) continue

        let totalAmt = 0
        const orderItems = od.items.map(it => {
            const catId   = catMap.get(it.cat)
            const metalId = metalMap.get(it.metal)
            const lineAmt = parseFloat((it.wt * it.rate).toFixed(2))
            totalAmt += lineAmt
            return {
                description: it.desc,
                categoryId:  catId,
                metalTypeId: metalId,
                quantity:    it.qty,
                weight:      it.wt.toFixed(4),
                rate:        it.rate.toFixed(2),
                totalAmount: lineAmt.toFixed(2),
            }
        })

        await prisma.customerOrder.create({
            data: {
                orgId:       org.id,
                partyId,
                karigarId,
                status:      od.status,
                date:        daysAgo(5),
                dueDate:     daysAgo(-od.dueIn),
                totalAmount: totalAmt.toFixed(2),
                notes:       `Order for ${od.party}`,
                items:       { create: orderItems },
            },
        })
    }
    console.log(`📋  ${orderData.length} customer orders`)

    // ── Done ─────────────────────────────────────────────────────────────────
    console.log('\n✅  Seed complete!\n')
    console.log('  Summary:')
    console.log(`   • 1 organization  (Akhtar Jewellers)`)
    console.log(`   • 1 admin user`)
    console.log(`   • ${METALS.length} metal types`)
    console.log(`   • ${CATEGORIES.length} categories  (incl. Diamonds, Precious Stones, Loose Stones)`)
    console.log(`   • ${PARTIES.length} parties  (suppliers + customers)`)
    console.log(`   • 31 days gold rate history`)
    console.log(`   • ${goldJewellery.length + silverJewellery.length + stoneProducts.length} products  (gold jewellery + silver + ${stoneProducts.length} stone types)`)
    console.log(`   • ~${totalStockItems} inventory items with stock movements`)
    console.log(`   • ${invoiceCount} invoices  (5 SALE + 5 PURCHASE) with payments & ledger`)
    console.log(`   • ${orderData.length} customer orders (karigar / job orders)`)
    console.log('\n  Login: admin@akhtarjewellers.pk')
    console.log('  ORG ID: org-default-001\n')
}

main()
    .catch(e => { console.error('\n❌ Seed failed:\n', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
