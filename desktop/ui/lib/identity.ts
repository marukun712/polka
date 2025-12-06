import { type DIDDocument, Resolver } from "did-resolver";
import { getResolver } from "web-did-resolver";
import { Client } from "./client";

const webResolver = getResolver();

const didResolver = new Resolver({
	...webResolver,
});

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
				type: "Ed25519VerificationKey2020",
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

export async function resolve(domain: string) {
	const did = `did:web:${domain}`;
	const res = await didResolver.resolve(did);
	if (!res.didDocument) throw new Error("Failed to resolve did");
	const keyring = res.didDocument.verificationMethod;
	const method = res.didDocument.assertionMethod;
	const service = res.didDocument.service;
	if (
		!keyring ||
		!method ||
		!service ||
		!keyring[0] ||
		!method[0] ||
		!service[0]
	)
		throw new Error("Failed to resolve did");
	const didPtr = method[0].toString();
	const multiHash = keyring.find((key) => key.id === didPtr);
	if (!multiHash) throw new Error("Failed to resolve did");
	const didKey = `did:key:${multiHash.publicKeyMultibase}`;
	const linked = new URL(service[0].serviceEndpoint.toString());
	const target = new URL("/polka/repo.car", linked).toString();
	return {
		didKey,
		target,
	};
}

export async function resolveRecord(did: string, rpath: string) {
	const client = await Client.init(did);
	return client.getRecord(rpath);
}
