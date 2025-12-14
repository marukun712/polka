import { createSignal } from "solid-js";
import { useDialog } from "../../hooks/useDialog";
import { useFormSubmit } from "../../hooks/useFormSubmit";
import { type Profile, profileSchema } from "../../types";
import { Dialog } from "../ui/Dialog";

export default function ProfileEdit({ init }: { init: Profile }) {
	const [name, setName] = createSignal(init.name);
	const [description, setDescription] = createSignal(init.description);
	const [icon, setIcon] = createSignal(init.icon);
	const [banner, setBanner] = createSignal(init.banner ?? "");

	const dialog = useDialog();

	const { submit } = useFormSubmit({
		schema: profileSchema,
		onSuccess: () => {
			dialog.close();
			location.reload();
		},
	});

	const handleSave = async () => {
		const data = {
			name: name(),
			description: description(),
			icon: icon(),
			banner: banner() || undefined,
			followsCount: init.followsCount,
			updatedAt: new Date().toISOString(),
		};
		submit(data, async (daemon, validated) => {
			await daemon.update("polka.profile/self", JSON.stringify(validated));
		});
	};

	return (
		<>
			<details class="dropdown">
				<summary>Edit</summary>
				<ul>
					<li>
						<a href="#" onClick={dialog.open}>
							Edit
						</a>
					</li>
				</ul>
			</details>

			<Dialog
				ref={dialog.ref}
				title="Edit Profile"
				onClose={dialog.close}
				footer={
					<>
						<button class="secondary" onClick={dialog.close}>
							Cancel
						</button>
						<button onClick={handleSave}>Save</button>
					</>
				}
			>
				<input
					type="text"
					placeholder="Name"
					value={name()}
					onInput={(e) => setName(e.currentTarget.value)}
				/>
				<textarea
					placeholder="Description"
					value={description()}
					onInput={(e) => setDescription(e.currentTarget.value)}
					rows={3}
				/>
				<input
					type="url"
					placeholder="Icon URL"
					value={icon()}
					onInput={(e) => setIcon(e.currentTarget.value)}
				/>
				<input
					type="url"
					placeholder="Banner URL (optional)"
					value={banner()}
					onInput={(e) => setBanner(e.currentTarget.value)}
				/>
			</Dialog>
		</>
	);
}
