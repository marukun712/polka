import { P256Keypair, verifySignature } from "@atproto/crypto";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";

export const did = "did:key:zDnaeWpCx8wFSFwcSifye3r1NSLsgenutZnTxhEaB3tBjUT6H";

export function sign(sk: string, bytes: Uint8Array) {
	return P256Keypair.import(hexToBytes(sk)).then((kp) => kp.sign(bytes));
}

export function verify(
	did: string,
	message: Record<string, unknown>,
	sig: string,
) {
	const sigBytes = hexToBytes(sig);
	const bytes = new TextEncoder().encode(JSON.stringify(message));
	return verifySignature(did, bytes, sigBytes);
}

export async function generate() {
	const keypair = await P256Keypair.create({ exportable: true });
	const sk = await keypair.export();
	return {
		did: keypair.did(),
		sk: bytesToHex(sk),
	};
}
