import { now } from "@atcute/tid";
import { IoLink } from "solid-icons/io";
import { For } from "solid-js";
import { useDialog } from "../../hooks/useDialog";
import { useIPC } from "../../hooks/useIPC";
import { type LinkData, linkDataSchema, type Ref } from "../../types";
import { Dialog } from "../ui/Dialog";

export default function LinkButton({
	recordRef,
	availableTags,
}: {
	recordRef: Ref;
	availableTags: string[];
}) {
	const ipc = useIPC();
	const linkDialog = useDialog();

	return (
		<>
			<button onClick={linkDialog.open} aria-label="Link this post">
				<IoLink />
			</button>

			<Dialog
				ref={linkDialog.ref}
				title="この投稿をリンク"
				onClose={linkDialog.close}
			>
				<form
					onSubmit={async (e) => {
						e.preventDefault();

						const formData = new FormData(e.currentTarget);
						const selectedTags = formData.getAll("tags") as string[];
						const parents = selectedTags.filter(Boolean);

						const linkRpath = `polka.link/${now()}`;

						const data: LinkData = {
							ref: {
								did: recordRef.did,
								rpath: recordRef.rpath,
							},
							parents,
							updatedAt: new Date().toISOString(),
						};

						const parsed = linkDataSchema.safeParse(data);
						if (!parsed.success) {
							console.error("Failed to parse link:", parsed.error);
							return;
						}

						await ipc.client.create(linkRpath, parsed.data);
						await ipc.client.commit();

						linkDialog.close();
						location.reload();
					}}
				>
					<label for="link-tags">親タグ (Ctrl/Cmd+クリックで複数選択)</label>
					<select id="link-tags" multiple name="tags" size={5}>
						<For each={availableTags}>
							{(tag) => <option value={tag}>{tag}</option>}
						</For>
					</select>
					<div class="dialog-footer">
						<button type="button" class="secondary" onClick={linkDialog.close}>
							キャンセル
						</button>
						<button type="submit">リンク</button>
					</div>
				</form>
			</Dialog>
		</>
	);
}
