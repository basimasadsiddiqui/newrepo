const { PrismaClient } = require('@prisma/client')

if (process.loadEnvFile) {
    try {
        process.loadEnvFile()
        console.log('✅ Loaded env file')
    } catch (e) {
        console.log('⚠️ Could not load env file:', e.message)
    }
}

const prisma = new PrismaClient()

async function main() {
    console.log('Testing connection...')
    try {
        const count = await prisma.user.count()
        console.log('Connection successful. User count:', count)
    } catch (e) {
        console.error('Connection failed:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
