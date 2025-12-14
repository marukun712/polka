import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { decode, encode } from "@ipld/dag-cbor";
import { CID } from "multiformats";
import type { Repo } from "../public/interfaces/polka-repository-repo.js";
import { instantiate } from "../public/repo.js";
import { ReadOnlyStore } from "./blockstore.js";
import { resolve } from "./identity.js";

const loader = async (path: string) => {
	const buf = await fetch(`/${path}`);
	return await WebAssembly.compile(new Uint8Array(await buf.arrayBuffer()));
};

export class RepoReader {
	repo: Repo;
	store: ReadOnlyStore;
	did: string;

	constructor(repo: Repo, store: ReadOnlyStore, did: string) {
		this.repo = repo;
		this.store = store;
		this.did = did;
	}

	static async init(did: string) {
		const doc = await resolve(did);
		const path = doc.target;
		const res = await fetch(path, { cache: "no-store" });
		const file = await res.arrayBuffer();
		const store = new ReadOnlyStore(new Uint8Array(file));
		store.updateIndex();

		const wasm = await instantiate(loader, {
			// @ts-expect-error
			"polka:repository/crypto": {
				sign: () => {
					throw new Error("Not implemented");
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
				writeBlock: () => {
					throw new Error("Not implemented");
				},
			},
			...new WASIShim().getImportObject<"0.2.6">(),
		});

		const roots = store.getRoots();
		if (!roots[0]) throw new Error("Root not found.");
		const repo = wasm.repo.open(doc.didKey, roots[0].toString());
		return new RepoReader(repo, store, did);
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

	public getCommitToVerify() {
		const out: Uint8Array[] = [];
		const root = this.repo.getRoot();
		this.store.readBlock(CID.parse(root), out);
		const decoded = decode(out[0]) as {
			sig: Uint8Array;
			unsigned: Record<string, unknown>;
		};
		const { sig, ...unsignedData } = decoded;
		const bytes = encode(unsignedData);
		return { sig, bytes };
	}

	public getDid() {
		return this.did;
	}
}
