import type { GetResult } from "@polka/db/types";
import { useDialog } from "../../hooks/useDialog";
import { useIPC } from "../../hooks/useIPC";
import { Dialog } from "../ui/Dialog";

export default function RecordEditForm({ init }: { init: GetResult }) {
	const ipc = useIPC();
	const editDialog = useDialog();

	return (
		<>
			<button onClick={editDialog.open}>Edit</button>

			<Dialog
				ref={editDialog.ref}
				title="Edit record"
				onClose={editDialog.close}
			>
				<form
					onSubmit={async (e) => {
						e.preventDefault();

						const formData = new FormData(e.currentTarget);
						const raw = formData.get("data") as string;

						let parsed: Record<string, unknown>;
						try {
							parsed = JSON.parse(raw);
						} catch (err) {
							console.error("Invalid JSON:", err);
							return;
						}

						await ipc.client.update(init.rpath, parsed);
						await ipc.client.commit();

						editDialog.close();
						location.reload();
					}}
				>
					<textarea
						name="data"
						placeholder="Content (JSON)"
						value={JSON.stringify(init.data, null, 2)}
						rows={8}
					/>

					<div class="dialog-footer">
						<button type="button" class="secondary" onClick={editDialog.close}>
							Cancel
						</button>
						<button type="submit">Save</button>
					</div>
				</form>

				<hr />

				<button
					class="contrast"
					onClick={async () => {
						await ipc.client.delete(init.rpath);
						await ipc.client.commit();
						editDialog.close();
						location.reload();
					}}
				>
					Delete
				</button>
			</Dialog>
		</>
	);
}
