import type { BlockMap, ReadonlyBlockStore } from "@atcute/mst";

export class HTTPStorage implements ReadonlyBlockStore {
	baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	async get(cid: string): Promise<Uint8Array<ArrayBuffer> | null> {
		const res = await fetch(new URL(cid, this.baseUrl));
		if (!res.ok) return null;
		return new Uint8Array(await res.arrayBuffer());
	}

	async getMany(
		cids: string[],
	): Promise<{ found: BlockMap; missing: string[] }> {
		const blocks: BlockMap = new Map();
		const missing: string[] = [];
		for (const cid of cids) {
			const bytes = await this.get(cid);
			if (bytes) {
				blocks.set(cid, bytes);
			} else {
				missing.push(cid);
			}
		}
		return {
			found: blocks,
			missing,
		};
	}

	async has(cid: string): Promise<boolean> {
		try {
			const res = await fetch(new URL(cid, this.baseUrl), {
				method: "HEAD",
			});
			return res.ok;
		} catch {
			return false;
		}
	}

	async getRoot(): Promise<string | null> {
		const res = await fetch(new URL("ROOT", this.baseUrl));
		if (!res.ok) return null;
		const text = await res.text();
		return text;
	}
}

export default HTTPStorage;
