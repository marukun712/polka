import type { PolkaAPI } from "../../../src/preload";

// IPC経由で直接ローカルのリポジトリ(自分のリポジトリ)を読み取る実装(高速)

declare global {
	interface Window {
		polka: PolkaAPI;
	}
}

export class IPCClient {
	async parseMd(md: string) {
		return await window.polka.parseMd(md);
	}

	async ad(tags: string[]) {
		return await window.polka.ad(tags);
	}

	async create(rpath: string, data: Record<string, unknown>) {
		return await window.polka.create(rpath, data);
	}

	async update(rpath: string, data: Record<string, unknown>) {
		return await window.polka.update(rpath, data);
	}

	async delete(rpath: string) {
		return await window.polka.delete(rpath);
	}

	async commit() {
		return await window.polka.commit();
	}

	async getDid() {
		return await window.polka.getDid();
	}

	async getCommit() {
		return await window.polka.getCommit();
	}

	async getRecord(rpath: string) {
		return await window.polka.getRecord(rpath);
	}

	async getRecords(nsid: string, query?: Record<string, unknown>) {
		return await window.polka.getRecords(nsid, query);
	}

	async getKeys(nsid: string, query?: Record<string, unknown>) {
		return await window.polka.getKeys(nsid, query);
	}

	async allRecords() {
		return await window.polka.allRecords();
	}
}

export function getDidWithKid() {
	return window.polka.getDidWithKid();
}

export function setDidWithKid(didWithKid: string) {
	return window.polka.setDidWithKid(didWithKid);
}
