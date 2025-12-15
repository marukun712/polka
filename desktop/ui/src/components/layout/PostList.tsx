import { type Component, createMemo, For, type JSX } from "solid-js";
import type { FeedItem } from "../../types";
import PostCard from "../PostCard";

type PostListProps = {
	title: string;
	posts: FeedItem[];
	isOwner?: boolean;
	headerAction?: (item: FeedItem) => JSX.Element;
	footerAction?: (item: FeedItem, links: string[]) => JSX.Element;
};

export const PostList: Component<PostListProps> = (props) => {
	const linkMap = createMemo(() => {
		const map = new Map<string, string[]>();
		for (const item of props.posts) {
			const links = props.posts
				.filter(
					(link) => link.type === "link" && link.post.rpath === item.post.rpath,
				)
				.map((link) => link.rpath);
			map.set(item.post.rpath, links);
		}
		return map;
	});

	return (
		<article>
			<header>
				<h1>Posts: {props.title}</h1>
			</header>
			<For each={props.posts}>
				{(item) => {
					const links = linkMap().get(item.post.rpath) ?? [];
					return (
						<PostCard
							item={item}
							headerAction={props.headerAction?.(item)}
							footerAction={props.footerAction?.(item, links)}
						/>
					);
				}}
			</For>
		</article>
	);
};
