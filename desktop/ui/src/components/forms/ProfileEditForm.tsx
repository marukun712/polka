import { useDialog } from "../../hooks/useDialog";
import { useIPC } from "../../hooks/useIPC";
import { type Profile, profileSchema } from "../../types";
import { Dialog } from "../ui/Dialog";

export default function ProfileEdit({ init }: { init: Profile }) {
	const ipc = useIPC();
	const dialog = useDialog();

	return (
		<>
			<details class="dropdown">
				<summary>Edit</summary>
				<ul>
					<li>
						<a onClick={dialog.open}>Edit</a>
					</li>
				</ul>
			</details>

			<Dialog ref={dialog.ref} title="Edit Profile" onClose={dialog.close}>
				<form
					onSubmit={async (e) => {
						e.preventDefault();

						const formData = new FormData(e.currentTarget);

						const data: Profile = {
							name: formData.get("name") as string,
							description: formData.get("description") as string,
							icon: formData.get("icon") as string,
							banner: (formData.get("banner") as string) || undefined,
							updatedAt: new Date().toISOString(),
						};

						const parsed = profileSchema.safeParse(data);
						if (!parsed.success) {
							console.error("Failed to parse profile:", parsed.error);
							return;
						}

						await ipc.client.update("polka.profile/self", parsed.data);
						await ipc.client.commit();

						dialog.close();
						location.reload();
					}}
				>
					<input type="text" name="name" placeholder="Name" value={init.name} />
					<textarea
						name="description"
						placeholder="Description"
						value={init.description}
						rows={6}
					/>
					<input
						type="url"
						name="icon"
						placeholder="Icon URL"
						value={init.icon}
					/>
					<input
						type="url"
						name="banner"
						placeholder="Banner URL (optional)"
						value={init.banner ?? ""}
					/>

					<div class="dialog-footer">
						<button type="button" class="secondary" onClick={dialog.close}>
							Cancel
						</button>
						<button type="submit">Save</button>
					</div>
				</form>
			</Dialog>
		</>
	);
}
