import type { Commit } from "@atcute/repo";
import { contextBridge, ipcRenderer } from "electron";

export type PolkaAPI = {
	parseMd(md: string): Promise<string>;

	setDidWithKid(didWithKid: string): Promise<boolean>;
	getDidWithKid(): Promise<string | null>;

	ad(tags: string[]): Promise<boolean>;

	init(password: string): Promise<boolean>;

	create(rpath: string, data: Record<string, unknown>): Promise<boolean>;
	update(rpath: string, data: Record<string, unknown>): Promise<boolean>;
	delete(rpath: string): Promise<boolean>;
	commit(): Promise<boolean>;

	getCommit(): Promise<Commit>;
	getDid(): Promise<string>;

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
	parseMd: (md: string) => ipcRenderer.invoke("parseMd", md),

	setDidWithKid: (didWithKid: string) =>
		ipcRenderer.invoke("setDidWithKid", didWithKid),
	getDidWithKid: () => ipcRenderer.invoke("getDidWithKid"),

	ad: (tags: string[]) => ipcRenderer.invoke("ad", tags),

	init: (password: string) => ipcRenderer.invoke("init", password),

	create: (rpath: string, data: Record<string, unknown>) =>
		ipcRenderer.invoke("create", rpath, data),
	update: (rpath: string, data: Record<string, unknown>) =>
		ipcRenderer.invoke("update", rpath, data),
	delete: (rpath: string) => ipcRenderer.invoke("delete", rpath),
	commit: () => ipcRenderer.invoke("commit"),

	getDid: () => ipcRenderer.invoke("getDid"),
	getCommit: () => ipcRenderer.invoke("getCommit"),

	getRecord: (rpath: string) => ipcRenderer.invoke("getRecord", rpath),
	getRecords: (nsid: string, query?: Record<string, unknown>) =>
		ipcRenderer.invoke("getRecords", nsid, query),
	getKeys: (nsid: string, query?: Record<string, unknown>) =>
		ipcRenderer.invoke("getKeys", nsid, query),
	allRecords: () => ipcRenderer.invoke("allRecords"),
} satisfies PolkaAPI);
