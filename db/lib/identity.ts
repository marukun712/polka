import { Resolver } from "did-resolver";
import { getResolver } from "web-did-resolver";

const webResolver = getResolver();

const didResolver = new Resolver({
	...webResolver,
});

export async function resolve(did: string) {
	const res = await didResolver.resolve(did);
	if (!res.didDocument) return null;
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
		return null;
	const didPtr = method[0].toString();
	const multiHash = keyring.find((key) => key.id === didPtr);
	if (!multiHash) return null;
	const didKey = `did:key:${multiHash.publicKeyMultibase}`;
	const linked = new URL(service[0].serviceEndpoint.toString());
	const target = new URL("/polka/dist/", linked).toString();
	if (!linked.protocol.startsWith("https:")) {
		throw new Error("Only https:// is allowed");
	}
	return {
		didKey,
		target,
	};
}
