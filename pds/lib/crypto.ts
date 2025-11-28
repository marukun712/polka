import { Secp256k1Keypair } from "@atproto/crypto";
import * as secp from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";

export const did = "did:key:zQ3shehrace57qo1Pkw5eRYEAWhMFUzcNWnNUfh11nkAVHTEW";
const sk = "c1380caaff06e49641718a755273fac718fe02cba22532aaab78aacc324ae2f5";
// 実際はnos2xなどのセキュアな場所に保存する。
// 秘密鍵の無断使用は、罰金バッキンガムよ！

export function sign(bytes: Uint8Array) {
	const skBytes = hexToBytes(sk);
	return secp.secp256k1.sign(bytes, skBytes);
}

async function generate() {
	const keypair = await Secp256k1Keypair.create({ exportable: true });
	const sk = await keypair.export();
	return {
		did: keypair.did(),
		pk: keypair.publicKeyStr(),
		sk: bytesToHex(sk),
	};
}
console.log(await generate());
