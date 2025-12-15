import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export const POLKA_REPO_PATH = join(homedir(), ".polka/repo");
export const POLKA_CAR_PATH = join(POLKA_REPO_PATH, "polka", "repo.car");

function sh(cmd: string, cwd = POLKA_REPO_PATH) {
	return execSync(cmd, { cwd, stdio: "inherit" });
}

export function cloneRepository(remoteUrl: string) {
	sh(`git clone ${remoteUrl} ${POLKA_REPO_PATH}`, process.cwd());
}

export function pullRepository(path: string = POLKA_REPO_PATH) {
	sh(`git pull origin main`, path);
}

export function commitAndPush(message: string, path: string = POLKA_REPO_PATH) {
	sh(`git add .`, path);
	sh(`git commit -m "${message}"`, path);
	sh(`git push origin main`, path);
}

export function generateCommitMessage() {
	return new Date().toISOString();
}

export function existsRepository(path: string) {
	try {
		sh(`git rev-parse --is-inside-work-tree`, path);
		return true;
	} catch {
		return false;
	}
}
