import type { Repo } from "../dist/transpiled/interfaces/polka-repository-repo.js";
import { repo as wasm } from "../dist/transpiled/repo.js";
import { CarSyncStore } from "./blockstore.js";

export class Client {
	repo: Repo;
	bs: CarSyncStore;

	constructor(path: string, did: string, root: string) {
		this.repo = wasm.open(did, root);
		this.bs = new CarSyncStore(path, []);
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
