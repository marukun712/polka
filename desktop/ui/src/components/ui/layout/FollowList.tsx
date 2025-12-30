import { For, Show } from "solid-js";
import { useDialog } from "../../../hooks/useDialog";
import { useIPC } from "../../../hooks/useIPC";
import type { Follow } from "../../../types";
import { Dialog } from "../Dialog";

export default function FollowList({ follows }: { follows: Follow[] }) {
	const ipc = useIPC();
	const listDialog = useDialog();

	const handleUnfollow = async (rpath: string) => {
		await ipc.client.delete(rpath);
		await ipc.client.commit();
		listDialog.close();
		location.reload();
	};

	return (
		<article>
			<button onClick={listDialog.open}>フォロー中のタグを表示</button>

			<Dialog
				ref={listDialog.ref}
				title="フォロー中のタグノード"
				onClose={listDialog.close}
				footer={
					<button class="secondary" onClick={listDialog.close}>
						閉じる
					</button>
				}
			>
				<Show
					when={follows.length > 0}
					fallback={<p>フォロー中のタグノードはありません</p>}
				>
					<For each={follows}>
						{(follow) => (
							<article style={{ "margin-bottom": "1rem" }}>
								<header>
									<strong>Tag: #{follow.data.tag}</strong>
								</header>
								<p style={{ margin: "0.5rem 0" }}>
									<small>DID: {follow.data.did}</small>
								</p>
								<p style={{ margin: "0.5rem 0" }}>
									<small>
										Updated: {new Date(follow.data.updatedAt).toLocaleString()}
									</small>
								</p>
								<footer>
									<button
										class="contrast"
										onClick={() => handleUnfollow(follow.rpath)}
									>
										解除
									</button>
								</footer>
							</article>
						)}
					</For>
				</Show>
			</Dialog>
		</article>
	);
}
