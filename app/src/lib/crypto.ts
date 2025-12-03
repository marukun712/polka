import { Secp256k1Keypair } from "@atproto/crypto";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";
import SecretStore from "./store.js";

const store = new SecretStore();

export async function setupCrypto() {
	let sk = store.get();
	if (!sk) {
		const { sk } = await generate();
		store.set(sk);
	}
	sk = store.get();
	return sk;
}

export const getDid = async () => {
	const sk = store.get();
	if (!sk) throw new Error("Failed to get sk.");
	const keypair = await Secp256k1Keypair.import(sk);
	return keypair.did();
};

export function sign(bytes: Uint8Array): Uint8Array {
	const sk = store.get();
	if (!sk) throw new Error("Failed to get sk.");
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
