import { createSignal } from "solid-js";
import { type PostData, postDataSchema } from "../../@types/types";

export default function PostForm({
	onSubmit,
}: {
	onSubmit: (post: PostData) => void;
}) {
	const [text, setText] = createSignal("");
	const [links, setLinks] = createSignal<string[]>([]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				const data = JSON.stringify({ content: text(), links: links() });
				const parsed = postDataSchema.safeParse(JSON.parse(data));
				if (!parsed.success) {
					console.error("Failed to parse post:", parsed.error);
					return;
				}
				onSubmit(parsed.data);
				setText("");
				setLinks([]);
			}}
		>
			<input
				type="text"
				value={text()}
				placeholder="Enter your post..."
				onInput={(e) => setText(e.currentTarget.value)}
			/>
			<input
				type="text"
				value={links()}
				placeholder="Enter links separated by commas..."
				onInput={(e) => setLinks(e.currentTarget.value.split(","))}
			/>
			<button type="submit">Post</button>
		</form>
	);
}
