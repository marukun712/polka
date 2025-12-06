import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";
import { ipcMain } from "electron";
import { CID } from "multiformats";
import type { Repo } from "../../api/dist/transpiled/interfaces/polka-repository-repo.js";
import { instantiate } from "../../api/dist/transpiled/repo.js";
import { CarSyncStore } from "../../api/lib/blockstore";
import { POLKA_CAR_PATH } from "../../api/lib/git";
import { appState } from "../state";

export function registerRepoHandlers() {
	ipcMain.handle(
		"polka:repo:initRepo",
		async (_event, sk: string, didKey: string) => {
			try {
				// ~/.polkaがあるか確認
				if (!existsSync(join(homedir(), ".polka"))) {
					mkdirSync(join(homedir(), ".polka"));
				}

				const path = POLKA_CAR_PATH;
				const store = new CarSyncStore(path);

				// WASMのロード
				const loader = async (wasmPath: string) => {
					const buf = readFileSync(
						join(__dirname, "../api/dist/transpiled", wasmPath),
					);
					return await WebAssembly.compile(new Uint8Array(buf));
				};

				// importする関数をバインド
				const wasm = await instantiate(loader, {
					//@ts-expect-error
					"polka:repository/crypto": {
						sign: (bytes: Uint8Array) => {
							const skBytes = hexToBytes(sk);
							const sig = secp256k1.sign(bytes, skBytes);
							return sig;
						},
					},
					"polka:repository/blockstore": {
						readBlock: (cid: Uint8Array) => {
							const parsed = CID.decode(cid);
							const out: Uint8Array[] = [];
							store.readBlock(parsed, out);
							if (!out[0]) throw new Error("Block not found.");
							return out[0];
						},
						writeBlock: (codec: bigint, hash: bigint, contents: Uint8Array) => {
							return store.writeBlock(Number(codec), Number(hash), contents);
						},
					},
					...new WASIShim().getImportObject<"0.2.6">(),
				});

				let repo: Repo;

				// repoを開く
				if (existsSync(path)) {
					store.updateIndex();
					const roots = store.getRoots();
					if (!roots[0]) throw new Error("Root not found.");
					repo = wasm.repo.open(didKey, roots[0].toString());
				} else {
					store.create();
					repo = wasm.repo.create(didKey);
					const root = repo.getRoot();
					store.updateHeaderRoots([CID.parse(root)]);
				}

				// グローバルステートに保存
				appState.repo = repo;
				appState.store = store;
				appState.secretKey = sk;
				appState.didKey = didKey;

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

	ipcMain.handle(
		"polka:repo:createRecord",
		async (_event, rpath: string, data: string) => {
			try {
				if (!appState.repo || !appState.store) {
					throw new Error("Repository not initialized");
				}

				appState.repo.create(rpath, data);
				const root = appState.repo.getRoot();
				appState.store.updateHeaderRoots([CID.parse(root)]);

				return {
					success: true,
					data: { root },
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		},
	);

	ipcMain.handle("polka:repo:getRecord", async (_event, rpath: string) => {
		try {
			if (!appState.repo) {
				throw new Error("Repository not initialized");
			}

			const result = appState.repo.getRecord(rpath);

			return {
				success: true,
				data: {
					rpath: result.rpath,
					data: result.data,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});

	ipcMain.handle("polka:repo:allRecords", async () => {
		try {
			if (!appState.repo) {
				throw new Error("Repository not initialized");
			}

			const records = appState.repo.allRecords();

			return {
				success: true,
				data: records,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	});
}
