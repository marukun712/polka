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
				<strong>{profile.name}</strong>{" "}
				<small>{extractTimestamp(post.rpath)}</small>
			</header>
			<p>{post.data.content}</p>
		</article>
	);
}
