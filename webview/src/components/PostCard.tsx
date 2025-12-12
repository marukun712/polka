import type { Post, Profile } from "../../@types/types";
import { extractTimestamp } from "../../utils/tid";
import PostEdit from "./PostEdit";

export default function PostCard({
	post,
	profile,
	onUpdate,
	onDelete,
}: {
	post: Post;
	profile: Profile;
	onUpdate: (tag: string[], text: string) => void;
	onDelete: () => void;
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
								<time>{extractTimestamp(post.rpath)}</time>
							</small>
						</div>
					</div>
				</hgroup>
				<div>
					<PostEdit
						tag={post.data.tags ?? []}
						text={post.data.content}
						onUpdate={onUpdate}
						onDelete={onDelete}
					/>
				</div>
			</header>
			{post.data.content}
		</article>
	);
}
