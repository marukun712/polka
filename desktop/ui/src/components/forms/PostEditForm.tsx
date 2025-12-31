import { useDialog } from "../../hooks/useDialog";
import { useIPC } from "../../hooks/useIPC";
import { type Post, type PostData, postDataSchema } from "../../types";
import { Dialog } from "../ui/Dialog";

export default function PostEdit({ post }: { post: Post }) {
	const ipc = useIPC();

	const editDialog = useDialog();
	const deleteDialog = useDialog();

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

			<Dialog ref={editDialog.ref} title="Edit post" onClose={editDialog.close}>
				<form
					onSubmit={async (e) => {
						e.preventDefault();

						const formData = new FormData(e.currentTarget);
						const tags = formData.get("tags") as string;
						const parents = tags
							.split(",")
							.map((t) => t.trim())
							.filter(Boolean);

						const data: PostData = {
							parents,
							content: formData.get("content") as string,
							updatedAt: new Date().toISOString(),
						};

						const parsed = postDataSchema.safeParse(data);
						if (!parsed.success) {
							console.error("Failed to parse post:", parsed.error);
							return;
						}

						await ipc.client.update(post.rpath, parsed.data);
						await ipc.client.commit();

						editDialog.close();
						location.reload();
					}}
				>
					<input
						type="text"
						name="tags"
						placeholder="Tag"
						value={post.data.parents.join(", ")}
					/>
					<textarea
						name="content"
						placeholder="Content"
						value={post.data.content}
						rows={5}
					/>
					<div class="dialog-footer">
						<button type="button" class="secondary" onClick={editDialog.close}>
							Cancel
						</button>
						<button type="submit">Save</button>
					</div>
				</form>
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
						<button
							class="contrast"
							onClick={async () => {
								await ipc.client.delete(post.rpath);
								await ipc.client.commit();
								deleteDialog.close();
								location.reload();
							}}
						>
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
