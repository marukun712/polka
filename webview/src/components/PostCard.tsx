import { IoLink } from "solid-icons/io";
import { Show } from "solid-js";
import type { FeedItem, Link } from "../../@types/types";
import LinkButton from "./LinkButton";
import PostEdit from "./PostEdit";

export default function PostCard({
	did,
	item,
	links,
}: {
	did: string;
	item: FeedItem;
	links: Link[];
}) {
	return (
		<article>
			<Show when={item.type === "link"}>
				<IoLink />
				<h4>linked {item.tags.join("/")}</h4>
			</Show>
			<header style="display:flex; justify-content: space-between">
				<hgroup>
					<div style="display: flex; align-items: center; gap: 1rem;">
						<img
							src={item.profile.icon}
							alt={item.profile.name}
							style="border-radius: 50%; width: 48px; height: 48px; object-fit: cover; margin: 0;"
						/>
						<div>
							<strong>{item.profile.name}</strong>
							<br />
							<small>
								<time>
									{new Date(item.post.data.updatedAt).toLocaleString()}
								</time>
							</small>
						</div>
					</div>
				</hgroup>
				<PostEdit post={item.post} />
			</header>

			{item.post.data.content}

			<footer>
				<LinkButton did={did} post={item.post} links={links} />
			</footer>
		</article>
	);
}
