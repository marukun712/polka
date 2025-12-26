import { now } from "@atcute/tid";
import { Show } from "solid-js";
import { useIPC } from "../hooks/useIPC";
import { linkDataSchema, type Post } from "../types";

export default function LinkButton({
	did,
	post,
	links,
}: {
	did: string;
	post: Post;
	links: string[];
}) {
	const ipc = useIPC();

	return (
		<Show
			when={links.length === 0}
			fallback={
				<form
					onSubmit={async (e) => {
						e.preventDefault();

						await Promise.all(links.map((link) => ipc.client.delete(link)));

						await ipc.client.commit();
					}}
				>
					<button type="submit">Unlink</button>
				</form>
			}
		>
			<form
				onSubmit={async (e) => {
					e.preventDefault();

					const form = e.currentTarget;
					const formData = new FormData(form);
					const tags = formData.get("tags") as string;
					const split = tags ? tags.split(",") : [];

					const raw = {
						ref: {
							did,
							rpath: post.rpath,
						},
						tags: split,
						updatedAt: new Date().toISOString(),
					};

					const parsed = linkDataSchema.safeParse(raw);
					if (!parsed.success) {
						console.error("Failed to parse link data:", parsed.error);
						return;
					}

					await ipc.client.create(`polka.link/${now()}`, parsed.data);
					await ipc.client.commit();

					form.reset();
				}}
			>
				<input type="text" name="tags" />
				<button type="submit">Link</button>
			</form>
		</Show>
	);
}
