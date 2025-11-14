import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";

export function signMessage(sk: string, message: Record<string, unknown>) {
	const skBytes = hexToBytes(sk);
	const bytes = Buffer.from(JSON.stringify(message));
	const sig = ed25519.sign(bytes, skBytes);
	return bytesToHex(sig);
}

export function verifySignature(
	pk: string,
	message: Record<string, unknown>,
	sig: string,
) {
	const pkBytes = hexToBytes(pk);
	const sigBytes = hexToBytes(sig);
	const bytes = Buffer.from(JSON.stringify(message));
	return ed25519.verify(sigBytes, bytes, pkBytes);
}
