import { createSignal, useContext } from "solid-js";
import type { Profile } from "../../@types/types";
import { daemonContext } from "..";

export default function ProfileEdit({ init }: { init: Profile }) {
	const [profile, setProfile] = createSignal(init);
	const daemon = useContext(daemonContext);

	let editDialog!: HTMLDialogElement;

	const openEdit = () => editDialog.showModal();
	const closeEdit = () => editDialog.close();

	const handleSave = async () => {
		if (!daemon) return;
		await daemon.daemon.update("polka.profile/self", JSON.stringify(profile()));
		await daemon.daemon.commit();
		closeEdit();
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
						placeholder="name"
						value={profile().name}
						onInput={(e) =>
							setProfile({ ...profile(), name: e.currentTarget.value })
						}
					/>

					<input
						type="text"
						placeholder="description"
						value={profile().description}
						onInput={(e) =>
							setProfile({ ...profile(), description: e.currentTarget.value })
						}
					/>

					<input
						type="text"
						placeholder="icon"
						value={profile().icon}
						onInput={(e) =>
							setProfile({ ...profile(), icon: e.currentTarget.value })
						}
					/>

					<input
						type="text"
						placeholder="banner"
						value={profile().banner ?? ""}
						onInput={(e) =>
							setProfile({ ...profile(), banner: e.currentTarget.value })
						}
					/>

					<footer>
						<button class="secondary" onClick={closeEdit}>
							Cancel
						</button>
						<button onClick={handleSave}>Save</button>
					</footer>
				</article>
			</dialog>
		</>
	);
}
