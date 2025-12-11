import type { Component } from "solid-js";
import { Show } from "solid-js";

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmDialog: Component<ConfirmDialogProps> = (props) => {
	return (
		<Show when={props.isOpen}>
			<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
					<h3 class="text-lg font-semibold mb-2">{props.title}</h3>
					<p class="text-gray-600 mb-6">{props.message}</p>
					<div class="flex justify-end gap-3">
						<button
							type="button"
							onClick={props.onCancel}
							class="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
						>
							キャンセル
						</button>
						<button
							type="button"
							onClick={props.onConfirm}
							class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						>
							削除
						</button>
					</div>
				</div>
			</div>
		</Show>
	);
};
