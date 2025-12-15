import { createSignal } from "solid-js";
import { useDialog } from "../../hooks/useDialog";
import { useFormSubmit } from "../../hooks/useFormSubmit";
import { useIPC } from "../../hooks/useIPC";
import { type Post, postDataSchema } from "../../types";
import { formatTags, parseTags } from "../../utils/formatting";
import { Dialog } from "../ui/Dialog";

export default function PostEdit({ post }: { post: Post }) {
	const ipc = useIPC();
	const [input, setInput] = createSignal(post.data.content);
	const [inputTag, setInputTag] = createSignal(formatTags(post.data.tags));

	const editDialog = useDialog();
	const deleteDialog = useDialog();

	const { submit: submitEdit } = useFormSubmit({
		schema: postDataSchema,
		onSuccess: () => {
			editDialog.close();
			location.reload();
		},
	});

	const handleSave = async () => {
		const data = {
			tags: parseTags(inputTag()),
			content: input(),
			updatedAt: new Date().toISOString(),
		};
		submitEdit(data, async (daemon, validated) => {
			await daemon.update(post.rpath, JSON.stringify(validated));
		});
	};

	const handleDelete = async () => {
		await ipc.client.delete(post.rpath);
		await ipc.client.commit();
		deleteDialog.close();
		location.reload();
	};

	return (
		<>
			<details class="dropdown">
				<summary>Edit</summary>
				<ul>
					<li>
						<a onClick={editDialog.open}>Edit</a>
					</li>
					<li>
						<a onClick={deleteDialog.open}>Delete</a>
					</li>
				</ul>
			</details>

			<Dialog
				ref={editDialog.ref}
				title="Edit post"
				onClose={editDialog.close}
				footer={
					<>
						<button class="secondary" onClick={editDialog.close}>
							Cancel
						</button>
						<button onClick={handleSave}>Save</button>
					</>
				}
			>
				<input
					type="text"
					placeholder="Tag"
					value={inputTag()}
					onInput={(e) => setInputTag(e.currentTarget.value)}
				/>
				<textarea
					placeholder="Content"
					value={input()}
					onInput={(e) => setInput(e.currentTarget.value)}
					rows={5}
				/>
			</Dialog>

			<Dialog
				ref={deleteDialog.ref}
				title="Delete post"
				onClose={deleteDialog.close}
				footer={
					<>
						<button class="secondary" onClick={deleteDialog.close}>
							Cancel
						</button>
						<button class="contrast" onClick={handleDelete}>
							Delete
						</button>
					</>
				}
			>
				<p>この投稿を削除してもよろしいですか？</p>
			</Dialog>
		</>
	);
}
