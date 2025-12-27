import type { GetResult } from "@polka/db/types";
import { createSignal } from "solid-js";
import { useDialog } from "../../hooks/useDialog";
import { useIPC } from "../../hooks/useIPC";
import { Dialog } from "../ui/Dialog";

export default function RecordEditForm({ init }: { init: GetResult }) {
	const ipc = useIPC();
	const [data, setData] = createSignal(JSON.stringify(init.data));

	const editDialog = useDialog();

	const handleSave = async () => {
		const parsed = JSON.parse(data());
		await ipc.client.update(init.rpath, parsed);
		await ipc.client.commit();

		editDialog.close();
		location.reload();
	};

	const handleDelete = async () => {
		await ipc.client.delete(init.rpath);
		await ipc.client.commit();
		editDialog.close();
		location.reload();
	};

	return (
		<>
			<button onClick={editDialog.open}>Edit</button>

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
				<textarea
					placeholder="Content"
					value={data()}
					onInput={(e) => setData(e.currentTarget.value)}
					rows={5}
				/>

				<button class="contrast" onClick={handleDelete}>
					Delete
				</button>
			</Dialog>
		</>
	);
}
