import { createResource, createSignal, For, Show } from "solid-js";
import { useDialog } from "../../../hooks/useDialog";
import { useIPC } from "../../../hooks/useIPC";
import { getRecords } from "../../../lib/reader";
import {
	type Edge,
	type EdgeData,
	edgeDataSchema,
	edgeSchema,
} from "../../../types";
import { validateRecords } from "../../../utils/validation";
import { Dialog } from "../Dialog";

export default function TagManager({ user }: { user: string }) {
	const ipc = useIPC();
	const listDialog = useDialog();
	const editDialog = useDialog();
	const [editingEdge, setEditingEdge] = createSignal<Edge | null>(null);

	const [edges] = createResource(
		() => user,
		async (did: string) => {
			const records = await getRecords(did, "polka.edge");
			return validateRecords(records.records, edgeSchema);
		},
	);

	const handleDelete = async (rpath: string) => {
		await ipc.client.delete(rpath);
		await ipc.client.commit();
		listDialog.close();
		location.reload();
	};

	const handleEdit = (edge: Edge) => {
		setEditingEdge(edge);
		editDialog.open();
	};

	const handleSaveEdit = async (e: Event) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget as HTMLFormElement);

		const data: EdgeData = {
			from: formData.get("from") as string,
			to: formData.get("to") as string,
			updatedAt: new Date().toISOString(),
		};

		const parsed = edgeDataSchema.safeParse(data);
		if (!parsed.success) {
			console.error("Validation error:", parsed.error);
			return;
		}

		const edge = editingEdge();
		const rpath = edge ? edge.rpath : null;

		if (!rpath) throw new Error("Invalid rpath");

		await ipc.client.update(rpath, parsed.data);
		await ipc.client.commit();
		editDialog.close();
		location.reload();
	};

	return (
		<>
			<article>
				<button onClick={listDialog.open}>タグ階層を管理</button>

				<Dialog
					ref={listDialog.ref}
					title="タグ階層管理"
					onClose={listDialog.close}
					footer={
						<button class="secondary" onClick={listDialog.close}>
							閉じる
						</button>
					}
				>
					<Show when={edges()} fallback={<p>読み込み中...</p>}>
						{(items) => (
							<Show
								when={items().length > 0}
								fallback={<p>作成されたタグはありません</p>}
							>
								<For each={items()}>
									{(edge) => (
										<article style={{ "margin-bottom": "1rem" }}>
											<header>
												<strong>
													{edge.data.from ? `${edge.data.from} → ` : ""}
													{edge.data.to}
												</strong>
											</header>
											<p style={{ margin: "0.5rem 0" }}>
												<small>
													更新日時:{" "}
													{new Date(edge.data.updatedAt).toLocaleString()}
												</small>
											</p>
											<footer style={{ display: "flex", gap: "0.5rem" }}>
												<button onClick={() => handleEdit(edge)}>編集</button>
												<button
													class="contrast"
													onClick={() => handleDelete(edge.rpath)}
												>
													削除
												</button>
											</footer>
										</article>
									)}
								</For>
							</Show>
						)}
					</Show>
				</Dialog>
			</article>

			<Dialog
				ref={editDialog.ref}
				title="タグを編集"
				onClose={editDialog.close}
			>
				<Show when={editingEdge()}>
					{(edge) => (
						<form onSubmit={handleSaveEdit}>
							<label>
								親タグ (任意)
								<input
									type="text"
									name="from"
									value={edge().data.from || ""}
									placeholder="親タグがない場合は空欄"
								/>
							</label>
							<label>
								タグ名 (必須)
								<input type="text" name="to" value={edge().data.to} required />
							</label>
							<button type="submit">保存</button>
							<button
								type="button"
								class="secondary"
								onClick={editDialog.close}
							>
								キャンセル
							</button>
						</form>
					)}
				</Show>
			</Dialog>
		</>
	);
}
