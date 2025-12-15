import { createSignal } from "solid-js";
import z from "zod";
import { useDialog } from "../../hooks/useDialog";
import { useFormSubmit } from "../../hooks/useFormSubmit";
import { useIPC } from "../../hooks/useIPC";
import type { GetResult } from "../../public/interfaces/polka-repository-repo";
import { Dialog } from "../ui/Dialog";

export default function RecordEditForm({ init }: { init: GetResult }) {
	const ipc = useIPC();
	const [data, setData] = createSignal(init.data);

	const editDialog = useDialog();

	const { submit: submitEdit } = useFormSubmit({
		schema: z.string(),
		onSuccess: () => {
			editDialog.close();
			location.reload();
		},
	});

	const handleSave = async () => {
		submitEdit(data(), async (client, validated) => {
			await client.update(init.rpath, JSON.stringify(validated));
		});
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
