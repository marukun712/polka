import { verifySignature } from "@atproto/crypto";
import {
	type FeedItem,
	linkSchema,
	type Post,
	type Profile,
	postSchema,
	profileSchema,
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

export const generateFeed = async (did: string) => {
	const cachedPost = new Map<string, Post>();
	const cachedProfile = new Map<string, Profile>();

	const [reader, identity] = await Promise.all([
		RepoReader.init(did),
		resolve(did),
	]);
	const { didKey } = identity;

	const { sig, bytes } = await reader.getCommitToVerify();
	const verified = await verifySignature(didKey, bytes, sig);
	if (!verified) throw new Error("Failed to verify signature");

	const [profile, posts, links] = await Promise.all([
		reader.getRecord("polka.profile/self"),
		reader.getRecords("polka.post"),
		reader.getRecords("polka.link"),
	]);

	const parsedPosts = validatePosts(posts);
	const parsedProfile = validateProfile(profile);
	const parsedLinks = validateLinks(links);
	if (!parsedProfile) return null;

	cachedProfile.set(did, parsedProfile);

	const feed = new Set<FeedItem>();
	const readerMap = new Map<string, RepoReader>();

	parsedPosts.forEach((post) => {
		cachedPost.set(post.rpath, post);

		feed.add({
			type: "post",
			rpath: post.rpath,
			profile: parsedProfile,
			tags: post.data.tags,
			post,
		});
	});

	await Promise.all(
		parsedLinks.map(async (link) => {
			const reader = readerMap.get(link.data.ref.did);
			if (!reader) {
				const reader = await RepoReader.init(link.data.ref.did);
				readerMap.set(link.data.ref.did, reader);
			}
		}),
	);

	await Promise.all(
		parsedLinks.map(async (link) => {
			try {
				const reader = readerMap.get(link.data.ref.did);
				if (!reader) return;
				if (cachedPost.has(link.data.ref.rpath)) {
					const post = cachedPost.get(link.data.ref.rpath);
					if (!post) return;
					const profile = cachedProfile.get(link.data.ref.did);
					if (!profile) return;
					feed.add({
						type: "link",
						rpath: link.rpath,
						tags: link.data.tags,
						post,
						profile,
					});
					return;
				}
				const [post, profile] = await Promise.all([
					reader.getRecord(link.data.ref.rpath),
					reader.getRecord("polka.profile/self"),
				]);
				const parsedPost = validatePosts([post]);
				const parsedProfile = validateProfile(profile);
				if (!parsedPost || !parsedProfile) return;
				feed.add({
					type: "link",
					rpath: link.rpath,
					tags: link.data.tags,
					post: parsedPost[0],
					profile: parsedProfile,
				});
			} catch {
				return [];
			}
		}),
	);

	return {
		did,
		ownerProfile: parsedProfile,
		feed: [...feed],
	};
};
