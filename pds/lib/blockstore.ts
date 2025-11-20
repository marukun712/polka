import crypto from "node:crypto";
import fs from "node:fs/promises";
import { CarReader, CarWriter } from "@ipld/car";
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import * as Digest from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";
import type { repo } from "../dist/transpiled/repo";

export class BlockStore implements repo.Blockstore {
	private path: string;
	private blocks = new Map<string, Uint8Array>();
	private root: CID | null = null;
	private dirty = false;

	constructor(path: string) {
		this.path = path;
	}

	async initialize() {
		const bytes = await fs.readFile(this.path);
		const reader = await CarReader.fromBytes(bytes);

		this.root = (await reader.getRoots())[0] ?? null;
		for await (const { cid, bytes } of reader.blocks()) {
			this.blocks.set(cid.toString(), bytes);
		}
	}

	async flush() {
		if (!this.dirty) return;
		this.dirty = true;

		const roots = this.root ? [this.root] : [];
		const { writer, out } = CarWriter.create(roots);
		const chunks: Uint8Array[] = [];

		(async () => {
			for (const [cidStr, bytes] of this.blocks.entries()) {
				await writer.put({ cid: CID.parse(cidStr), bytes });
			}
			await writer.close();
		})();

		for await (const chunk of out) chunks.push(chunk);
		await fs.writeFile(this.path, Buffer.concat(chunks));
		this.dirty = false;
	}

	put(data: Uint8Array): string {
		const hashBytes = crypto.createHash("sha256").update(data).digest();
		const hash = Digest.create(sha256.code, hashBytes);
		const cid = CID.create(1, raw.code, hash);
		this.blocks.set(cid.toString(), data);
		this.flush();
		if (!this.root) this.root = cid;
		return cid.toString();
	}

	get(cid: string): Uint8Array {
		const data = this.blocks.get(cid);
		if (data === undefined) {
			throw new Error(`Block not found: ${cid}`);
		}
		return data;
	}

	getRoot(): string | null {
		return this.root?.toString() ?? null;
	}
}
