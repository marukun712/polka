import { Resolver } from "did-resolver";
import { getResolver } from "web-did-resolver";
import { RepoReader } from "./client";

const webResolver = getResolver();

const didResolver = new Resolver({
	...webResolver,
});

export async function resolve(did: string) {
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
		doc: res.didDocument,
	};
}

export async function resolveRecord(did: string, rpath: string) {
	try {
		const client = await RepoReader.init(did);
		return client.getRecord(rpath);
	} catch (e) {
		console.log(e);
		return null;
	}
}
