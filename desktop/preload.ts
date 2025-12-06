import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
	resolveDomain(domain: string) {
		return ipcRenderer.invoke("polka:identity:resolveDomain", domain);
	},

	generateKeyPair() {
		return ipcRenderer.invoke("polka:identity:generateKeyPair");
	},

	generateDidDocument(domain: string, didKey: string) {
		return ipcRenderer.invoke(
			"polka:identity:generateDidDocument",
			domain,
			didKey,
		);
	},

	cloneRepo(remoteUrl: string) {
		return ipcRenderer.invoke("polka:git:cloneRepo", remoteUrl);
	},

	pullRepo() {
		return ipcRenderer.invoke("polka:git:pullRepo");
	},

	commitAndPush(message?: string) {
		return ipcRenderer.invoke("polka:git:commitAndPush", message);
	},

	checkRepoExists() {
		return ipcRenderer.invoke("polka:git:checkRepoExists");
	},

	generateCommitMessage() {
		return ipcRenderer.invoke("polka:git:generateCommitMessage");
	},

	initRepo(sk: string, didKey: string) {
		return ipcRenderer.invoke("polka:repo:initRepo", sk, didKey);
	},

	createRecord(rpath: string, data: string) {
		return ipcRenderer.invoke("polka:repo:createRecord", rpath, data);
	},

	getRecord(rpath: string) {
		return ipcRenderer.invoke("polka:repo:getRecord", rpath);
	},

	allRecords() {
		return ipcRenderer.invoke("polka:repo:allRecords");
	},

	publishPost(
		ad: {
			did: string;
			nsid: string;
			rpath: string;
			ptr: string | null;
			tag: string[];
		},
		sk: string,
	) {
		return ipcRenderer.invoke("polka:relay:publishPost", ad, sk);
	},

	connectRelay() {
		return ipcRenderer.invoke("polka:relay:connect");
	},
});
