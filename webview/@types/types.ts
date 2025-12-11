import { z } from "zod";

export const profileSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		icon: z.string(),
	})
	.strict();

export const postDataSchema = z.object({
	content: z.string().min(1),
	links: z.array(z.string().min(1)).optional(),
});

export const postSchema = z
	.object({
		rpath: z.string(),
		data: postDataSchema,
	})
	.strict();

export type Profile = z.infer<typeof profileSchema>;
export type Post = z.infer<typeof postSchema>;
export type PostData = z.infer<typeof postDataSchema>;
