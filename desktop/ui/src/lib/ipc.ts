import type { PolkaAPI } from "../../../src/preload";

declare global {
	interface Window {
		polka: PolkaAPI;
	}
}

export class IPCClient {
	static async init() {
		await window.polka.init();
		return new IPCClient();
	}

	async ad(tags: string[]) {
		return await window.polka.ad(tags);
	}

	async parseMd(md: string) {
		return await window.polka.parseMd(md);
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
		return await window.polka.did();
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

export function getDomain() {
	return window.polka.getDomain();
}

export function setDomain(domain: string) {
	return window.polka.setDomain(domain);
}
