import type { GetResult } from "@polka/db/types";
import { useNavigate } from "@solidjs/router";
import { createResource, Show } from "solid-js";
import { getRecord } from "../../../lib/reader";
import {
	linkDataSchema,
	postDataSchema,
	profileSchema,
	type Ref,
} from "../../../types";
import { validateRecord } from "../../../utils/validation";

async function fetchPostData(ref: Ref) {
	const type = ref.rpath.split("/")[0];
	const record = await getRecord(ref.did, ref.rpath);
	if (!record) return null;

	if (type === "polka.post") {
		return fetchPostType(ref.did, ref.rpath, record);
	}
	if (type === "polka.link") {
		return fetchLinkType(record);
	}
	return null;
}

async function fetchPostType(did: string, rpath: string, record: GetResult) {
	const profile = await getRecord(did, "polka.profile/self");
	const parsedProfile = validateRecord(profile, profileSchema);
	const parsedData = validateRecord(record, postDataSchema);
	if (!parsedProfile || !parsedData) return null;
	return {
		type: "post",
		profile: parsedProfile,
		rpath,
		data: parsedData,
		author: did,
	};
}

async function fetchLinkType(record: GetResult) {
	const parsed = validateRecord(record, linkDataSchema);
	if (!parsed) return null;
	const profile = await getRecord(parsed.ref.did, "polka.profile/self");
	const parsedProfile = validateRecord(profile, profileSchema);
	if (!parsedProfile) return null;
	const post = await getRecord(parsed.ref.did, parsed.ref.rpath);
	if (!post) return null;
	const parsedPost = validateRecord(post, postDataSchema);
	if (!parsedPost) return null;
	return {
		type: "link",
		profile: parsedProfile,
		rpath: parsed.ref.rpath,
		data: parsedPost,
		author: parsed.ref.did,
	};
}

export default function PostCard(props: { recordRef: Ref }) {
	const navigate = useNavigate();
	const [data] = createResource(() => props.recordRef, fetchPostData);

	return (
		<Show when={data()}>
			{(item) => (
				<article>
					<header style="display:flex; justify-content: space-between">
						<hgroup>
							<div style="display: flex; align-items: center; gap: 1rem;">
								<img
									src={item().profile.icon}
									alt={item().profile.name}
									style="border-radius: 50%; width: 48px; height: 48px; object-fit: cover; cursor: pointer;"
									onClick={() => navigate(`/user?did=${item().author}`)}
									onKeyUp={(e) => {
										e.preventDefault();
										navigate(`/user?did=${item().author}`);
									}}
								/>
								<div>
									<strong
										style="cursor: pointer;"
										onClick={() => navigate(`/user?did=${item().author}`)}
										onKeyUp={(e) => {
											e.preventDefault();
											navigate(`/user?did=${item().author}`);
										}}
									>
										{item().profile.name}
									</strong>
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
					<p style="white-space: pre-wrap;">{item().data.content}</p>
				</article>
			)}
		</Show>
	);
}
