import type { GetResult } from "@polka/db/types";
import { useNavigate } from "@solidjs/router";
import { createResource, Show, Suspense } from "solid-js";
import { useIPC } from "../../../hooks/useIPC";
import { getRecord } from "../../../lib/reader";
import {
	linkDataSchema,
	postDataSchema,
	profileSchema,
	type Ref,
} from "../../../types";
import { validateRecord } from "../../../utils/validation";
import LinkButton from "../../button/LinkButton";
import PostEdit from "../../forms/PostEditForm";
import "zenn-content-css";

type PostCardProps = {
	recordRef: Ref;
	user: string;
	availableTags: string[];
};

function MD(props: { content: string }) {
	const ipc = useIPC();
	const [html] = createResource(
		() => props.content,
		async (md: string) => {
			const res = await ipc.client.parseMd(md);
			return String(res);
		},
	);
	return (
		<div class="znc">
			<div innerHTML={html()} />
		</div>
	);
}

async function fetchPostData(ref: Ref) {
	const type = ref.rpath.split("/")[0];
	const record = await getRecord(ref.did, ref.rpath);
	if (!record) throw new Error("Record not found.");

	if (type === "polka.post") {
		return fetchPostType(ref.did, ref.rpath, record);
	} else if (type === "polka.link") {
		return fetchLinkType(record);
	}
	return null;
}

async function fetchPostType(did: string, rpath: string, record: GetResult) {
	// 投稿者のプロフィールを取得する
	const profile = await getRecord(did, "polka.profile/self");
	if (!profile) return null;

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

	// リンク先の投稿者のプロフィールを取得する
	const profile = await getRecord(parsed.ref.did, "polka.profile/self");
	if (!profile) return null;
	const parsedProfile = validateRecord(profile, profileSchema);
	if (!parsedProfile) return null;

	// リンク先の投稿を取得する
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

export default function PostCard(props: PostCardProps) {
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
									onKeyUp={(e) => {
										e.preventDefault();
										navigate(`/user?did=${item().author}`);
									}}
								/>
								<div>
									<strong
										style="cursor: pointer;"
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
						<Show when={item().author === props.user}>
							<PostEdit post={item()} availableTags={props.availableTags} />
						</Show>
						<Show when={item().author !== props.user && item().type === "post"}>
							<LinkButton
								recordRef={{ did: item().author, rpath: item().rpath }}
								availableTags={props.availableTags}
							/>
						</Show>
					</header>
					<Suspense>
						<MD content={item().data.content} />
					</Suspense>
				</article>
			)}
		</Show>
	);
}
