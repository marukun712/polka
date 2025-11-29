import {
	accessSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { sha256 as createHash } from "@noble/hashes/sha2.js";
import { CID } from "multiformats";
import * as Digest from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";
import { NextToLast, type ShardingStrategy } from "./sharding.js";

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
export class FsBlockStoreSync {
	private path: string;
	private shardingStrategy: ShardingStrategy;

	constructor(path: string) {
		this.shardingStrategy = new NextToLast();
		if (existsSync(path)) {
			this.path = path;
			accessSync(this.path);
		} else {
			this.path = path;
			mkdirSync(this.path);
		}
	}

	static new(path: string): FsBlockStoreSync {
		return new FsBlockStoreSync(path);
	}

	contains(cid: CID): boolean {
		const { dir, file } = this.shardingStrategy.encode(cid);
		return existsSync(join(this.path, dir, file));
	}

	readBlock(cid: CID, out: Uint8Array[]): void {
		const { dir, file } = this.shardingStrategy.encode(cid);
		const data = readFileSync(join(this.path, dir, file));
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
		const { dir, file } = this.shardingStrategy.encode(cid);
		mkdirSync(join(this.path, dir), { recursive: true });
		writeFileSync(join(this.path, dir, file), contents);
		return cid.bytes;
	}
}

const store = new FsBlockStoreSync("./store/blocks");

export function readBlock(cid: Uint8Array) {
	const parsed = CID.decode(cid);
	const out: Uint8Array[] = [];
	store.readBlock(parsed, out);
	return out[0];
}

export function writeBlock(codec: number, hash: number, contents: Uint8Array) {
	return store.writeBlock(Number(codec), Number(hash), contents);
}
