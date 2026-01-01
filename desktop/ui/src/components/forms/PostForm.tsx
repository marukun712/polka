import { now } from "@atcute/tid";
import { createSignal, Show } from "solid-js";
import z from "zod";
import { useIPC } from "../../hooks/useIPC";
import { type PostData, postDataSchema } from "../../types";

export default function PostForm() {
	const [text, setText] = createSignal("");
	const [tag, setTag] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const ipc = useIPC();

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				setError(null);

				const rpath = `polka.post/${now()}`;
				const parents = tag()
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean);

				const data: PostData = {
					content: text(),
					parents,
					updatedAt: new Date().toISOString(),
				};

				const parsed = postDataSchema.safeParse(data);
				if (!parsed.success) {
					setError(z.treeifyError(parsed.error).errors.join(","));
					return;
				}

				await ipc.client.create(rpath, parsed.data);
				await ipc.client.commit();

				setText("");
				setTag("");
			}}
		>
			<label for="post-content">投稿内容</label>
			<textarea
				id="post-content"
				value={text()}
				placeholder="投稿内容を入力..."
				rows={6}
				onInput={(e) => setText(e.currentTarget.value)}
			/>
			<label for="post-tags">親タグ(カンマ区切り)</label>
			<input
				id="post-tags"
				type="text"
				value={tag()}
				placeholder="タグ1, タグ2"
				onInput={(e) => setTag(e.currentTarget.value)}
			/>
			<Show when={error()}>
				<p role="alert" style="color: red;">
					{error()}
				</p>
			</Show>
			<button type="submit">Post</button>
		</form>
	);
}
