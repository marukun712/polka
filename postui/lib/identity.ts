import { generate } from "./crypto";

export async function generateDidDocument(did: string) {
	const keyPair = await generate();
	const pkMultiHash = keyPair.did.split(":").pop();
	console.log(pkMultiHash, keyPair.sk);
	return {
		"@context": [
			"https://www.w3.org/ns/did/v1",
			"https://w3id.org/security/suites/jws-2020/v1",
		],
		id: did,
		verificationMethod: [
			{
				id: `${did}#keys-1`,
				type: "Ed25519VerificationKey2020",
				publicKeyMultibase: pkMultiHash,
			},
		],
		assertionMethod: [`${did}#keys-1`],
	};
}
