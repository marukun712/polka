import { now } from "@atcute/tid";
import { IoLink } from "solid-icons/io";
import { useDialog } from "../../hooks/useDialog";
import { useIPC } from "../../hooks/useIPC";
import { type LinkData, linkDataSchema, type Ref } from "../../types";
import { Dialog } from "../ui/Dialog";

export default function LinkButton({ ref }: { ref: Ref }) {
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
						const tags = formData.get("tags") as string;
						const parents = tags
							.split(",")
							.map((t) => t.trim())
							.filter(Boolean);

						const linkRpath = `polka.link/${now()}`;

						const data: LinkData = {
							ref: {
								did: ref.did,
								rpath: ref.rpath,
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
					<input type="text" name="tags" placeholder="タグ1, タグ2" />
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
