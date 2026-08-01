import { defineConfig } from "prisma/config";

// Load environment variables from .env file (Node v20.6.0+).
// Optional: hosted builds (Vercel, CI) inject env vars directly into the
// process and ship no .env file, where loadEnvFile() throws ENOENT.
try {
    process.loadEnvFile();
} catch {
    // No .env on disk - rely on the ambient environment.
}

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
