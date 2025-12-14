import { verifySignature } from "@atproto/crypto";
import {
	type Feed,
	type FeedItem,
	followSchema,
	linkSchema,
	postSchema,
	profileSchema,
	type Ref,
} from "../@types/types";
import { RepoReader } from "../lib/client";
import { resolve } from "../lib/identity";
import type { GetResult } from "../public/interfaces/polka-repository-repo";

const validatePosts = (posts: GetResult[]) =>
	posts.flatMap((post) => {
		try {
			const json = JSON.parse(post.data);
			const parsed = postSchema.safeParse({ rpath: post.rpath, data: json });
			return parsed.success ? [parsed.data] : [];
		} catch {
			return [];
		}
	});

const validateProfile = (profile: GetResult) => {
	try {
		const json = JSON.parse(profile.data);
		const parsedProfile = profileSchema.safeParse(json);
		if (!parsedProfile.success) {
			console.error("Failed to parse profile:", parsedProfile.error);
			return null;
		}
		return parsedProfile.data;
	} catch (e) {
		console.error(e);
		return null;
	}
};

const validateLinks = (links: GetResult[]) => {
	return links.flatMap((link) => {
		try {
			const json = JSON.parse(link.data);
			const parsed = linkSchema.safeParse({
				rpath: link.rpath,
				data: json,
			});
			return parsed.success ? [parsed.data] : [];
		} catch {
			return [];
		}
	});
};

const validateFollows = (follows: GetResult[]) => {
	return follows.flatMap((follow) => {
		try {
			const json = JSON.parse(follow.data);
			const parsed = followSchema.safeParse({
				rpath: follow.rpath,
				data: json,
			});
			return parsed.success ? [parsed.data] : [];
		} catch {
			return [];
		}
	});
};

export const generateFeed = async (
	did: string,
	feedCache: Map<Ref, FeedItem>,
	readerCache: Map<string, RepoReader>,
): Promise<Feed | null> => {
	const [reader, identity] = await Promise.all([
		RepoReader.init(did),
		resolve(did),
	]);

	readerCache.set(did, reader);

	const { didKey } = identity;

	const { sig, bytes } = await reader.getCommitToVerify();
	const verified = await verifySignature(didKey, bytes, sig);
	if (!verified) throw new Error("Failed to verify signature");

	const [profile, posts, links, follows] = await Promise.all([
		reader.getRecord("polka.profile/self"),
		reader.getRecords("polka.post"),
		reader.getRecords("polka.link"),
		reader.getRecords("polka.follow"),
	]);

	const parsedPosts = validatePosts(posts);
	const parsedProfile = validateProfile(profile);
	const parsedLinks = validateLinks(links);
	const parsedFollows = validateFollows(follows);
	if (!parsedProfile) return null;

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
	});

	await Promise.all(
		parsedLinks.map(async (link) => {
			if (!readerCache.has(link.data.ref.did)) {
				const reader = await RepoReader.init(link.data.ref.did);
				readerCache.set(link.data.ref.did, reader);
			}
		}),
	);

	await Promise.all(
		parsedLinks.map(async (link) => {
			try {
				const reader = readerCache.get(link.data.ref.did);
				if (!reader) return;

				const has = feedCache.has({
					did: link.data.ref.did,
					rpath: link.data.ref.rpath,
				});

				if (!has) {
					const [post, profile] = await Promise.all([
						reader.getRecord(link.data.ref.rpath),
						reader.getRecord("polka.profile/self"),
					]);
					const parsedPost = validatePosts([post]);
					const parsedProfile = validateProfile(profile);
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
				}
			} catch {
				return [];
			}
		}),
	);

	return {
		id: crypto.randomUUID(),
		did,
		pk: identity.didKey,
		ownerProfile: parsedProfile,
		feed: [...feedCache.values()],
		follows: parsedFollows,
	};
};
