import { IoCheckmark } from "solid-icons/io";
import type { Component } from "solid-js";
import { createSignal, onMount, Show } from "solid-js";
import { polkaIPC } from "../../lib/ipc";

interface RepoInitStepProps {
	secretKey: string;
	didKey: string;
	onNext: () => void;
}

export const RepoInitStep: Component<RepoInitStepProps> = (props) => {
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal("");
	const [success, setSuccess] = createSignal(false);

	onMount(async () => {
		try {
			const result = await polkaIPC.repo.initRepo(
				props.secretKey,
				props.didKey,
			);

			if (!result.success) {
				throw new Error(result.error || "Failed to initialize repository");
			}

			setSuccess(true);

			setTimeout(() => {
				props.onNext();
			}, 1000);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	});

	return (
		<div class="w-full max-w-md mx-auto">
			<div class="bg-white rounded-2xl shadow-lg p-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-2">
					リポジトリの初期化
				</h2>

				<Show when={loading()}>
					<div class="text-center py-8">
						<div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
						<p class="text-gray-600">リポジトリを初期化中...</p>
					</div>
				</Show>

				<Show when={success()}>
					<div class="text-center py-8">
						<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<IoCheckmark />
						</div>
						<p class="text-green-600 font-medium">
							リポジトリの初期化が完了しました
						</p>
						<p class="text-gray-600 text-sm mt-2">
							プロフィール設定に進みます...
						</p>
					</div>
				</Show>

				<Show when={error()}>
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-red-800 text-sm mb-4">{error()}</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
						>
							リトライ
						</button>
					</div>
				</Show>
			</div>
		</div>
	);
};
