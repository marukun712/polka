import { createHash } from "node:crypto";
import { CID } from "multiformats";
import * as Digest from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";

export const SHA2_256 = sha256.code;

export class CidNotFound extends Error {
	constructor() {
		super("CID not found");
	}
}

export class UnsupportedHash extends Error {
	constructor(code: number) {
		super(`Unsupported hash code: ${code}`);
	}
}

export type ErrorType = CidNotFound | UnsupportedHash;
export class MemoryBlockStore {
	private blocks: Map<CID, Uint8Array>;

	constructor() {
		this.blocks = new Map();
	}

	static new(): MemoryBlockStore {
		return new MemoryBlockStore();
	}

	contains(cid: CID): boolean {
		return this.blocks.has(cid);
	}

	readBlock(cid: CID, out: Uint8Array[]): void {
		const data = this.blocks.get(cid);
		if (!data) throw new CidNotFound();
		out.length = 0;
		out.push(data);
	}

	writeBlock(codec: number, hash: number, contents: Uint8Array): Uint8Array {
		if (hash !== SHA2_256) {
			throw new UnsupportedHash(hash);
		}
		const digest = createHash("sha256").update(contents).digest();
		const encoded = Digest.create(SHA2_256, digest);
		const cid = CID.create(1, codec, encoded);
		this.blocks.set(cid, Uint8Array.from(contents));
		return cid.bytes;
	}
}

const store = new MemoryBlockStore();

export function readBlock(cid: Uint8Array) {
	const parsed = CID.decode(cid);
	const out: Uint8Array[] = [];
	store.readBlock(parsed, out);
	return out;
}

export function writeBlock(codec: number, hash: number, contents: Uint8Array) {
	return store.writeBlock(Number(codec), Number(hash), contents);
}
