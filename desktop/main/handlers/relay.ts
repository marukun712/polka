import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { ipcMain } from "electron";

let ws: WebSocket | null = null;

interface Advertisement {
	did: string;
	nsid: string;
	rpath: string;
	ptr: string | null;
	tag: string[];
}

export function registerRelayHandlers() {
	ipcMain.handle(
		"polka:relay:publishPost",
		async (_event, ad: Advertisement, sk: string) => {
			try {
				// WebSocket接続がない場合は接続
				if (!ws || ws.readyState !== WebSocket.OPEN) {
					ws = new WebSocket("ws://localhost:8000/ws/");
					await new Promise((resolve, reject) => {
						if (!ws) {
							reject(new Error("WebSocket creation failed"));
							return;
						}
						ws.onopen = resolve;
						ws.onerror = reject;
					});
				}

				// 署名する
				const adBytes = new TextEncoder().encode(JSON.stringify(ad));
				const sig = secp256k1.sign(adBytes, hexToBytes(sk));
				const adSigned = {
					...ad,
					sig: bytesToHex(sig),
				};

				// wsに広告
				ws.send(JSON.stringify(adSigned));

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

	ipcMain.handle("polka:relay:connect", async () => {
		try {
			if (ws && ws.readyState === WebSocket.OPEN) {
				return { success: true };
			}

			ws = new WebSocket("ws://localhost:8000/ws/");
			await new Promise((resolve, reject) => {
				if (!ws) {
					reject(new Error("WebSocket creation failed"));
					return;
				}
				ws.onopen = resolve;
				ws.onerror = reject;
			});

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
}
