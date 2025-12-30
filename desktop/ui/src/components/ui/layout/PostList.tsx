import { type Component, For, type JSX } from "solid-js";
import type { Post } from "../../../types";
import PostCard from "../card/PostCard";

type PostListProps = {
	posts: Post[];
	headerAction?: (item: Post) => JSX.Element;
	footerAction?: (item: Post, links: string[]) => JSX.Element;
};

export const PostList: Component<PostListProps> = (props) => {
	return (
		<article>
			<For each={props.posts}>
				{(item) => {
					return (
						<PostCard item={item} headerAction={props.headerAction?.(item)} />
					);
				}}
			</For>
		</article>
	);
};
