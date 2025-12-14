import { z } from "zod";

export type FeedItem = {
	type: "post" | "link";
	profile: Profile;
	tags: string[];
	post: Post;
};

export const refSchema = z.object({
	did: z.string().min(1),
	rpath: z.string().min(1),
});

export const profileSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		icon: z.string(),
		banner: z.string().optional(),
		followsCount: z.number(),
		updatedAt: z.iso.datetime(),
	})
	.strict();

export const postDataSchema = z.object({
	content: z.string().min(1),
	tags: z.string().array(),
	updatedAt: z.iso.datetime(),
});

export const postSchema = z
	.object({
		rpath: z.string(),
		data: postDataSchema,
	})
	.strict();

export const linkDataSchema = z.object({
	ref: refSchema,
	tags: z.string().array(),
	updatedAt: z.iso.datetime(),
});

export const linkSchema = z
	.object({
		rpath: z.string(),
		data: linkDataSchema,
	})
	.strict();

export type Profile = z.infer<typeof profileSchema>;
export type Post = z.infer<typeof postSchema>;
export type PostData = z.infer<typeof postDataSchema>;
export type Link = z.infer<typeof linkSchema>;
export type LinkData = z.infer<typeof linkDataSchema>;
export type Ref = z.infer<typeof refSchema>;
