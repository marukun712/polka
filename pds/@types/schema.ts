import z from "zod";

export const getRecordSchema = z.object({
	rpath: z.string(),
});

export const createRecordSchema = z.object({
	nsid: z.string(),
	body: z.string(),
});

export const commitSchema = z.object({
	sig: z.string(),
	payload: z.object({
		did: z.string(),
		version: z.bigint(),
		data: z.string(),
		rev: z.string(),
	}),
});
