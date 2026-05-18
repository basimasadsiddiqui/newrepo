import { Prisma } from "@prisma/client";

/**
 * Recursively converts Prisma Decimal objects to plain JavaScript numbers.
 * Required when passing data from Next.js Server Components / Actions
 * to Client Components, as Next.js cannot serialize the Decimal prototype.
 */
export function serializeDecimal(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== "object") return obj;

    if (Prisma.Decimal.isDecimal(obj)) {
        return obj.toNumber();
    }

    if (obj instanceof Date) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeDecimal);
    }

    const serialized: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            serialized[key] = serializeDecimal(obj[key]);
        }
    }
    return serialized;
}
