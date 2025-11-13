import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { http } from "@libp2p/http";
import { tcp } from "@libp2p/tcp";
import { multiaddr } from "@multiformats/multiaddr";
import { createLibp2p } from "libp2p";

const node = await createLibp2p({
	transports: [tcp()],
	connectionEncrypters: [noise()],
	streamMuxers: [yamux()],
	services: { http: http() },
});

function fetch(
	addr: string,
	path: string,
	method: string,
	body?: Record<string, unknown>,
) {
	const parsed = multiaddr(addr);
	return node.services.http
		.fetch(parsed.encapsulate(path), {
			method,
			body: body ? JSON.stringify(body) : undefined,
		})
		.then(async (r) => JSON.parse(await r.text()));
}

export async function getRecords(addr: string, nsid: string) {
	return fetch(addr, "GET", `/records?nsid=${nsid}`);
}

export async function getRecord(addr: string, rpath: string) {
	return fetch(addr, "GET", `/record/${rpath}/get`);
}

export async function createRecord(
	addr: string,
	nsid: string,
	body: string,
	sig: string,
) {
	return fetch(addr, "POST", "/record", { nsid, body, sig });
}

export async function updateRecord(
	addr: string,
	rpath: string,
	body: string,
	sig: string,
) {
	return fetch(addr, "PUT", `/record/${rpath}`, { body, sig });
}

export async function deleteRecord(
	addr: string,
	rpath: string,
	rkey: string,
	sig: string,
) {
	return fetch(addr, "DELETE", `/record/${rpath}`, { rkey, sig });
}
