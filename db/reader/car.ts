import { decode } from "@ipld/dag-cbor";
import { sha256 as createHash } from "@noble/hashes/sha2.js";
import { CID } from "multiformats";
import * as Digest from "multiformats/hashes/digest";
import varint from "varint";
import { type BlockStoreReader, CidNotFound, SHA2_256 } from ".";

export class CarReader implements BlockStoreReader {
	private data: Uint8Array;
	private roots: CID[];
	private index: Map<string, { offset: number; length: number }>;

	constructor(data: Uint8Array) {
		this.data = data;
		this.roots = [];
		this.index = new Map<string, { offset: number; length: number }>();
	}

	open() {
		this.index.clear();
		const data = this.data;
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
		const content = new Uint8Array(this.data).slice(
			block.offset,
			block.offset + block.length,
		);
		out.push(content);
	}

	getRoots() {
		return this.roots;
	}
}
