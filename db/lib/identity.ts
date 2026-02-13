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
	const signKeys = new Set(res.didDocument.assertionMethod);
	const services = res.didDocument.service;
	const keys = keyring?.filter((k) => signKeys.has(k.id));
	if (!keys) return null;
	const formatted = keys.map((k) => `did:key:${k.publicKeyMultibase}`);
	const serviceEndpoint = services?.find(
		(s) => s.id === `${did}#polka`,
	)?.serviceEndpoint;
	if (!serviceEndpoint || typeof serviceEndpoint !== "string") return null;
	const url = new URL(serviceEndpoint);
	if (!url.protocol.startsWith("https:")) {
		throw new Error("Only https:// is allowed");
	}
	return {
		keys: formatted,
		serviceEndpoint,
	};
}
