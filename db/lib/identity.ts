import { Resolver } from "did-resolver";
import { getResolver } from "web-did-resolver";

const webResolver = getResolver();

const didResolver = new Resolver({
	...webResolver,
});

export async function resolve(didWithKid: string) {
	const did = didWithKid.split("#")[0];
	if (!did) throw new Error("Invalid input");
	const res = await didResolver.resolve(did);
	if (!res.didDocument) return null;
	const keyring = res.didDocument.verificationMethod;
	const services = res.didDocument.service;
	const multiHash = keyring?.find((key) => key.id === didWithKid);
	if (!multiHash) return null;
	const didKey = `did:key:${multiHash.publicKeyBase58}`;
	const service = services?.find(
		(s) => s.id === `${did}#polka`,
	)?.serviceEndpoint;
	if (!service || typeof service !== "string") return null;
	const url = new URL(service);
	if (!url.protocol.startsWith("https:")) {
		throw new Error("Only https:// is allowed");
	}
	return {
		didKey,
		service,
	};
}
