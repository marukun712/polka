import z from "zod";

export const EventSchema = z.object({
	id: z.string().describe("イベントのSHA256ハッシュ"),
	timestamp: z.date().describe("タイムスタンプ"),
	sig: z.string().describe("署名"),
	body: z.record(z.string(), z.any()),
});

export type Event = z.infer<typeof EventSchema>;
