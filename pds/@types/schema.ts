import z from "zod";

export const initRepoSchema = z.object({
	sig: z.string().optional(),
});

export const getRecordSchema = z.object({
	rpath: z.string(),
});

export const createRecordSchema = z.object({
	nsid: z.string(),
	body: z.string(),
	sig: z.string().optional(),
});

export const updateRecordSchema = z.object({
	rpath: z.string(),
	body: z.string(),
	sig: z.string().optional(),
});

export const deleteRecordSchema = z.object({
	rpath: z.string(),
	sig: z.string().optional(),
});
