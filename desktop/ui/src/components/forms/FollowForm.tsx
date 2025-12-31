import { now } from "@atcute/tid";
import { createSignal, Show } from "solid-js";
import z from "zod";
import { useIPC } from "../../hooks/useIPC";
import { type FollowData, followDataSchema } from "../../types";

export default function FollowForm() {
	const ipc = useIPC();
	const [error, setError] = createSignal<string | null>(null);

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				setError(null);
				const form = e.currentTarget;
				const formData = new FormData(form);
				const did = formData.get("did") as string;
				const tag = formData.get("tag") as string;

				if (!did || !tag) return;

				const raw: FollowData = {
					did,
					tag,
					updatedAt: new Date().toISOString(),
				};

				const parsed = followDataSchema.safeParse(raw);
				if (!parsed.success) {
					setError(z.treeifyError(parsed.error).errors.join(","));
					return;
				}

				await ipc.client.create(`polka.follow/${now()}`, parsed.data);
				await ipc.client.commit();

				form.reset();
			}}
		>
			<label for="follow-did">フォロー対象のDID</label>
			<input
				id="follow-did"
				type="text"
				name="did"
				placeholder="did:web:example.com"
				required
			/>
			<label for="follow-tag">フォロー対象のタグ</label>
			<input
				id="follow-tag"
				type="text"
				name="tag"
				placeholder="technology, programming"
				required
			/>
			<Show when={error()}>
				<p role="alert" style="color: red;">
					{error()}
				</p>
			</Show>
			<button type="submit">Follow</button>
		</form>
	);
}
