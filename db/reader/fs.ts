import { CID } from "multiformats";
import { type BlockStoreReader, CidNotFound } from ".";

export class FsSyncStore implements BlockStoreReader {
	private readFile: (cid: string) => Uint8Array;

	constructor(readFile: (cid: string) => Uint8Array) {
		this.readFile = readFile;
	}

	open(): void {
		this.readFile("root");
	}

	readBlock(cid: CID, out: Uint8Array[]): void {
		const data = this.readFile(cid.toString());
		if (!data) throw new CidNotFound();
		out.length = 0;
		out.push(data);
	}

	getRoots(): CID[] {
		return [CID.decode(this.readFile("root"))];
	}
}
