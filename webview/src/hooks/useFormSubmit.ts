import type { DaemonClient } from "../lib/daemon";
import type { FormSubmitOptions } from "../types/forms";
import { useDaemon } from "./useDaemon";

export function useFormSubmit<T>(options: FormSubmitOptions<T>) {
	const daemon = useDaemon();

	const submit = async (
		data: unknown,
		action: (daemon: DaemonClient, validated: T) => Promise<void>,
	) => {
		try {
			const parsed = options.schema.safeParse(data);
			if (!parsed.success) {
				console.error("Validation failed:", parsed.error);
				options.onError?.(new Error("Validation failed"));
				return;
			}

			await action(daemon, parsed.data);
			await daemon.commit();

			options.onSuccess?.();
		} catch (error) {
			options.onError?.(error as Error);
			console.error("Submit failed:", error);
		}
	};

	return { submit };
}
