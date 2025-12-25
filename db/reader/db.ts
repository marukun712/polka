import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { CID } from "multiformats";
import type { Repo } from "../dist/transpiled/interfaces/polka-repository-repo";
import { instantiate } from "../dist/transpiled/repo";
import type { BlockStoreReader } from ".";

// WASMのロード
const loader = async (path: string) => {
	const buf = await fetch(`./dist/transpiled/${path}`);
	return await WebAssembly.compile(new Uint8Array(await buf.arrayBuffer()));
};

export class DBReader {
	private repo: Repo;
	store: BlockStoreReader;

	constructor(repo: Repo, store: BlockStoreReader) {
		this.repo = repo;
		this.store = store;
	}

	getRecord(rpath: string) {
		return this.repo.getRecord(rpath);
	}

	getRecords(nsid: string) {
		return this.repo.getRecords(nsid);
	}

	getCid(rpath: string) {
		return this.repo.getCid(rpath);
	}

	getRoot() {
		return this.repo.getRoot();
	}

	allRecords() {
		return this.repo.allRecords();
	}

	static async open(pk: string, store: BlockStoreReader) {
		// importする関数をバインド
		const wasm = await instantiate(loader, {
			// @ts-expect-error
			"polka:repository/blockstore": {
				readBlock: (cid: Uint8Array) => {
					const parsed = CID.decode(cid);
					const out: Uint8Array[] = [];
					store.readBlock(parsed, out);
					if (!out[0]) throw new Error("Block not found.");
					return out[0];
				},
			},
			...new WASIShim().getImportObject<"0.2.6">(),
		});

		store.open();
		const roots = store.getRoots();
		if (!roots[0]) throw new Error("Root not found.");
		return new DBReader(wasm.repo.open(pk, roots[0].toString()), store);
	}
}
