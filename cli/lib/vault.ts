import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Decrypter } from "age-encryption";

const VAULT_PATH = join(homedir(), ".dmail", "vault.json");

export interface VaultKey {
	id: string;
	pk: string;
	sk: string;
	type: "Ed25519VerificationKey2020" | "X25519KeyAgreementKey2019";
}

export async function decryptVault(password: string): Promise<VaultKey[]> {
	if (!existsSync(VAULT_PATH)) {
		throw new Error("Vault not found at ~/.dmail/vault.json");
	}

	const encryptedData = readFileSync(VAULT_PATH);
	const decrypter = new Decrypter();
	decrypter.addPassphrase(password);
	const decrypted = await decrypter.decrypt(encryptedData, "text");
	const keys = JSON.parse(decrypted);

	if (!Array.isArray(keys)) {
		throw new Error("Invalid vault format: expected array");
	}

	return keys;
}

export function findKeyByKid(keys: VaultKey[], kid: string): VaultKey | null {
	return keys.find((k) => k.id === kid) || null;
}

export function parseDidWithKid(didString: string): {
	did: string;
	kid: string;
} {
	const parts = didString.split("#");
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		throw new Error("Invalid DID format. Expected: did:web:example.com#kid");
	}
	return { did: parts[0], kid: parts[1] };
}
