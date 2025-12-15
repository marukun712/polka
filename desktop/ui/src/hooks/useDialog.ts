import { onCleanup } from "solid-js";

export function useDialog() {
	let dialogRef!: HTMLDialogElement;

	const open = () => {
		if (dialogRef) {
			dialogRef.showModal();
		}
	};

	const close = () => {
		if (dialogRef) {
			dialogRef.close();
		}
	};

	onCleanup(() => {
		if (dialogRef?.open) {
			dialogRef.close();
		}
	});

	return {
		ref: (el: HTMLDialogElement) => (dialogRef = el),
		open,
		close,
	};
}
