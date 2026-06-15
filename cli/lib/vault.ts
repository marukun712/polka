import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Decrypter, Encrypter } from "age-encryption";

const KEY_PATH = join(homedir(), ".polka", "key.age");

export async function saveKey(password: string, sk: string): Promise<void> {
	const encrypter = new Encrypter();
	encrypter.setPassphrase(password);
	const encrypted = await encrypter.encrypt(sk);
	writeFileSync(KEY_PATH, encrypted);
}

export async function loadKey(password: string): Promise<string> {
	if (!existsSync(KEY_PATH)) {
		throw new Error("Key not found at ~/.polka/key.age. Run: polka keys init");
	}
	const encrypted = readFileSync(KEY_PATH);
	const decrypter = new Decrypter();
	decrypter.addPassphrase(password);
	return decrypter.decrypt(encrypted, "text");
}
