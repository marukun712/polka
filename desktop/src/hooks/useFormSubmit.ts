import type { CliClient } from "../lib/cli";
import type { FormSubmitOptions } from "../types/forms";
import { useCli } from "./useCli";

export function useFormSubmit<T>(options: FormSubmitOptions<T>) {
	const cli = useCli();

	const submit = async (
		data: unknown,
		action: (client: CliClient, validated: T) => Promise<void>,
	) => {
		try {
			const parsed = options.schema.safeParse(data);
			if (!parsed.success) {
				console.error("Validation failed:", parsed.error);
				options.onError?.(new Error("Validation failed"));
				return;
			}

			await action(cli.client, parsed.data);
			await cli.client.commit();

			options.onSuccess?.();
		} catch (error) {
			options.onError?.(error as Error);
			console.error("Submit failed:", error);
		}
	};

	return { submit };
}
