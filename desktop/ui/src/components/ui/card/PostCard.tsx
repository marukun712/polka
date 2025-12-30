import { IoLink } from "solid-icons/io";
import { type JSX, type ParentComponent, Show } from "solid-js";

type PostCardProps = {
	headerAction?: JSX.Element;
	footerAction?: JSX.Element;
};

const PostCard: ParentComponent<PostCardProps> = (props) => {
	return (
		<article>
			<Show when={props.item.type === "link"}>
				<IoLink />
				<h4>linked {props.item.tags.join("/")}</h4>
			</Show>

			<header style="display:flex; justify-content: space-between">
				<hgroup>
					<div style="display: flex; align-items: center; gap: 1rem;">
						<img
							src={props.item.profile.icon}
							alt={props.item.profile.name}
							style="border-radius: 50%; width: 48px; height: 48px;"
						/>
						<div>
							<strong>{props.item.profile.name}</strong>
							<br />
							<small>
								<time>
									{new Date(props.item.post.data.updatedAt).toLocaleString()}
								</time>
							</small>
						</div>
					</div>
				</hgroup>

				{props.headerAction}
			</header>

			{props.item.post.data.content}

			<footer>{props.footerAction}</footer>
		</article>
	);
};

export default PostCard;
