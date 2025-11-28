import { Secp256k1Keypair } from "@atproto/crypto";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

export const did = "did:key:zQ3shRoxb39Z5A6Eu16CyjmbTp41RrKLJGb3myyASgxk2Ty95";
const sk = "51948cad41be471b30a280714512160dd6d5400beb24f5a496f2b5faf0c9c933";
// 実際はnos2xなどのセキュアな場所に保存する。
// 秘密鍵の無断使用は、罰金バッキンガムよ！

export function sign(bytes: Uint8Array): Uint8Array {
	const skBytes = hexToBytes(sk);
	const sig = secp256k1.sign(bytes, skBytes);
	return sig;
}

export async function generate() {
	const keypair = await Secp256k1Keypair.create({ exportable: true });
	const skExported = await keypair.export();
	return {
		did: keypair.did(),
		pk: keypair.publicKeyStr(),
		sk: bytesToHex(skExported),
	};
}
console.log(await generate());
