import type { Link, Post, Profile } from "../../@types/types";
import LinkButton from "./LinkButton";
import PostEdit from "./PostEdit";

export default function PostCard({
	did,
	post,
	profile,
	links,
}: {
	did: string;
	post: Post;
	profile: Profile;
	links: Link[];
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
				<PostEdit post={post} />
			</header>

			{post.data.content}

			<footer>
				<LinkButton did={did} post={post} links={links} />
			</footer>
		</article>
	);
}
