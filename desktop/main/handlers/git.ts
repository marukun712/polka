import { ipcMain } from "electron";
import {
	cloneRepository,
	commitAndPush,
	existsRepository,
	generateCommitMessage,
	POLKA_REPO_PATH,
	pullRepository,
} from "../../api/lib/git";
import { appState } from "../state";

export function registerGitHandlers() {
	ipcMain.handle("polka:git:cloneRepo", async (_event, remoteUrl: string) => {
		try {
			await cloneRepository(remoteUrl);
			appState.remoteUrl = remoteUrl;
			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

	ipcMain.handle("polka:git:pullRepo", async () => {
		try {
			await pullRepository();
			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

	ipcMain.handle(
		"polka:git:commitAndPush",
		async (_event, message?: string) => {
			try {
				const commitMessage = message || generateCommitMessage();
				await commitAndPush(commitMessage);
				return {
					success: true,
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		},
	);

	ipcMain.handle("polka:git:checkRepoExists", async () => {
		try {
			const exists = existsRepository(POLKA_REPO_PATH);
			return {
				success: true,
				data: exists,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

	ipcMain.handle("polka:git:generateCommitMessage", async () => {
		try {
			const message = generateCommitMessage();
			return {
				success: true,
				data: message,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});
}
