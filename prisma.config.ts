import { defineConfig } from "prisma/config";

// Load environment variables from .env file (Node v20.6.0+)
process.loadEnvFile();

export default defineConfig({
    // @ts-ignore
    earlyAccess: true,
    schema: "prisma/schema.prisma",
    datasource: {
        url: process.env.DATABASE_URL!,
    },
    migrations: {
        seed: "npx tsx prisma/seed.ts",
    },
});
