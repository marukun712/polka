import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";

interface PostComposerProps {
	onSubmit: (text: string, tags: string[]) => Promise<void>;
}

export const PostComposer: Component<PostComposerProps> = (props) => {
	const [text, setText] = createSignal("");
	const [tagInput, setTagInput] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal("");

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!text().trim()) {
			setError("投稿内容を入力してください");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// タグをカンマで分割してトリム
			const tags = tagInput()
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t.length > 0);

			await props.onSubmit(text(), tags);

			// 成功したらフォームをクリア
			setText("");
			setTagInput("");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
			<form onSubmit={handleSubmit}>
				<div class="mb-4">
					<label
						for="post-text"
						class="block text-sm font-medium text-gray-700 mb-2"
					>
						投稿内容
					</label>
					<textarea
						id="post-text"
						value={text()}
						onInput={(e) => setText(e.currentTarget.value)}
						placeholder="今何してる？"
						rows={3}
						disabled={loading()}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
					/>
				</div>

				<div class="mb-4">
					<label
						for="post-tags"
						class="block text-sm font-medium text-gray-700 mb-2"
					>
						タグ(カンマ区切り)
					</label>
					<input
						id="post-tags"
						type="text"
						value={tagInput()}
						onInput={(e) => setTagInput(e.currentTarget.value)}
						placeholder="例: テクノロジー, 日常"
						disabled={loading()}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
					/>
				</div>

				<Show when={error()}>
					<div class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
						<p class="text-red-800 text-sm">{error()}</p>
					</div>
				</Show>

				<div class="flex justify-end">
					<button
						type="submit"
						disabled={loading() || !text().trim()}
						class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{loading() ? "投稿中..." : "投稿"}
					</button>
				</div>
			</form>
		</div>
	);
};
