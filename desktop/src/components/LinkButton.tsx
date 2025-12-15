import { now } from "@atcute/tid";
import { Show } from "solid-js";
import { useCli } from "../hooks/useCli";
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
	const cli = useCli();

	return (
		<Show
			when={links.length === 0}
			fallback={
				<form
					onSubmit={async (e) => {
						e.preventDefault();

						await Promise.all(links.map((link) => cli.client.delete(link)));

						await cli.client.commit();
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

					await cli.client.create(
						`polka.link/${now()}`,
						JSON.stringify(parsed.data),
					);
					await cli.client.commit();

					form.reset();
				}}
			>
				<input type="text" name="tags" />
				<button type="submit">Link</button>
			</form>
		</Show>
	);
}
