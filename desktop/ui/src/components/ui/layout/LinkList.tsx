import { createResource, For, Show } from "solid-js";
import { useDialog } from "../../../hooks/useDialog";
import { useIPC } from "../../../hooks/useIPC";
import { getRecords } from "../../../lib/reader";
import { linkSchema } from "../../../types";
import { validateRecords } from "../../../utils/validation";
import { Dialog } from "../Dialog";

export default function LinkList({ user }: { user: string }) {
	const ipc = useIPC();
	const listDialog = useDialog();

	const [links] = createResource(
		() => user,
		async (did: string) => {
			const records = await getRecords(did, "polka.link");
			return validateRecords(records.records, linkSchema);
		},
	);

	const handleDelete = async (rpath: string) => {
		await ipc.client.delete(rpath);
		await ipc.client.commit();
		listDialog.close();
		location.reload();
	};

	return (
		<article>
			<button onClick={listDialog.open}>リンク一覧を表示</button>

			<Dialog
				ref={listDialog.ref}
				title="保存したリンク"
				onClose={listDialog.close}
				footer={
					<button class="secondary" onClick={listDialog.close}>
						閉じる
					</button>
				}
			>
				<Show when={links()} fallback={<p>読み込み中...</p>}>
					{(items) => (
						<Show
							when={items().length > 0}
							fallback={<p>保存されたリンクはありません</p>}
						>
							<For each={items()}>
								{(link) => (
									<article style={{ "margin-bottom": "1rem" }}>
										<header>
											<strong>リンク先</strong>
										</header>
										<p style={{ margin: "0.5rem 0" }}>
											<small>DID: {link.data.ref.did}</small>
										</p>
										<p style={{ margin: "0.5rem 0" }}>
											<small>Path: {link.data.ref.rpath}</small>
										</p>
										<p style={{ margin: "0.5rem 0" }}>
											<small>
												タグ:{" "}
												{link.data.parents.length > 0
													? link.data.parents.join(", ")
													: "なし"}
											</small>
										</p>
										<p style={{ margin: "0.5rem 0" }}>
											<small>
												作成日時:{" "}
												{new Date(link.data.updatedAt).toLocaleString()}
											</small>
										</p>
										<footer>
											<button
												class="contrast"
												onClick={() => handleDelete(link.rpath)}
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
	);
}
