import type { z } from "zod";

export type FormState = "idle" | "submitting" | "success" | "error";

export type FormSubmitOptions<T> = {
	schema: z.ZodSchema<T>;
	onSuccess?: () => void;
	onError?: (error: Error) => void;
};
