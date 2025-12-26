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
}

export function getDomain() {
	return window.polka.getDomain();
}

export function setDomain(domain: string) {
	return window.polka.setDomain(domain);
}
