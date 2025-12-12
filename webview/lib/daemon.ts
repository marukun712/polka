export class DaemonClient {
	url: string;

	constructor(url: string) {
		this.url = url;
	}

	static async init(did: string) {
		try {
			const res = await fetch("http://localhost:3030/health");
			if (!res.ok) {
				return null;
			}
			const didRes = await fetch("http://localhost:3030/did");
			const json = await didRes.json();
			if (json.did !== did) {
				return null;
			}
			return new DaemonClient("http://localhost:3030/");
		} catch {
			return null;
		}
	}

	async create(rpath: string, data: string) {
		const res = await fetch(new URL("record", this.url), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rpath, data }),
		});
		return await res.json();
	}

	async update(rpath: string, data: string) {
		const res = await fetch(new URL("record", this.url), {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rpath, data }),
		});
		return await res.json();
	}

	async delete(rpath: string) {
		console.log(rpath);
		const res = await fetch(new URL("record", this.url), {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rpath }),
		});
		return await res.json();
	}

	async commit() {
		const res = await fetch(new URL("commit", this.url), {
			method: "POST",
		});
		return await res.json();
	}
}
