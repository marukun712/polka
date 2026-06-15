import type { GetResult } from "@polka/db/types";
import type { z } from "zod";

export function validateRecord<T>(
	record: GetResult | null,
	schema: z.ZodSchema<T>,
): T | null {
	if (!record) return null;
	try {
		const parsed = schema.safeParse(record.data);
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
			const parsed = schema.safeParse({
				rpath: record.rpath,
				data: record.data,
			});
			return parsed.success ? [parsed.data] : [];
		} catch {
			return [];
		}
	});
}
