import { createSignal } from "solid-js";
import type { DaemonClient } from "../lib/daemon";
import type { FormState, FormSubmitOptions } from "../types/forms";
import { useDaemon } from "./useDaemon";

export function useFormSubmit<T>(options: FormSubmitOptions<T>) {
	const daemon = useDaemon();
	const [state, setState] = createSignal<FormState>("idle");

	const submit = async (
		data: unknown,
		action: (daemon: DaemonClient, validated: T) => Promise<void>,
	) => {
		setState("submitting");

		try {
			const parsed = options.schema.safeParse(data);
			if (!parsed.success) {
				console.error("Validation failed:", parsed.error);
				setState("error");
				options.onError?.(new Error("Validation failed"));
				return;
			}

			await action(daemon, parsed.data);
			await daemon.commit();

			setState("success");
			options.onSuccess?.();

			setTimeout(() => setState("idle"), 1000);
		} catch (error) {
			setState("error");
			options.onError?.(error as Error);
			console.error("Submit failed:", error);

			setTimeout(() => setState("idle"), 2000);
		}
	};

	return { submit, state };
}
