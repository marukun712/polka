import z from "zod";

export const initRepoSchema = z
	.object({
		sig: z.string().optional(),
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

export const createRecordSchema = z
	.object({
		nsid: z.string(),
		body: z.string(),
		sig: z.string().optional(),
	})
	.strict();

export const updateRecordSchema = z
	.object({
		rpath: z.string(),
		body: z.string(),
		sig: z.string().optional(),
	})
	.strict();

export const deleteRecordSchema = z
	.object({
		rpath: z.string(),
		sig: z.string().optional(),
	})
	.strict();
