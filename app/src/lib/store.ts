import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";
import { safeStorage } from "electron";
import Store from "electron-store";

export default class SecretStore {
	store = new Store<Record<string, string>>({
		name: "polka-secret",
		watch: true,
	});

	constructor() {
		console.log("sk saved:", this.store.path);
	}

	set(sk: string) {
		const buffer = safeStorage.encryptString(sk);
		this.store.set("sk", bytesToHex(buffer));
	}

	get() {
		if (this.store.get("sk")) {
			const bytes = hexToBytes(this.store.get("sk"));
			const str = safeStorage.decryptString(Buffer.from(bytes));
			return str;
		} else {
			return null;
		}
	}
}
