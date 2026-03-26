try {
    if (process.loadEnvFile) process.loadEnvFile()
    const { PrismaClient } = require('@prisma/client')

    console.log('--- Attempt 1: datasourceUrl ---')
    try {
        new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
        console.log('✅ SUCCESS')
    } catch (e) { console.log('❌ FAILED:', e.message) }

    console.log('--- Attempt 2: datasource ---')
    try {
        new PrismaClient({ datasource: { url: process.env.DATABASE_URL } })
        console.log('✅ SUCCESS')
    } catch (e) { console.log('❌ FAILED:', e.message) }

    console.log('--- Attempt 3: datasources ---')
    try {
        new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
        console.log('✅ SUCCESS')
    } catch (e) { console.log('❌ FAILED:', e.message) }

    console.log('--- Attempt 4: adapter (null) ---')
    try {
        new PrismaClient({ adapter: null }) // Just testing if checks for adapter
        console.log('✅ SUCCESS')
    } catch (e) { console.log('❌ FAILED:', e.message) }

} catch (e) {
    console.error('GLOBAL ERROR:', e)
}
