import type { Repo } from "../dist/transpiled/interfaces/polka-repository-repo.js";
import { repo as wasm } from "../dist/transpiled/repo.js";
import { CarSyncStore } from "./blockstore.js";
import { generate } from "./crypto.js";

let store: CarSyncStore;

async function generateDidDocument(did: string) {
	const key = await generate();
	return {
		"@context": [
			"https://www.w3.org/ns/did/v1",
			"https://w3id.org/security/suites/jws-2020/v1",
		],
		id: did,
		authentication: [key.did],
		service: [
			{
				id: `${did}#polkaRepo`,
				type: "polkaRepo",
				serviceEndpoint: "https://bar.example.com",
			},
		],
	};
}

export class Client {
	repo: Repo;
	bs: CarSyncStore;

	constructor(did: string) {
		const doc = generateDidDocument(did);
		this.repo = wasm.open(did, root);
		store = new CarSyncStore(path, []);
		this.bs = store;
	}

	public getRecord(rpath: string) {
		return this.repo.getRecord(rpath);
	}

	public getRecords(nsid: string) {
		return this.repo.getRecords(nsid);
	}

	public allRecords() {
		return this.repo.allRecords();
	}
}
