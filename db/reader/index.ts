import type { CID } from "multiformats";
import { sha256 } from "multiformats/hashes/sha2";

export interface BlockStoreReader {
	open(): void;

	readBlock(cid: CID, out: Uint8Array[]): void;

	getRoots(): CID[];
}

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

export * from "./car";
export * from "./db";
export * from "./fs";
