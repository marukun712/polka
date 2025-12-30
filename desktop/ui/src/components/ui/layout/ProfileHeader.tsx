import { type Component, type JSX, Show } from "solid-js";
import type { Profile } from "../../../types";

type ProfileHeaderProps = {
	profile: Profile;
	did: string;
	headerAction?: JSX.Element;
};

export const ProfileHeader: Component<ProfileHeaderProps> = (props) => {
	return (
		<article>
			<Show when={props.profile.banner}>
				<img
					src={props.profile.banner}
					alt="Banner"
					style="width: 100%; height: 300px; object-fit: cover;"
				/>
			</Show>
			<header style="display: flex; justify-content: space-between;">
				<hgroup>
					<figure>
						<img
							src={props.profile.icon}
							alt={props.profile.name}
							style="border-radius: 50%; width: 150px; height: 150px; object-fit: cover;"
						/>
					</figure>
					<h1>{props.profile.name}</h1>
					<p>{props.did}</p>
				</hgroup>
				{props.headerAction}
			</header>
			<p>{props.profile.description}</p>
		</article>
	);
};
