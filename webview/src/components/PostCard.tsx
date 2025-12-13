import { Show } from "solid-js";
import {
	type LinkData,
	linkDataSchema,
	type Post,
	type Profile,
} from "../../@types/types";
import PostEdit from "./PostEdit";

export default function PostCard({
	did,
	post,
	profile,
	onLink,
	onUpdate,
	onDelete,
}: {
	did: string;
	post: Post;
	profile: Profile;
	onLink?: (link: LinkData) => void;
	onUpdate?: (tag: string[], text: string) => void;
	onDelete?: () => void;
}) {
	return (
		<article>
			<header style="display:flex; justify-content: space-between">
				<hgroup>
					<div style="display: flex; align-items: center; gap: 1rem;">
						<img
							src={profile.icon}
							alt={profile.name}
							style="border-radius: 50%; width: 48px; height: 48px; object-fit: cover; margin: 0;"
						/>
						<div>
							<strong>{profile.name}</strong>
							<br />
							<small>
								<time>{new Date(post.data.updatedAt).toLocaleString()}</time>
							</small>
						</div>
					</div>
				</hgroup>
				<Show when={onUpdate && onDelete ? { onUpdate, onDelete } : null}>
					{(edit) => (
						<div>
							<PostEdit
								tag={post.data.tags ?? []}
								text={post.data.content}
								onUpdate={edit().onUpdate}
								onDelete={edit().onDelete}
							/>
						</div>
					)}
				</Show>
			</header>

			{post.data.content}

			<Show when={onLink}>
				{(link) => (
					<footer>
						<form
							onSubmit={(e) => {
								e.preventDefault();

								const form = e.currentTarget;
								const formData = new FormData(form);
								const tags = formData.get("tags") as string | null;
								if (!tags) return;
								const split = tags.split(",");

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

								link()(parsed.data);

								form.reset();
							}}
						>
							<input type="text" name="tags" />
							<button type="submit">Link</button>
						</form>
					</footer>
				)}
			</Show>
		</article>
	);
}
