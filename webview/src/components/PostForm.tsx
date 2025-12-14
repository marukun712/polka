import { now } from "@atcute/tid";
import { createSignal, useContext } from "solid-js";
import { type PostData, postDataSchema } from "../../@types/types";
import { daemonContext } from "..";

export default function PostForm({
	tag,
	insertTag,
}: {
	tag: () => string;
	insertTag: (tag: string) => void;
}) {
	const [text, setText] = createSignal("");
	const daemon = useContext(daemonContext);

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				if (!daemon) return;

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

				await daemon.daemon.create(rpath, JSON.stringify(parsed.data));
				await daemon.daemon.commit();

				setText("");
				insertTag("");
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
				onInput={(e) => insertTag(e.currentTarget.value)}
			/>
			<button type="submit">Post</button>
		</form>
	);
}
