import { useContext } from "solid-js";
import { feedCache, readerCache } from "../contexts";
import { RepoReader } from "../lib/client";
import {
	type FeedItem,
	linkSchema,
	postSchema,
	profileSchema,
	type Ref,
} from "../types";

export function useFeedItemResolver() {
	const loadedFeed = useContext(feedCache);
	const loadedReader = useContext(readerCache);

	const resolveFeedItem = async (ref: Ref): Promise<FeedItem | null> => {
		// キャッシュチェック
		const cached = loadedFeed.get(ref);
		if (cached) return cached;

		// Readerの取得または作成
		let reader = loadedReader.get(ref.did);
		if (!reader) {
			reader = await RepoReader.init(ref.did);
			loadedReader.set(ref.did, reader);
		}

		// レコード取得
		const [postRecord, profileRecord] = await Promise.all([
			reader.getRecord(ref.rpath),
			reader.getRecord("polka.profile/self"),
		]);

		if (!postRecord || !profileRecord) return null;

		// プロフィール検証
		const profileParsed = profileSchema.safeParse(profileRecord.data);
		if (!profileParsed.success) return null;

		const postData = {
			rpath: postRecord.rpath,
			data: postRecord.data,
		};

		// Post型として検証
		const postParsed = postSchema.safeParse(postData);
		if (postParsed.success) {
			return {
				type: "post",
				did: ref.did,
				profile: profileParsed.data,
				rpath: postParsed.data.rpath,
				tags: postParsed.data.data.tags,
				post: postParsed.data,
			};
		}

		// Link型として検証
		const linkParsed = linkSchema.safeParse(postData);
		if (!linkParsed.success) return null;

		// 再帰的にターゲットを解決
		const target =
			loadedFeed.get(linkParsed.data.data.ref) ??
			(await resolveFeedItem(linkParsed.data.data.ref));

		if (!target) return null;

		return {
			type: "link",
			did: ref.did,
			profile: profileParsed.data,
			rpath: linkParsed.data.rpath,
			tags: linkParsed.data.data.tags,
			post: target.post,
		};
	};

	return resolveFeedItem;
}
