import { IoLink } from "solid-icons/io";
import { createResource, Show } from "solid-js";
import { getRecord } from "../../../lib/client";
import {
	linkDataSchema,
	postDataSchema,
	postSchema,
	profileSchema,
	type Ref,
} from "../../../types";
import { validateRecord } from "../../../utils/validation";

type PostCardProps = {
	recordRef: Ref;
};

const fetcher = async (ref: Ref) => {
	const type = ref.rpath.split("/")[0];
	const record = await getRecord(ref.did, ref.rpath);
	if (type === "polka.post") {
		const profile = await getRecord(ref.did, "polka.profile/self");
		if (!profile) return null;
		const parsedProfile = validateRecord(profile, profileSchema);
		if (!parsedProfile) return null;

		const parsed = validateRecord(record, postDataSchema);
		if (!parsed) return null;
		return {
			type: "post",
			profile: parsedProfile,
			data: parsed,
		};
	} else if (type === "polka.link") {
		const parsed = validateRecord(record, linkDataSchema);
		if (!parsed) return null;

		const profile = await getRecord(parsed.ref.did, "polka.profile/self");
		if (!profile) return null;
		const parsedProfile = validateRecord(profile, profileSchema);
		if (!parsedProfile) return null;

		const post = await getRecord(parsed.ref.did, parsed.ref.rpath);
		if (!post) return null;
		const parsedPost = validateRecord(post, postSchema);
		if (!parsedPost) return null;

		return {
			type: "link",
			profile: parsedProfile,
			data: parsedPost.data,
		};
	} else {
		return null;
	}
};

export default function PostCard(props: PostCardProps) {
	const [res] = createResource(props.recordRef, fetcher);

	return (
		<Show when={res()}>
			{(item) => (
				<article>
					<Show when={item().type === "link"}>
						<IoLink />
					</Show>

					<header style="display:flex; justify-content: space-between">
						<hgroup>
							<div style="display: flex; align-items: center; gap: 1rem;">
								<img
									src={item().profile.icon}
									alt={item().profile.name}
									style="border-radius: 50%; width: 48px; height: 48px;"
								/>
								<div>
									<strong>{item().profile.name}</strong>
									<br />
									<small>
										<time>
											{new Date(item().data.updatedAt).toLocaleString()}
										</time>
									</small>
								</div>
							</div>
						</hgroup>
					</header>
					{item().data.content}
				</article>
			)}
		</Show>
	);
}
