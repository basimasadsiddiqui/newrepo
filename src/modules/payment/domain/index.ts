// Payment module domain types mirror Prisma enums directly.
// Re-export them here so callers don't need to import from @prisma/client.
export { PaymentStatus, PaymentMode, PaymentCategory } from "@prisma/client";
