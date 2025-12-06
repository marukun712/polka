import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";
import { polkaIPC } from "../../lib/ipc";

interface ProfileStepProps {
	onComplete: (profile: {
		name: string;
		description: string;
		icon: string;
	}) => void;
}

export const ProfileStep: Component<ProfileStepProps> = (props) => {
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [icon, setIcon] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal("");
	const [imageError, setImageError] = createSignal(false);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const profileData = {
				name: name(),
				description: description(),
				icon: icon(),
			};

			// プロフィールレコードを作成
			const createResult = await polkaIPC.repo.createRecord(
				"polka.profile/self",
				JSON.stringify(profileData),
			);

			if (!createResult.success) {
				throw new Error(
					createResult.error || "Failed to create profile record",
				);
			}

			// Git commit & push
			const commitResult = await polkaIPC.git.commitAndPush();

			if (!commitResult.success) {
				throw new Error(commitResult.error || "Failed to commit and push");
			}

			// localStorageにセットアップ完了フラグを保存
			localStorage.setItem("setupCompleted", "true");

			props.onComplete(profileData);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div class="w-full max-w-md mx-auto">
			<div class="bg-white rounded-2xl shadow-lg p-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-2">
					プロフィールの設定
				</h2>
				<p class="text-gray-600 mb-6">
					あなたのプロフィール情報を入力してください
				</p>

				<form onSubmit={handleSubmit} class="space-y-6">
					<div>
						<label
							for="name"
							class="block text-sm font-medium text-gray-700 mb-2"
						>
							名前
						</label>
						<input
							id="name"
							type="text"
							value={name()}
							onInput={(e) => setName(e.currentTarget.value)}
							placeholder="名前"
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label
							for="description"
							class="block text-sm font-medium text-gray-700 mb-2"
						>
							説明
						</label>
						<textarea
							id="description"
							value={description()}
							onInput={(e) => setDescription(e.currentTarget.value)}
							placeholder="自己紹介を入力してください"
							required
							rows={3}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label
							for="icon"
							class="block text-sm font-medium text-gray-700 mb-2"
						>
							アイコンURL
						</label>
						<input
							id="icon"
							type="url"
							value={icon()}
							onInput={(e) => {
								setIcon(e.currentTarget.value);
								setImageError(false);
							}}
							placeholder="アイコンURL"
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>

						<Show when={icon() && !imageError()}>
							<div class="mt-4">
								<p class="text-sm text-gray-600 mb-2">プレビュー:</p>
								<img
									src={icon()}
									alt="Icon preview"
									onError={() => setImageError(true)}
									class="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
								/>
							</div>
						</Show>

						<Show when={imageError()}>
							<p class="text-sm text-red-600 mt-2">
								画像を読み込めませんでした。URLを確認してください。
							</p>
						</Show>
					</div>

					<Show when={error()}>
						<div class="bg-red-50 border border-red-200 rounded-lg p-3">
							<p class="text-red-800 text-sm">{error()}</p>
						</div>
					</Show>

					<button
						type="submit"
						disabled={loading() || !name() || !description() || !icon()}
						class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{loading() ? "保存中..." : "完了"}
					</button>
				</form>
			</div>
		</div>
	);
};
