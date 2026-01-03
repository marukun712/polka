import { now } from "@atcute/tid";
import { createSignal, Show } from "solid-js";
import z from "zod";
import { useIPC } from "../../hooks/useIPC";
import { type EdgeData, edgeDataSchema } from "../../types";

export default function TagForm() {
	const ipc = useIPC();
	const [error, setError] = createSignal<string | null>(null);

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				setError(null);

				const formData = new FormData(e.currentTarget);
				const raw = formData.get("tags") as string;

				const tags = raw
					.split("/")
					.map((t) => t.trim())
					.filter(Boolean);

				for (let i = 0; i < tags.length; i++) {
					const tag = tags[i];
					const parent = i === 0 ? undefined : tags[i - 1];

					const data: EdgeData = {
						to: tag,
						updatedAt: new Date().toISOString(),
					};

					if (parent) {
						data.from = parent;
					}

					const parsed = edgeDataSchema.safeParse(data);
					if (!parsed.success) {
						setError(z.treeifyError(parsed.error).errors.join(","));
						return;
					}

					await ipc.client.create(`polka.edge/${now()}`, parsed.data);
				}

				await ipc.client.commit();
				location.reload();
				e.currentTarget.reset();
			}}
		>
			<label for="tag-hierarchy">タグ階層(スラッシュ区切り)</label>
			<input
				id="tag-hierarchy"
				type="text"
				name="tags"
				placeholder="親タグ/子タグ/孫タグ"
			/>
			<Show when={error()}>
				<p role="alert" style="color: red;">
					{error()}
				</p>
			</Show>
			<button type="submit">Create</button>
		</form>
	);
}
