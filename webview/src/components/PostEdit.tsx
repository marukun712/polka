import { createSignal } from "solid-js";

export default function PostEdit({
	tag,
	text,
	onUpdate,
	onDelete,
}: {
	tag: string[];
	text: string;
	onUpdate: (tag: string[], text: string) => void;
	onDelete: () => void;
}) {
	const [input, setInput] = createSignal(text);
	const [inputTag, setInputTag] = createSignal(tag.join("/"));

	let editDialog!: HTMLDialogElement;
	let deleteDialog!: HTMLDialogElement;

	const openEdit = () => editDialog.showModal();
	const closeEdit = () => editDialog.close();

	const openDelete = () => deleteDialog.showModal();
	const closeDelete = () => deleteDialog.close();

	const handleSave = () => {
		onUpdate(inputTag().split("/"), input());
		closeEdit();
	};

	const handleDelete = () => {
		onDelete();
		closeDelete();
	};

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
						<button aria-label="Close" rel="prev" onclick={closeEdit}></button>
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
