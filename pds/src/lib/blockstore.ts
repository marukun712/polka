import {
	accessSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { decode, encode } from "@ipld/dag-cbor";
import { sha256 as createHash } from "@noble/hashes/sha2.js";
import { CID } from "multiformats";
import * as Digest from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";
import varint from "varint";
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

// ATProtoはCAR v1を使っているらしいので、v1を使うことにするCAR
export class CarSyncStore {
	private path: string;
	private roots: CID[];
	private index: Map<string, { offset: number; length: number }>;

	constructor(path: string, roots: CID[]) {
		this.path = path;
		this.roots = roots;
		this.index = new Map<string, { offset: number; length: number }>();
		if (existsSync(path)) {
			accessSync(this.path);
			this.open();
		} else {
			this.create();
		}
	}

	create() {
		// CAR V1 ヘッダー
		const header = { version: 1, roots: this.roots };
		// DAG-CBORでエンコードする
		const headerEncoded = encode(header);
		// ヘッダーの長さを可変長整数でエンコードする
		const unsignedVarint = varint.encode(headerEncoded.length);
		//ファイルの書き込み
		writeFileSync(this.path, Buffer.from(unsignedVarint));
		writeFileSync(this.path, headerEncoded, { flag: "a" });
	}

	open() {
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

	writeBlock(codec: number, hash: number, contents: Uint8Array): Uint8Array {
		if (hash !== SHA2_256) {
			throw new UnsupportedHash(hash);
		}
		// コンテンツからcidを算出
		const digest = createHash(contents);
		const encoded = Digest.create(SHA2_256, digest);
		const cid = CID.create(1, codec, encoded);
		// そのcidがすでにcarに含まれていればエラー
		if (this.index.has(cid.toString())) {
			throw new Error("CID already exists");
		}
		// cidとコンテンツのbytes
		const buf: Uint8Array = new Uint8Array([...cid.bytes, ...contents]);
		// cid + コンテンツの長さを可変長整数でエンコード
		const unsignedVarint = varint.encode(buf.length);
		// 先に長さとcidを書き込み
		writeFileSync(this.path, Buffer.from(unsignedVarint), { flag: "a" });
		writeFileSync(this.path, cid.bytes, { flag: "a" });
		// 現在のブロックの開始位置を保存
		const offset = readFileSync(this.path).length;
		// 次にcid + コンテンツを書き込み
		writeFileSync(this.path, contents, { flag: "a" });
		// ブロックの開始地点と長さをindexに保存
		this.index.set(cid.toString(), { offset: offset, length: contents.length });
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

export const store = new CarSyncStore("./store/repo.car", []);

export function readBlock(cid: Uint8Array) {
	const parsed = CID.decode(cid);
	const out: Uint8Array[] = [];
	store.readBlock(parsed, out);
	return out[0];
}

export function writeBlock(codec: number, hash: number, contents: Uint8Array) {
	return store.writeBlock(Number(codec), Number(hash), contents);
}
