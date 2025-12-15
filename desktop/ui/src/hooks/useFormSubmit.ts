import type { IPCClient } from "../lib/ipc";
import type { FormSubmitOptions } from "../types/forms";
import { useIPC } from "./useIPC";

export function useFormSubmit<T>(options: FormSubmitOptions<T>) {
	const ipc = useIPC();

	const submit = async (
		data: unknown,
		action: (client: IPCClient, validated: T) => Promise<void>,
	) => {
		try {
			const parsed = options.schema.safeParse(data);
			if (!parsed.success) {
				console.error("Validation failed:", parsed.error);
				options.onError?.(new Error("Validation failed"));
				return;
			}

			await action(ipc.client, parsed.data);
			await ipc.client.commit();

			options.onSuccess?.();
		} catch (error) {
			options.onError?.(error as Error);
			console.error("Submit failed:", error);
		}
	};

	return { submit };
}
