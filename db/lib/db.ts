import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { CID } from "multiformats";
import { instantiate } from "../dist/transpiled/repo";
import type { BlockStore } from "../store";

// WASMのロード
const loader = async (path: string) => {
	const buf = await fetch(`./dist/transpiled/${path}`);
	return await WebAssembly.compile(new Uint8Array(await buf.arrayBuffer()));
};

export async function create(
	pk: string,
	store: BlockStore,
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
	return { repo, store };
}

export async function open(
	pk: string,
	store: BlockStore,
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
	return { repo: wasm.repo.open(pk, roots[0].toString()), store };
}
