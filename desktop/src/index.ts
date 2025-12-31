import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";
import Store from "electron-store";
import { polkaRepo } from "../lib/repo.ts";

let polka: polkaRepo | null;

const createWindow = () => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: fileURLToPath(new URL("preload.cjs", import.meta.url)),
		},
	});

	win.loadFile("index.html");
};

app.whenReady().then(() => {
	const store = new Store();

	createWindow();

	ipcMain.handle("setDomain", (_, domain: string) => {
		store.set("domain", domain);
		return true;
	});

	ipcMain.handle("getDomain", () => {
		const domain = store.get("domain");
		if (!domain || typeof domain !== "string")
			throw new Error("Domain not found");
		return domain;
	});

	ipcMain.handle("did", () => {
		if (!polka) throw new Error("Polka not initialized");
		return polka.getDid();
	});

	ipcMain.handle("init", async () => {
		const domain = store.get("domain");
		if (!domain || typeof domain !== "string")
			throw new Error("Domain not found");
		polka = await polkaRepo.start(domain);
		return true;
	});

	ipcMain.handle(
		"create",
		async (_, rpath: string, data: Record<string, unknown>) => {
			if (!polka) throw new Error("Polka not initialized");
			await polka.create(rpath, data);
			return true;
		},
	);

	ipcMain.handle(
		"update",
		async (_, rpath: string, data: Record<string, unknown>) => {
			if (!polka) throw new Error("Polka not initialized");
			await polka.update(rpath, data);
			return true;
		},
	);

	ipcMain.handle("delete", async (_, rpath: string) => {
		if (!polka) throw new Error("Polka not initialized");
		await polka.delete(rpath);
		return true;
	});

	ipcMain.handle("commit", async () => {
		if (!polka) throw new Error("Polka not initialized");
		await polka.commit();
		return true;
	});

	ipcMain.handle("getRecord", async (_, rpath: string) => {
		if (!polka) throw new Error("Polka not initialized");
		return await polka.db.find(rpath);
	});

	ipcMain.handle(
		"getRecords",
		async (_, nsid: string, query?: Record<string, unknown>) => {
			if (!polka) throw new Error("Polka not initialized");
			return await polka.db.findMany(nsid, { query });
		},
	);

	ipcMain.handle(
		"getKeys",
		async (_, nsid: string, query?: Record<string, unknown>) => {
			if (!polka) throw new Error("Polka not initialized");
			return await polka.db.findKeys(nsid, { query });
		},
	);

	ipcMain.handle("allRecords", async () => {
		if (!polka) throw new Error("Polka not initialized");
		return await polka.db.all();
	});

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
