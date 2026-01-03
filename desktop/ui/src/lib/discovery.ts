import { parseDidKey, secp256k1Plugin } from "@atproto/crypto";
import { schnorr } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { resolve } from "@polka/db/identity";
import { SimplePool, serializeEvent } from "nostr-tools";
import { hexToBytes, utf8Encoder } from "nostr-tools/utils";
import { type Ad, adSchema } from "../types";

export function subscribe(onEvent: (event: Ad) => void) {
	const pool = new SimplePool();
	pool.subscribe(
		["wss://yabu.me/"],
		{
			kinds: [25565],
		},
		{
			onevent: async (event) => {
				const ad = adSchema.safeParse(JSON.parse(event.content));
				if (!ad.success) return;
				const did = ad.data.did;
				const doc = await resolve(did);
				if (!doc) return;
				const didKey = doc.didKey;
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
	return () => pool.close(["wss://yabu.me/"]);
}
