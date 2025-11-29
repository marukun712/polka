import z from "zod";

export const initRepoSchema = z
	.object({
		sig: z.string().optional(),
	})
	.strict();

export const getCidSchema = z
	.object({
		rpath: z.string(),
	})
	.strict();

export const getRecordSchema = z
	.object({
		rpath: z.string(),
	})
	.strict();

export const getRecordsSchema = z
	.object({
		nsid: z.string(),
	})
	.strict();
