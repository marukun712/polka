import { BlockMap, ReadableBlockstore } from "@atproto/repo";
import { CID } from "multiformats/cid";

export class HTTPStorage extends ReadableBlockstore {
	constructor(public baseUrl: URL) {
		super();
	}

	async getBytes(cid: CID): Promise<Uint8Array | null> {
		const res = await fetch(new URL(cid.toString(), this.baseUrl));
		if (!res.ok) return null;
		return new Uint8Array(await res.arrayBuffer());
	}

	async getBlocks(cids: CID[]): Promise<{ blocks: BlockMap; missing: CID[] }> {
		const blocks = new BlockMap();
		const missing: CID[] = [];
		for (const cid of cids) {
			const bytes = await this.getBytes(cid);
			if (bytes) {
				blocks.set(cid, bytes);
			} else {
				missing.push(cid);
			}
		}
		return {
			blocks,
			missing,
		};
	}

	async has(cid: CID): Promise<boolean> {
		try {
			const res = await fetch(new URL(cid.toString(), this.baseUrl), {
				method: "HEAD",
			});
			return res.ok;
		} catch {
			return false;
		}
	}

	async getRoot(): Promise<CID | null> {
		const res = await fetch(new URL("/root", this.baseUrl));
		if (!res.ok) return null;
		return CID.parse(await res.text());
	}
}

export default HTTPStorage;
