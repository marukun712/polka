import { Command } from "@tauri-apps/plugin-shell";

export class CliClient {
	domain: string;

	constructor(domain: string) {
		this.domain = domain;
	}

	static async init(domain: string) {
		return new CliClient(domain);
	}

	async create(rpath: string, data: string) {
		const cmd = Command.sidecar("binaries/app", [
			this.domain,
			"record:create",
			rpath,
			data,
		]);
		const output = await cmd.execute();
		if (output.code !== 0) throw new Error(output.stderr);
		return true;
	}

	async update(rpath: string, data: string) {
		const cmd = Command.sidecar("binaries/app", [
			this.domain,
			"record:update",
			rpath,
			data,
		]);
		const output = await cmd.execute();
		if (output.code !== 0) throw new Error(output.stderr);
		return true;
	}

	async delete(rpath: string) {
		const cmd = Command.sidecar("binaries/app", [
			this.domain,
			"record:delete",
			rpath,
		]);
		const output = await cmd.execute();
		if (output.code !== 0) throw new Error(output.stderr);
		return true;
	}

	async commit() {
		const cmd = Command.sidecar("binaries/app", [this.domain, "commit"]);
		const output = await cmd.execute();
		if (output.code !== 0) throw new Error(output.stderr);
		return true;
	}

	async getDid() {
		const cmd = Command.sidecar("binaries/app", [this.domain, "did"]);
		const output = await cmd.execute();
		if (output.code !== 0) throw new Error(output.stderr);
		const json = JSON.parse(output.stdout);
		return json.did as string;
	}
}
