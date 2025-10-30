import z from "zod";

export const EventSchema = z.object({
	id: z.string().describe("イベントのSHA256ハッシュ"),
	collection: z.string().describe("イベントの種類を識別するための一意な文字列"),
	timestamp: z.date().describe("タイムスタンプ"),
	pk: z.string().describe("署名検証用の公開鍵"),
	sig: z.string().describe("署名"),
	body: z.record(z.string(), z.any()),
});

export type Event = z.infer<typeof EventSchema>;
