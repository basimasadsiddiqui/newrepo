/**
 * Base application error class.
 * Extend this for domain-specific errors.
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500
    ) {
        super(message);
        this.name = "AppError";
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        super(
            id ? `${resource} with id '${id}' not found` : `${resource} not found`,
            "NOT_FOUND",
            404
        );
        this.name = "NotFoundError";
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, "VALIDATION_ERROR", 400);
        this.name = "ValidationError";
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(message, "UNAUTHORIZED", 401);
        this.name = "UnauthorizedError";
    }
}

/**
 * Convert any caught error into a safe API error response object.
 */
export function toApiError(error: unknown): { error: string; statusCode: number } {
    if (error instanceof AppError) {
        return { error: error.message, statusCode: error.statusCode };
    }
    if (error instanceof Error) {
        return { error: error.message, statusCode: 500 };
    }
    return { error: "An unexpected error occurred", statusCode: 500 };
}
