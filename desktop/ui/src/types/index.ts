import { z } from "zod";

export type Node = { id: string; label: string };

export type Item = {
	type: "post" | "link";
	post: Post;
	did: string;
	links: string[];
};

export const adSchema = z.object({
	did: z.string().min(1),
	bloom: z.string().min(1),
});

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
		updatedAt: z.iso.datetime(),
	})
	.strict();

export const edgeDataSchema = z.object({
	from: z.string().min(1).optional(),
	to: z.string().min(1),
	updatedAt: z.iso.datetime(),
});

export const edgeSchema = z
	.object({
		rpath: z.string(),
		data: edgeDataSchema,
	})
	.strict();

export const postDataSchema = z.object({
	content: z.string().min(1),
	parents: z.string().array(),
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
	parents: z.string().array(),
	updatedAt: z.iso.datetime(),
});

export const linkSchema = z
	.object({
		rpath: z.string(),
		data: linkDataSchema,
	})
	.strict();

export const followDataSchema = z
	.object({
		did: z.string().min(1),
		tag: z.string().min(1),
		updatedAt: z.iso.datetime(),
	})
	.strict();

export const followSchema = z
	.object({
		rpath: z.string(),
		data: followDataSchema,
	})
	.strict();

export type Ad = z.infer<typeof adSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type EdgeData = z.infer<typeof edgeDataSchema>;
export type Ref = z.infer<typeof refSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type PostData = z.infer<typeof postDataSchema>;
export type Post = z.infer<typeof postSchema>;
export type LinkData = z.infer<typeof linkDataSchema>;
export type Link = z.infer<typeof linkSchema>;
export type FollowData = z.infer<typeof followDataSchema>;
export type Follow = z.infer<typeof followSchema>;
