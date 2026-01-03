import { parseDidKey, secp256k1Plugin } from "@atproto/crypto";
import { schnorr } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { SimplePool, serializeEvent } from "nostr-tools";
import { hexToBytes, utf8Encoder } from "nostr-tools/utils";
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
				const pk = secp256k1Plugin.compressPubkey(parseDidKey(didKey).keyBytes);
				const eventHash = sha256(utf8Encoder.encode(serializeEvent(rest)));
				const verified = schnorr.verify(
					hexToBytes(sig),
					eventHash,
					pk.slice(1),
				);
				if (!verified) return;
				onEvent(ad.data);
			},
		},
	);
}
