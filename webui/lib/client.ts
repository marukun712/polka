import type { Repo } from "../dist/transpiled/interfaces/polka-repository-repo.js";
import { repo as wasm } from "../dist/transpiled/repo.js";
import { CarSyncStore } from "./blockstore.js";
import { resolve } from "./identity.js";

let store: CarSyncStore;

export class Client {
	repo: Repo;

	constructor(repo: Repo) {
		this.repo = repo;
	}

	static async init(did: string) {
		const doc = await resolve(did);
		const path = doc.target;
		const res = await fetch(path);
		const file = await res.arrayBuffer();
		store = new CarSyncStore(new Uint8Array(file));
		store.updateIndex();
		const roots = store.getRoots();
		if (!roots[0]) throw new Error("Root not found.");
		const repo = wasm.open(doc.didKey, roots[0].toString());
		return new Client(repo);
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
