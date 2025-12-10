import { contextBridge, ipcRenderer } from "electron";

// Custom APIs for renderer
const api = {
	repo: {
		init: (didKey: string) => ipcRenderer.invoke("repo:init", didKey),
		create: (rpath: string, data: string) =>
			ipcRenderer.invoke("repo:create", rpath, data),
		update: (rpath: string, data: string) =>
			ipcRenderer.invoke("repo:update", rpath, data),
		delete: (rpath: string) => ipcRenderer.invoke("repo:delete", rpath),
	},
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("api", api);
	} catch (error) {
		console.error(error);
	}
} else {
	// @ts-expect-error (define in dts)
	window.api = api;
}
