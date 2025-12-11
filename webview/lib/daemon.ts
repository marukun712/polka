export class DaemonClient {
	url: string;

	constructor(url: string) {
		this.url = url;
	}

	static async init() {
		const res = await fetch("http://localhost:3030/health");
		if (!res.ok) {
			return null;
		}
		return new DaemonClient("http://localhost:3030/");
	}

	async create(nsid: string, data: string) {
		const res = await fetch(`${this.url}/record`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ nsid, data }),
		});
		return await res.json();
	}

	async update(rpath: string, data: string) {
		const res = await fetch(`${this.url}/record`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rpath, data }),
		});
		return await res.json();
	}

	async delete(rpath: string) {
		const res = await fetch(`${this.url}/record`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rpath }),
		});
		return await res.json();
	}
}
