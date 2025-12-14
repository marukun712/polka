import { now } from "@atcute/tid";
import { Show, useContext } from "solid-js";
import { daemonContext } from "..";
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
	const daemon = useContext(daemonContext);

	if (daemon)
		return (
			<Show
				when={links.length === 0}
				fallback={
					<form
						onSubmit={async (e) => {
							e.preventDefault();

							await Promise.all(
								links.map((link) => daemon.daemon.delete(link)),
							);

							await daemon.daemon.commit();
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

						await daemon.daemon.create(
							`polka.link/${now()}`,
							JSON.stringify(parsed.data),
						);
						await daemon.daemon.commit();

						form.reset();
					}}
				>
					<input type="text" name="tags" />
					<button type="submit">Link</button>
				</form>
			</Show>
		);
}
