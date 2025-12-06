import type { Component } from "solid-js";
import { createSignal, onMount, Show } from "solid-js";
import { polkaIPC } from "../../lib/ipc";

interface GitStepProps {
	remoteUrl: string;
	onNext: (remoteUrl: string) => void;
}

export const GitStep: Component<GitStepProps> = (props) => {
	const [remoteUrl, setRemoteUrl] = createSignal(props.remoteUrl);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal("");
	const [repoExists, setRepoExists] = createSignal(false);
	const [checkingRepo, setCheckingRepo] = createSignal(true);

	onMount(async () => {
		// リポジトリの存在確認
		try {
			const result = await polkaIPC.git.checkRepoExists();
			if (result.success && result.data) {
				setRepoExists(result.data);
			}
		} catch (err) {
			console.error("Failed to check repo:", err);
		} finally {
			setCheckingRepo(false);
		}
	});

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			if (repoExists()) {
				// 既存リポジトリをpull
				const result = await polkaIPC.git.pullRepo();
				if (!result.success) {
					throw new Error(result.error || "Failed to pull repository");
				}
			} else {
				// 新規リポジトリをclone
				const result = await polkaIPC.git.cloneRepo(remoteUrl());
				if (!result.success) {
					throw new Error(result.error || "Failed to clone repository");
				}
			}

			props.onNext(remoteUrl());
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
					Gitリポジトリの設定
				</h2>

				<Show when={checkingRepo()}>
					<div class="text-center py-8">
						<div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
						<p class="text-gray-600">リポジトリを確認中...</p>
					</div>
				</Show>

				<Show when={!checkingRepo()}>
					<div>
						<Show when={repoExists()}>
							<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
								<p class="text-green-800 text-sm">
									ローカルリポジトリが見つかりました。最新の変更を取得します。
								</p>
							</div>
						</Show>

						<Show when={!repoExists()}>
							<p class="text-gray-600 mb-6">
								GitリポジトリのSSH
								URLを入力してください。リポジトリがクローンされます。
							</p>
						</Show>

						<form onSubmit={handleSubmit}>
							<div class="mb-6">
								<label
									for="remoteUrl"
									class="block text-sm font-medium text-gray-700 mb-2"
								>
									Git Remote SSH URL
								</label>
								<input
									id="remoteUrl"
									type="text"
									value={remoteUrl()}
									onInput={(e) => setRemoteUrl(e.currentTarget.value)}
									placeholder="git@github.com:user/repo.git"
									required
									disabled={repoExists()}
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
								/>
								<Show when={repoExists()}>
									<p class="text-sm text-gray-500 mt-1">
										既存のリポジトリを使用します
									</p>
								</Show>
							</div>

							<Show when={error()}>
								<div class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
									<p class="text-red-800 text-sm">{error()}</p>
								</div>
							</Show>

							<button
								type="submit"
								disabled={loading() || (!repoExists() && !remoteUrl().trim())}
								class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
							>
								{loading()
									? repoExists()
										? "更新中..."
										: "クローン中..."
									: repoExists()
										? "更新して次へ"
										: "クローンして次へ"}
							</button>
						</form>
					</div>
				</Show>
			</div>
		</div>
	);
};
