import { now } from "@atcute/tid";
import { createSignal } from "solid-js";
import { useIPC } from "../hooks/useIPC";
import { type PostData, postDataSchema } from "../types";

export default function PostForm() {
	const [text, setText] = createSignal("");
	const [tag, setTag] = createSignal("");
	const ipc = useIPC();

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();

				const rpath = `polka.post/${now()}`;
				const tags = tag().split("/");

				const data: PostData = {
					content: text(),
					tags,
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

				await ipc.client.create(rpath, parsed.data);
				await ipc.client.commit();

				setText("");
				setTag("");
			}}
		>
			<textarea
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
