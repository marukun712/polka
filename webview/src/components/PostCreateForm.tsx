import type { Component } from "solid-js";
import { createSignal } from "solid-js";

interface PostCreateFormProps {
	onSubmit: (content: string) => Promise<void>;
}

export const PostCreateForm: Component<PostCreateFormProps> = (props) => {
	const [content, setContent] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);

	const handleSubmit = async (e: Event): Promise<void> => {
		e.preventDefault();
		const text = content().trim();
		if (!text) return;

		setIsSubmitting(true);
		try {
			await props.onSubmit(text);
			setContent("");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div class="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
			<form onSubmit={handleSubmit}>
				<textarea
					value={content()}
					onInput={(e) => setContent(e.currentTarget.value)}
					placeholder="ポストを入力..."
					class="w-full min-h-20 p-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
					disabled={isSubmitting()}
				/>
				<div class="flex justify-end mt-3">
					<button
						type="submit"
						disabled={!content().trim() || isSubmitting()}
						class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
					>
						{isSubmitting() ? "投稿中..." : "投稿"}
					</button>
				</div>
			</form>
		</div>
	);
};
