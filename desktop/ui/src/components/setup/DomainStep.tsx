import type { DIDDocument } from "did-resolver";
import { IoAlert } from "solid-icons/io";
import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";
import { generate } from "../../../lib/crypto";
import { generateDidDocument, resolve } from "../../../lib/identity";

interface DomainStepProps {
	onNext: (domain: string, didKey: string) => void;
}

export const DomainStep: Component<DomainStepProps> = (props) => {
	const [domain, setDomain] = createSignal("");
	const [didDocument, setDidDocument] = createSignal<DIDDocument | null>(null);
	const [secretKey, setSecretKey] = createSignal("");
	const [resolved, setResolved] = createSignal(false);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal("");

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	const handleCheckResolution = async (e: Event) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		try {
			const result = await resolve(domain());
			if (result.didKey) {
				setResolved(true);
				props.onNext(domain(), result.didKey);
			} else {
				setError(
					"DIDがまだ解決できません。ファイルをアップロードしてください。",
				);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	const handleGenerateKeys = async () => {
		setLoading(true);
		setError("");
		try {
			const result = await generate();
			setSecretKey(result.sk);
			// DIDドキュメント生成
			const docResult = await generateDidDocument(domain(), result.did);
			if (!docResult) {
				throw new Error("Failed to generate DID document");
			}
			setDidDocument(docResult);
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
					ドメインを入力してください
				</h2>
				<p class="text-gray-600 mb-6">
					あなたのDIDドメイン(例: example.com)を入力してください
				</p>

				<form onSubmit={handleCheckResolution}>
					<div class="mb-6">
						<label
							for="domain"
							class="block text-sm font-medium text-gray-700 mb-2"
						>
							ドメイン
						</label>
						<input
							id="domain"
							type="text"
							value={domain()}
							onInput={(e) => setDomain(e.currentTarget.value)}
							placeholder="example.com"
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<button
						type="submit"
						disabled={loading() || !domain().trim()}
						class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{loading() ? "確認中..." : "次へ"}
					</button>
				</form>

				<Show when={!resolved()}>
					<div>
						<p class="text-gray-600 mb-6">
							新しいDIDを生成します。以下の手順に従ってください。
						</p>

						<Show when={!secretKey()}>
							<button
								type="button"
								onClick={handleGenerateKeys}
								disabled={loading()}
								class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
							>
								{loading() ? "生成中..." : "鍵ペアを生成"}
							</button>
						</Show>

						<Show when={secretKey()}>
							<div class="space-y-6">
								<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<IoAlert />
									<h3 class="font-semibold text-yellow-900 mb-2">
										重要:秘密鍵を安全に保管してください
									</h3>
									<p class="text-yellow-800 text-sm">
										秘密鍵は二度と表示されません。必ずコピーして安全な場所に保管してください。
									</p>
								</div>

								<div>
									<h1 class="block text-sm font-medium text-gray-700 mb-2">
										秘密鍵(Secret Key)
									</h1>
									<div class="flex gap-2">
										<input
											type="text"
											value={secretKey()}
											readonly
											class="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
										/>
										<button
											type="button"
											onClick={() => copyToClipboard(secretKey())}
											class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
										>
											コピー
										</button>
									</div>
								</div>

								<div>
									<h1 class="block text-sm font-medium text-gray-700 mb-2">
										DIDドキュメント
									</h1>
									<p class="text-sm text-gray-600 mb-2">
										以下のJSONを{" "}
										<code class="bg-gray-100 px-1 rounded">
											https://{domain()}/.well-known/did.json
										</code>{" "}
										にアップロードしてください。
									</p>
									<div class="relative">
										<pre class="bg-gray-50 border border-gray-300 rounded-lg p-4 overflow-x-auto text-xs">
											{JSON.stringify(didDocument(), null, 2)}
										</pre>
										<button
											type="button"
											onClick={() =>
												didDocument() &&
												copyToClipboard(JSON.stringify(didDocument(), null, 2))
											}
											class="absolute top-2 right-2 px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
										>
											コピー
										</button>
									</div>
								</div>

								<div class="border-t pt-6">
									<p class="text-sm text-gray-600 mb-4">
										DIDドキュメントをアップロードしたら、以下のボタンで確認してください。
									</p>
									<Show when={error()}>
										<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
											<p class="text-red-800 text-sm">{error()}</p>
										</div>
									</Show>
									<button
										type="button"
										onClick={handleCheckResolution}
										disabled={loading()}
										class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
									>
										{loading() ? "確認中..." : "解決を確認"}
									</button>
								</div>
							</div>
						</Show>
					</div>
				</Show>
			</div>
		</div>
	);
};
