import { contextBridge, ipcRenderer } from "electron";

export type PolkaAPI = {
	setDomain(domain: string): Promise<boolean>;
	getDomain(): Promise<string>;
	parseMd(md: string): Promise<string>;
	did(): Promise<string>;
	init(): Promise<boolean>;
	create(rpath: string, data: Record<string, unknown>): Promise<boolean>;
	update(rpath: string, data: Record<string, unknown>): Promise<boolean>;
	delete(rpath: string): Promise<boolean>;
	commit(): Promise<boolean>;
	getRecord(
		rpath: string,
	): Promise<{ rpath: string; data: Record<string, unknown> } | null>;
	getRecords(
		nsid: string,
		query?: Record<string, unknown>,
	): Promise<{ records: { rpath: string; data: Record<string, unknown> }[] }>;
	getKeys(
		nsid: string,
		query?: Record<string, unknown>,
	): Promise<{ keys: string[] }>;
	allRecords(): Promise<{
		records: { rpath: string; data: Record<string, unknown> }[];
	}>;
};

contextBridge.exposeInMainWorld("polka", {
	setDomain: (domain: string) => ipcRenderer.invoke("setDomain", domain),
	getDomain: () => ipcRenderer.invoke("getDomain"),
	parseMd: (md: string) => ipcRenderer.invoke("parseMd", md),
	did: () => ipcRenderer.invoke("did"),
	init: () => ipcRenderer.invoke("init"),
	create: (rpath: string, data: Record<string, unknown>) =>
		ipcRenderer.invoke("create", rpath, data),
	update: (rpath: string, data: Record<string, unknown>) =>
		ipcRenderer.invoke("update", rpath, data),
	delete: (rpath: string) => ipcRenderer.invoke("delete", rpath),
	commit: () => ipcRenderer.invoke("commit"),
	getRecord: (rpath: string) => ipcRenderer.invoke("getRecord", rpath),
	getRecords: (nsid: string, query?: Record<string, unknown>) =>
		ipcRenderer.invoke("getRecords", nsid, query),
	getKeys: (nsid: string, query?: Record<string, unknown>) =>
		ipcRenderer.invoke("getKeys", nsid, query),
	allRecords: () => ipcRenderer.invoke("allRecords"),
} satisfies PolkaAPI);
