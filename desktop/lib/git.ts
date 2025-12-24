import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CleanOptions, type SimpleGit, simpleGit } from "simple-git";

export const POLKA_REPO_PATH = join(homedir(), ".polka/repo");
export const POLKA_CAR_PATH = join(POLKA_REPO_PATH, "polka", "repo.car");

const git: SimpleGit = simpleGit(POLKA_REPO_PATH).clean(CleanOptions.FORCE);

export function pullRepository() {
	git.pull("origin", "main");
}

export function commitAndPush() {
	git.add(".");
	git.commit(new Date().toISOString());
	git.push("origin", "main");
}

export function existsRepository() {
	try {
		const exists = existsSync(join(POLKA_REPO_PATH, ".git"));
		return exists;
	} catch {
		return false;
	}
}
