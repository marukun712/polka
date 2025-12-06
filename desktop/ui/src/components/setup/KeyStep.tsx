import type { Component } from "solid-js";
import { createSignal } from "solid-js";

interface KeyStepProps {
	onNext: (secretKey: string) => void;
}

export const KeyStep: Component<KeyStepProps> = (props) => {
	const [secretKey, setSecretKey] = createSignal("");

	function handleSubmit(e: Event) {
		e.preventDefault();
		props.onNext(secretKey());
	}

	return (
		<div class="w-full max-w-2xl mx-auto">
			<div class="bg-white rounded-2xl shadow-lg p-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-2">鍵の管理</h2>

				<div>
					<p class="text-gray-600 mb-6">秘密鍵を入力してください。</p>

					<form onSubmit={handleSubmit}>
						<div class="mb-6">
							<label
								for="sk"
								class="block text-sm font-medium text-gray-700 mb-2"
							>
								秘密鍵
							</label>
							<input
								id="sk"
								type="password"
								value={secretKey()}
								onInput={(e) => setSecretKey(e.currentTarget.value)}
								placeholder="秘密鍵を入力..."
								required
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<button
							type="submit"
							disabled={!secretKey().trim()}
							class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
						>
							次へ
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};
