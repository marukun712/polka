import { verifySignature } from "@atproto/crypto";
import { SimplePool } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";
import { type Ad, adSchema } from "../types";
import { resolve } from "./identity";

export function subscribe(onEvent: (event: Ad) => void) {
	const pool = new SimplePool();
	pool.subscribe(
		["ws://localhost:7777"],
		{
			kinds: [25565],
		},
		{
			onevent: async (event) => {
				const ad = adSchema.safeParse(JSON.parse(event.content));
				if (!ad.success) return;
				const did = ad.data.did;
				let didKey: string;
				try {
					didKey = (await resolve(did)).didKey;
				} catch (e) {
					console.error(e);
					return;
				}
				const { sig, ...rest } = event;
				const verified = verifySignature(
					didKey,
					new TextEncoder().encode(JSON.stringify(rest)),
					hexToBytes(sig),
				);
				if (!verified) return;
				onEvent(ad.data);
			},
		},
	);
}
