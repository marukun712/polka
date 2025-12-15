import { load } from "@tauri-apps/plugin-store";

export async function setDomain(domain: string) {
	const store = await load("store.json");
	await store.set("domain", domain);
	await store.save();
}

export async function getDomain() {
	const store = await load("store.json");
	const domain = await store.get("domain");
	if (!domain || typeof domain !== "string") return null;
	return domain;
}
