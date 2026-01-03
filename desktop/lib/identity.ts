import type { DIDDocument } from "did-resolver";

export function generateDidDocument(domain: string, key: string): DIDDocument {
	const did = `did:web:${domain}`;
	const pkMultiBase = key.split(":").pop();
	return {
		"@context": [
			"https://www.w3.org/ns/did/v1",
			"https://w3id.org/security/suites/jws-2020/v1",
		],
		id: did,
		verificationMethod: [
			{
				id: `${did}#keys-1`,
				controller: did,
				type: "EcdsaSecp256k1Signature2019",
				publicKeyMultibase: pkMultiBase,
			},
		],
		assertionMethod: [`${did}#keys-1`],
		service: [
			{
				id: `${did}#linked-domain`,
				type: "LinkedDomains",
				serviceEndpoint: `https://${domain}`,
			},
		],
	};
}
