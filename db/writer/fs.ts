import { join } from "node:path";
import { sha256 as createHash } from "@noble/hashes/sha2.js";
import { CID } from "multiformats";
import * as Digest from "multiformats/hashes/digest";
import {
	type BlockStoreWriter,
	CidNotFound,
	SHA2_256,
	UnsupportedHash,
} from ".";

export interface FileSystem {
	mkdir(path: string, options?: { recursive?: boolean }): void;
	readFile(path: string): Uint8Array;
	writeFile(path: string, data: Uint8Array, options?: { flag?: string }): void;
}

export class FsWriter implements BlockStoreWriter {
	private path: string;
	private fs: FileSystem;

	constructor(path: string, fs: FileSystem) {
		this.path = path;
		this.fs = fs;
	}

	create(): void {
		this.fs.mkdir(this.path, { recursive: true });
	}

	open(): void {
		this.fs.readFile(join(this.path, "root"));
	}

	readBlock(cid: CID, out: Uint8Array[]): void {
		const data = this.fs.readFile(join(this.path, cid.toString()));
		if (!data) throw new CidNotFound();
		out.length = 0;
		out.push(data);
	}

	writeBlock(codec: number, hash: number, contents: Uint8Array): Uint8Array {
		if (hash !== SHA2_256) {
			throw new UnsupportedHash(hash);
		}
		const digest = createHash(contents);
		const encoded = Digest.create(SHA2_256, digest);
		const cid = CID.create(1, codec, encoded);
		this.fs.writeFile(join(this.path, cid.toString()), contents);
		return cid.bytes;
	}

	saveRoots(newRoots: CID[]): void {
		if (!newRoots[0]) throw new Error("No root");
		this.fs.writeFile(join(this.path, "root"), newRoots[0].bytes);
	}

	getRoots(): CID[] {
		return [CID.decode(this.fs.readFile(join(this.path, "root")))];
	}
}
