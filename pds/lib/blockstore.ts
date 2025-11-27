import { FsBlockstore } from "blockstore-fs";
import { CID } from "multiformats/cid";
import * as Raw from "multiformats/codecs/raw";
import * as Hasher from "multiformats/hashes/sha2";

async function uint8ArrayToCid(bytes: Uint8Array) {
	const hash = await Hasher.sha256.digest(bytes);
	const cid = CID.create(1, Raw.code, hash);
	return cid;
}
const store = new FsBlockstore("./store");

export function readBlock(bytes: Uint8Array) {
	uint8ArrayToCid(bytes).then((cid) => {
		store.get(cid);
	});
}

export function writeBlock(bytes: Uint8Array) {
	uint8ArrayToCid(bytes).then((cid) => {
		store.put(cid, bytes);
	});
}
