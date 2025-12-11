import { z } from "zod";

export const profileSchema = z.object({
	name: z.string(),
	description: z.string(),
	icon: z.string(),
});

export const postSchema = z.object({
	rpath: z.string(),
	data: z.object({ content: z.string() }),
});

export type Profile = z.infer<typeof profileSchema>;
export type Post = z.infer<typeof postSchema>;
