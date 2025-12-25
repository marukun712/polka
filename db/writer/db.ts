import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { CID } from "multiformats";
import type { Repo } from "../dist/transpiled/interfaces/polka-repository-repo";
import { instantiate } from "../dist/transpiled/repo";
import type { BlockStoreWriter } from ".";

// WASMのロード
const loader = async (path: string) => {
	const buf = await fetch(`./dist/transpiled/${path}`);
	return await WebAssembly.compile(new Uint8Array(await buf.arrayBuffer()));
};

export class DBWriter {
	private repo: Repo;
	private store: BlockStoreWriter;

	constructor(repo: Repo, store: BlockStoreWriter) {
		this.repo = repo;
		this.store = store;
	}

	create(rpath: string, data: string) {
		this.repo.create(rpath, data);
		const root = this.repo.getRoot();
		this.store.saveRoots([CID.parse(root)]);
	}

	update(rpath: string, data: string) {
		console.log(rpath, data);
		this.repo.update(rpath, data);
		const root = this.repo.getRoot();
		this.store.saveRoots([CID.parse(root)]);
	}

	delete(rpath: string) {
		console.log(rpath);
		this.repo.delete(rpath);
		const root = this.repo.getRoot();
		this.store.saveRoots([CID.parse(root)]);
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

	saveRoots(cids: CID[]) {
		this.store.saveRoots(cids);
	}

	static async init(
		pk: string,
		store: BlockStoreWriter,
		sign: (bytes: Uint8Array) => Uint8Array,
	) {
		// importする関数をバインド
		const wasm = await instantiate(loader, {
			//@ts-expect-error
			"polka:repository/crypto": {
				sign: (bytes: Uint8Array) => {
					const sig = sign(bytes);
					return sig;
				},
			},
			"polka:repository/blockstore": {
				readBlock: (cid: Uint8Array) => {
					const parsed = CID.decode(cid);
					const out: Uint8Array[] = [];
					store.readBlock(parsed, out);
					if (!out[0]) throw new Error("Block not found.");
					return out[0];
				},
				writeBlock: (codec: bigint, hash: bigint, contents: Uint8Array) => {
					return store.writeBlock(Number(codec), Number(hash), contents);
				},
			},
			...new WASIShim().getImportObject<"0.2.6">(),
		});

		store.create();
		const repo = wasm.repo.create(pk);
		const root = repo.getRoot();
		store.saveRoots([CID.parse(root)]);
		return new DBWriter(repo, store);
	}

	static async open(
		pk: string,
		store: BlockStoreWriter,
		sign: (bytes: Uint8Array) => Uint8Array,
	) {
		// importする関数をバインド
		const wasm = await instantiate(loader, {
			//@ts-expect-error
			"polka:repository/crypto": {
				sign: (bytes: Uint8Array) => {
					const sig = sign(bytes);
					return sig;
				},
			},
			"polka:repository/blockstore": {
				readBlock: (cid: Uint8Array) => {
					const parsed = CID.decode(cid);
					const out: Uint8Array[] = [];
					store.readBlock(parsed, out);
					if (!out[0]) throw new Error("Block not found.");
					return out[0];
				},
				writeBlock: (codec: bigint, hash: bigint, contents: Uint8Array) => {
					return store.writeBlock(Number(codec), Number(hash), contents);
				},
			},
			...new WASIShim().getImportObject<"0.2.6">(),
		});

		store.open();
		const roots = store.getRoots();
		if (!roots[0]) throw new Error("Root not found.");
		return new DBWriter(wasm.repo.open(pk, roots[0].toString()), store);
	}
}
