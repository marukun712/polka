import { now } from "@atcute/tid";
import { createSignal } from "solid-js";
import { type PostData, postDataSchema } from "../../@types/types";

export default function PostForm({
	onSubmit,
}: {
	onSubmit: (post: PostData, rpath: string) => void;
}) {
	const [text, setText] = createSignal("");
	const [tag, setTag] = createSignal("");

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();

				const rpath = `polka.post/${now()}`;
				const tags = tag().split("/");

				const data: PostData = {
					content: text(),
					updatedAt: new Date().toISOString(),
				};

				if (tags.length > 0) {
					data.tags = tags;
				}

				const parsed = postDataSchema.safeParse(data);
				if (!parsed.success) {
					console.error("Failed to parse post:", parsed.error);
					return;
				}

				onSubmit(parsed.data, rpath);
				setText("");
				setTag("");
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
				value={tag()}
				placeholder="Enter your tags..."
				onInput={(e) => setTag(e.currentTarget.value)}
			/>
			<button type="submit">Post</button>
		</form>
	);
}
