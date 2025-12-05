import { readFileSync, writeFileSync } from "node:fs";
import { decode, encode } from "@ipld/dag-cbor";
import { sha256 as createHash } from "@noble/hashes/sha2.js";
import { CID } from "multiformats";
import * as Digest from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";
import varint from "varint";

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
	private path: string;
	private roots: CID[];
	private index: Map<string, { offset: number; length: number }>;

	constructor(path: string) {
		this.path = path;
		this.roots = [];
		this.index = new Map<string, { offset: number; length: number }>();
	}

	create() {
		// CAR V1 ヘッダー
		const header = {
			version: 1,
			roots: this.roots.map((cid) => cid.bytes),
		}; // DAG-CBORでエンコードする
		const headerEncoded = encode(header);
		// ヘッダーの長さを可変長整数でエンコードする
		const unsignedVarint = varint.encode(headerEncoded.length);
		//ファイルの書き込み
		writeFileSync(this.path, Buffer.from(unsignedVarint));
		writeFileSync(this.path, headerEncoded, { flag: "a" });
	}

	updateIndex() {
		this.index.clear();
		const data: Uint8Array = readFileSync(this.path);
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

	updateHeaderRoots(newRoots: CID[]) {
		this.roots = newRoots;
		// CARヘッダーを再エンコード
		const header = {
			version: 1,
			roots: this.roots.map((cid) => cid.bytes),
		};
		const headerEncoded = encode(header);
		const headerLenVarint = varint.encode(headerEncoded.length);
		// ファイル全体を読み込む
		const data = readFileSync(this.path);
		// 既存ヘッダーの長さを読み取る
		let offset = 0;
		const oldHeaderLen = varint.decode(data, offset);
		if (!varint.decode.bytes) throw new Error("Invalid header length");
		offset += varint.decode.bytes;
		const oldHeaderTotalLen = offset + oldHeaderLen;
		const restOfFile = new Uint8Array(data).slice(oldHeaderTotalLen);
		// 新しいヘッダーを書き込む
		const newHeader = Buffer.concat([
			Buffer.from(headerLenVarint),
			Buffer.from(headerEncoded),
		]);
		// ファイルを上書き
		writeFileSync(this.path, Buffer.concat([newHeader, restOfFile]));
		// indexを更新
		this.updateIndex();
	}

	writeBlock(codec: number, hash: number, contents: Uint8Array): Uint8Array {
		if (hash !== SHA2_256) {
			throw new UnsupportedHash(hash);
		}
		// コンテンツからCIDを算出
		const digest = createHash(contents);
		const encoded = Digest.create(SHA2_256, digest);
		const cid = CID.create(1, codec, encoded);
		// すでに存在するCIDはエラー
		if (this.index.has(cid.toString())) {
			throw new Error("CID already exists");
		}
		// セクションは | varint | CID | contents | の形式で構成される
		const blockBuffer = Buffer.from(contents);
		const cidBuffer = Buffer.from(cid.bytes);
		// ブロック全体の長さを可変長整数でエンコード
		// varintはCID + contentsの長さを表す
		const lengthVarint = varint.encode(blockBuffer.length + cidBuffer.length);
		const varintBuffer = Buffer.from(lengthVarint);
		const fileBuffer = readFileSync(this.path);
		// コンテンツが始まる場所を記録
		const contentOffset =
			fileBuffer.length + lengthVarint.length + cidBuffer.length;
		writeFileSync(this.path, varintBuffer, { flag: "a" });
		writeFileSync(this.path, cidBuffer, { flag: "a" });
		writeFileSync(this.path, blockBuffer, { flag: "a" });
		this.index.set(cid.toString(), {
			offset: contentOffset,
			length: contents.length,
		});
		return cid.bytes;
	}

	readBlock(cid: CID, out: Uint8Array[]) {
		// indexからブロックの開始バイトを取得
		const block = this.index.get(cid.toString());
		if (!block) {
			throw new CidNotFound();
		}
		out.length = 0;
		const data = readFileSync(this.path);
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
