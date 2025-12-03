import { type DIDDocument, Resolver } from "did-resolver";
import { getResolver } from "web-did-resolver";
import { generate } from "./crypto";

const webResolver = getResolver();

const didResolver = new Resolver({
	...webResolver,
});

export async function generateDidDocument(
	domain: string,
): Promise<DIDDocument> {
	const did = `did:web:${domain}`;
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
				controller: did,
				type: "Ed25519VerificationKey2020",
				publicKeyMultibase: pkMultiHash,
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

export async function resolve(did: string) {
	const res = await didResolver.resolve(did);
	if (!res.didDocument) throw new Error("Failed to resolve did");
	const method = res.didDocument.assertionMethod;
	const service = res.didDocument.service;
	if (!method || !service) throw new Error("Failed to resolve did");
	const didKey = method[0].toString();
	const domain = new URL(service[0].serviceEndpoint.toString());
	const target = new URL("/polka/repo.car", domain).toString();
	return {
		didKey,
		target,
	};
}
