import { RepoReader } from "../lib/client";
import { resolve } from "../lib/identity";
import {
	type Feed,
	type FeedItem,
	followSchema,
	linkSchema,
	postSchema,
	profileSchema,
	type Ref,
} from "../types";
import { validateRecord, validateRecords } from "../utils/validation";

export const generateFeed = async (
	did: string,
	feedCache: Map<Ref, FeedItem>,
	readerCache: Map<string, RepoReader>,
): Promise<Feed | null> => {
	const feed = new Map<Ref, FeedItem>();

	const [reader, identity] = await Promise.all([
		RepoReader.init(did),
		resolve(did),
	]);

	readerCache.set(did, reader);

	const [profile, posts, links, follows] = await Promise.all([
		reader.getRecord("polka.profile/self"),
		reader.getRecords("polka.post"),
		reader.getRecords("polka.link"),
		reader.getRecords("polka.follow"),
	]);

	const parsedPosts = validateRecords(posts.records, postSchema);
	const parsedProfile = validateRecord(profile, profileSchema);
	const parsedLinks = validateRecords(links.records, linkSchema);
	const parsedFollows = validateRecords(follows.records, followSchema);

	if (!parsedProfile) return null;

	// 投稿をキャッシュに追加
	parsedPosts.forEach((post) => {
		feedCache.set(
			{ did, rpath: post.rpath },
			{
				type: "post",
				did,
				rpath: post.rpath,
				profile: parsedProfile,
				tags: post.data.tags,
				post,
			},
		);

		feed.set(
			{ did, rpath: post.rpath },
			{
				type: "post",
				did,
				rpath: post.rpath,
				profile: parsedProfile,
				tags: post.data.tags,
				post,
			},
		);
	});

	// リンク先のリポジトリリーダーを事前に初期化
	await Promise.all(
		parsedLinks.map(async (link) => {
			if (!readerCache.has(link.data.ref.did)) {
				const reader = await RepoReader.init(link.data.ref.did);
				readerCache.set(link.data.ref.did, reader);
			}
		}),
	);

	// リンクデータを並列取得してキャッシュに追加
	await Promise.all(
		parsedLinks.map(async (link) => {
			try {
				const reader = readerCache.get(link.data.ref.did);
				if (!reader) return;

				const has = feedCache.get({
					did: link.data.ref.did,
					rpath: link.data.ref.rpath,
				});

				if (has) {
					feed.set({ did: link.data.ref.did, rpath: link.rpath }, has);
				}

				if (!has) {
					const [post, profile] = await Promise.all([
						reader.getRecord(link.data.ref.rpath),
						reader.getRecord("polka.profile/self"),
					]);

					const parsedPost = validateRecords([post], postSchema);
					const parsedProfile = validateRecord(profile, profileSchema);

					if (!parsedPost || !parsedProfile) return;

					feedCache.set(
						{ did: link.data.ref.did, rpath: link.rpath },
						{
							type: "link",
							did: link.data.ref.did,
							rpath: link.rpath,
							tags: link.data.tags,
							post: parsedPost[0],
							profile: parsedProfile,
						},
					);

					feed.set(
						{ did: link.data.ref.did, rpath: link.rpath },
						{
							type: "link",
							did: link.data.ref.did,
							rpath: link.rpath,
							tags: link.data.tags,
							post: parsedPost[0],
							profile: parsedProfile,
						},
					);
				}
			} catch {
				// リンク先の取得に失敗しても処理を継続
				return;
			}
		}),
	);

	return {
		id: crypto.randomUUID(),
		did,
		pk: identity.didKey,
		ownerProfile: parsedProfile,
		feed: [...feed.values()],
		follows: parsedFollows,
	};
};
