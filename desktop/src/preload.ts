import { contextBridge, ipcRenderer } from "electron";

export type PolkaAPI = {
	setDomain(domain: string): Promise<boolean>;
	getDomain(): Promise<string>;
	did(): Promise<string>;
	init(): Promise<boolean>;
	create(rpath: string, data: string): Promise<boolean>;
	update(rpath: string, data: string): Promise<boolean>;
	delete(rpath: string): Promise<boolean>;
	commit(): Promise<boolean>;
};

contextBridge.exposeInMainWorld("polka", {
	setDomain: (domain: string) => ipcRenderer.invoke("setDomain", domain),
	getDomain: () => ipcRenderer.invoke("getDomain"),
	did: () => ipcRenderer.invoke("did"),
	init: () => ipcRenderer.invoke("init"),
	create: (rpath: string, data: string) =>
		ipcRenderer.invoke("create", rpath, data),
	update: (rpath: string, data: string) =>
		ipcRenderer.invoke("update", rpath, data),
	delete: (rpath: string) => ipcRenderer.invoke("delete", rpath),
	commit: () => ipcRenderer.invoke("commit"),
} satisfies PolkaAPI);
