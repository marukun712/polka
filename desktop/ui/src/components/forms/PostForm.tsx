import { now } from "@atcute/tid";
import { createSignal, For, Show } from "solid-js";
import z from "zod";
import { useIPC } from "../../hooks/useIPC";
import { type PostData, postDataSchema } from "../../types";

export default function PostForm(props: { availableTags: string[] }) {
	const [text, setText] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const ipc = useIPC();

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				setError(null);

				const rpath = `polka.post/${now()}`;
				const formData = new FormData(e.currentTarget);
				const selectedTags = formData.getAll("tags") as string[];
				const parents = selectedTags.filter(Boolean);

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
				e.currentTarget.reset();
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
			<label for="post-tags">親タグ (Ctrl/Cmd+クリックで複数選択)</label>
			<select id="post-tags" multiple name="tags" size={5}>
				<For each={props.availableTags}>
					{(tag) => <option value={tag}>{tag}</option>}
				</For>
			</select>
			<Show when={error()}>
				<p role="alert" style="color: red;">
					{error()}
				</p>
			</Show>
			<button type="submit">Post</button>
		</form>
	);
}
