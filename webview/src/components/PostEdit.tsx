import { createSignal, useContext } from "solid-js";
import { type Post, postDataSchema } from "../../@types/types";
import { daemonContext } from "..";

export default function PostEdit({ post }: { post: Post }) {
	const [input, setInput] = createSignal(post.data.content);
	const [inputTag, setInputTag] = createSignal(post.data.tags.join("/"));
	const daemon = useContext(daemonContext);

	let editDialog!: HTMLDialogElement;
	let deleteDialog!: HTMLDialogElement;

	const openEdit = () => editDialog.showModal();
	const closeEdit = () => editDialog.close();

	const openDelete = () => deleteDialog.showModal();
	const closeDelete = () => deleteDialog.close();

	const handleSave = async () => {
		if (!daemon) return;

		const data = {
			tags: inputTag().split("/"),
			content: input(),
			updatedAt: new Date().toISOString(),
		};

		const parsed = postDataSchema.safeParse(data);
		if (!parsed.success) {
			console.error("Failed to parse post data:", parsed.error);
			return;
		}

		await daemon.daemon.update(post.rpath, JSON.stringify(parsed.data));
		await daemon.daemon.commit();
		closeEdit();
	};

	const handleDelete = async () => {
		if (!daemon) return;
		await daemon.daemon.delete(post.rpath);
		await daemon.daemon.commit();
		closeDelete();
	};

	if (daemon)
		return (
			<>
				<details class="dropdown">
					<summary>Edit</summary>
					<ul>
						<li>
							<a href="#" onClick={openEdit}>
								Edit
							</a>
						</li>
						<li>
							<a href="#" onClick={openDelete}>
								Delete
							</a>
						</li>
					</ul>
				</details>

				<dialog ref={editDialog}>
					<article>
						<header>
							<button
								aria-label="Close"
								//@ts-expect-error
								rel="prev"
								onclick={closeEdit}
							></button>
							<p>
								<strong>Edit post</strong>
							</p>
						</header>

						<input
							type="text"
							placeholder="Text"
							value={input()}
							onInput={(e) => setInput(e.currentTarget.value)}
						/>

						<input
							type="text"
							placeholder="Tags"
							value={inputTag()}
							onInput={(e) => setInputTag(e.currentTarget.value)}
						/>

						<footer>
							<button class="secondary" onClick={closeEdit}>
								Cancel
							</button>
							<button onClick={handleSave}>Save</button>
						</footer>
					</article>
				</dialog>

				<dialog ref={deleteDialog}>
					<article>
						<header>
							<button
								aria-label="Close"
								//@ts-expect-error
								rel="prev"
								onclick={closeDelete}
							></button>
							<p>
								<strong>Delete post?</strong>
							</p>
						</header>

						<p>Are you sure you want to delete this post?</p>

						<footer>
							<button class="secondary" onClick={closeDelete}>
								Cancel
							</button>
							<button onClick={handleDelete} class="contrast">
								Delete
							</button>
						</footer>
					</article>
				</dialog>
			</>
		);
}
