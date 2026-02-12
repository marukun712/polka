import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { type SimpleGit, simpleGit } from "simple-git";

export const POLKA_HOME_PATH = join(homedir(), ".polka");
export const POLKA_REPO_PATH = join(POLKA_HOME_PATH, "repo");
export const POLKA_BASE_PATH = join(POLKA_REPO_PATH, "polka");
export const POLKA_CAR_PATH = join(POLKA_BASE_PATH, "repo.car");
export const POLKA_DIST_PATH = join(POLKA_BASE_PATH, "dist");

// ~/.polka があるか確認
if (!existsSync(POLKA_HOME_PATH)) {
	mkdirSync(POLKA_HOME_PATH);
}

export async function cloneRepository(remoteUrl: string): Promise<void> {
	const git: SimpleGit = simpleGit();
	await git.clone(remoteUrl, POLKA_REPO_PATH);
}

export async function pullRepository(git: SimpleGit): Promise<void> {
	await git.pull("origin", "main");
}

export async function commitAndPush(git: SimpleGit): Promise<void> {
	await git.add(".");
	await git.commit(new Date().toISOString());
	await git.push("origin", "main");
}

export function existsRepository(): boolean {
	return existsSync(join(POLKA_REPO_PATH, ".git"));
}
