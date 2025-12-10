import { fileURLToPath } from "node:url";
import { electronApp } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { generateCommitMessage } from "./lib/git";
import {
	createRecord,
	deleteRecord,
	gitCommitAndPush,
	type IpcResult,
	initRepository,
	updateRecord,
} from "./lib/repository";

function createWindow(): void {
	const mainWindow = new BrowserWindow({
		width: 900,
		height: 670,
		show: false,
		autoHideMenuBar: true,
		webPreferences: {
			preload: fileURLToPath(new URL("../preload/index.js", import.meta.url)),
			sandbox: false,
		},
	});

	mainWindow.on("ready-to-show", () => {
		mainWindow.show();
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: "deny" };
	});

	mainWindow.loadFile(fileURLToPath(new URL("../index.html", import.meta.url)));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// Set app user model id for windows
	electronApp.setAppUserModelId("com.electron");

	// Repository IPC handlers
	ipcMain.handle(
		"repo:init",
		async (_event, didKey: string): Promise<IpcResult> => {
			try {
				await initRepository(didKey);
				return { success: true, data: null };
			} catch {
				return {
					success: false,
					error: "An error has occured.",
				};
			}
		},
	);

	ipcMain.handle(
		"repo:create",
		async (_event, rpath: string, data: string): Promise<IpcResult> => {
			try {
				const cid = createRecord(rpath, data);
				const commitMessage = generateCommitMessage();
				await gitCommitAndPush(commitMessage);
				return { success: true, data: cid };
			} catch {
				return {
					success: false,
					error: "An error has occured.",
				};
			}
		},
	);

	ipcMain.handle(
		"repo:update",
		async (_event, rpath: string, data: string): Promise<IpcResult> => {
			try {
				const cid = updateRecord(rpath, data);
				const commitMessage = generateCommitMessage();
				await gitCommitAndPush(commitMessage);
				return { success: true, data: cid };
			} catch {
				return {
					success: false,
					error: "An error has occured.",
				};
			}
		},
	);

	ipcMain.handle(
		"repo:delete",
		async (_event, rpath: string): Promise<IpcResult> => {
			try {
				const result = deleteRecord(rpath);
				const commitMessage = generateCommitMessage();
				await gitCommitAndPush(commitMessage);
				return { success: true, data: result };
			} catch {
				return {
					success: false,
					error: "An error has occured.",
				};
			}
		},
	);

	createWindow();

	app.on("activate", () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
