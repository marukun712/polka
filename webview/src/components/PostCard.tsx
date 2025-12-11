import type { Post, Profile } from "../../@types/types";
import { extractTimestamp } from "../../utils/tid";

export default function PostCard({
	post,
	profile,
}: {
	post: Post;
	profile: Profile;
}) {
	return (
		<article>
			<header>
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
			</header>
			{post.data.content}
		</article>
	);
}
