import { decode } from "@ipld/dag-cbor";
import { sha256 as createHash } from "@noble/hashes/sha2.js";
import { CID } from "multiformats";
import * as Digest from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";
import varint from "varint";
import { store } from "./client";

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

// ATProtoはCAR v1を使っているらしいので、v1を使うことにするCAR
export class CarSyncStore {
	private file: Uint8Array;
	private roots: CID[];
	private index: Map<string, { offset: number; length: number }>;

	constructor(file: Uint8Array) {
		this.file = file;
		this.roots = [];
		this.index = new Map<string, { offset: number; length: number }>();
	}

	updateIndex() {
		this.index.clear();
		const data: Uint8Array = this.file;
		let offset = 0;

		// ヘッダー長を読み取る
		const headerLen = varint.decode(data, offset);
		if (!varint.decode.bytes) {
			throw new Error("Invalid header length");
		}
		offset += varint.decode.bytes;

		// ヘッダー本体を読み取る
		const headerBytes = data.slice(offset, offset + headerLen);
		offset += headerLen;
		const header: { version: number; roots: Uint8Array[] } =
			decode(headerBytes);
		this.roots = header.roots.map((r: Uint8Array) => CID.decode(r));

		while (offset < data.length) {
			// ブロック長
			const blockLen = varint.decode(data, offset);
			if (!varint.decode.bytes) {
				throw new Error("Invalid header length");
			}
			offset += varint.decode.bytes;
			// CID
			const slice = data.subarray(offset);
			const [cid, remainder] = CID.decodeFirst(slice);
			// 読み取った CID の長さだけ offset を進める
			offset += slice.length - remainder.length;
			// ブロック内容を取り出す
			const contentLen = blockLen - cid.bytes.length;
			const content = remainder.subarray(0, contentLen);
			// SHA-256検証
			if (cid.multihash.code === 0x12) {
				const digest = createHash(content);
				const encoded = Digest.create(SHA2_256, digest);
				const expectedCid = CID.create(1, cid.code, encoded);
				if (!cid.equals(expectedCid)) {
					throw new Error("Invalid block hash");
				}
			}
			// index登録
			this.index.set(cid.toString(), { offset, length: contentLen });
			offset += contentLen;
		}
	}

	readBlock(cid: CID, out: Uint8Array[]) {
		// indexからブロックの開始バイトを取得
		const block = this.index.get(cid.toString());
		if (!block) {
			throw new CidNotFound();
		}
		out.length = 0;
		const data = this.file;
		const content = new Uint8Array(data).slice(
			block.offset,
			block.offset + block.length,
		);
		out.push(content);
	}

	getRoots() {
		return this.roots;
	}
}

export function readBlock(cid: Uint8Array) {
	if (!store) {
		throw new Error("Store is not initialized");
	}
	const parsed = CID.decode(cid);
	const out: Uint8Array[] = [];
	store.readBlock(parsed, out);
	return out[0];
}

export function writeBlock(
	_codec: number,
	_hash: number,
	_contents: Uint8Array,
) {
	throw new Error("Not implemented");
}
