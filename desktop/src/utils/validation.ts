import type { z } from "zod";
import type { GetResult } from "../public/interfaces/polka-repository-repo";

export function validateRecord<T>(
	record: GetResult | null,
	schema: z.ZodSchema<T>,
): T | null {
	if (!record) return null;

	try {
		const json = JSON.parse(record.data);
		const parsed = schema.safeParse(json);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function validateRecords<T extends { rpath: string }>(
	records: GetResult[],
	schema: z.ZodSchema<T>,
): T[] {
	return records.flatMap((record) => {
		try {
			const json = JSON.parse(record.data);
			const parsed = schema.safeParse({ rpath: record.rpath, data: json });
			return parsed.success ? [parsed.data] : [];
		} catch {
			return [];
		}
	});
}
