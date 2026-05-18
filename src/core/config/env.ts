/**
 * Centralized environment configuration.
 * All env variable access should go through this module.
 */

export const env = {
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    NODE_ENV: process.env.NODE_ENV ?? "development",
    SESSION_SECRET: process.env.SESSION_SECRET ?? "",
    isProduction: process.env.NODE_ENV === "production",
    isDevelopment: process.env.NODE_ENV === "development",
} as const;
