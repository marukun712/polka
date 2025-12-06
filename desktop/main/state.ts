import type { Repo } from "../api/dist/transpiled/interfaces/polka-repository-repo.js";
import type { CarSyncStore } from "../api/lib/blockstore";

export interface AppState {
	secretKey: string | null;
	didKey: string | null;
	domain: string | null;
	remoteUrl: string | null;
	repo: Repo | null;
	store: CarSyncStore | null;
}

export const appState: AppState = {
	secretKey: null,
	didKey: null,
	domain: null,
	remoteUrl: null,
	repo: null,
	store: null,
};
