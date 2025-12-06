declare global {
	interface Window {
		electron: {
			cloneRepo: (remoteUrl: string) => Promise<{
				success: boolean;
				error?: string;
			}>;

			pullRepo: () => Promise<{
				success: boolean;
				error?: string;
			}>;

			commitAndPush: (message?: string) => Promise<{
				success: boolean;
				error?: string;
			}>;

			checkRepoExists: () => Promise<{
				success: boolean;
				data?: boolean;
				error?: string;
			}>;

			generateCommitMessage: () => Promise<{
				success: boolean;
				data?: string;
				error?: string;
			}>;

			initRepo: (
				sk: string,
				didKey: string,
			) => Promise<{
				success: boolean;
				error?: string;
			}>;

			createRecord: (
				rpath: string,
				data: string,
			) => Promise<{
				success: boolean;
				data?: { root: string };
				error?: string;
			}>;

			getRecord: (rpath: string) => Promise<{
				success: boolean;
				data?: { rpath: string; data: string };
				error?: string;
			}>;

			allRecords: () => Promise<{
				success: boolean;
				data?: Array<{ rpath: string; data: string }>;
				error?: string;
			}>;

			publishPost: (
				ad: {
					did: string;
					nsid: string;
					rpath: string;
					ptr: string | null;
					tag: string[];
				},
				sk: string,
			) => Promise<{
				success: boolean;
				error?: string;
			}>;

			connectRelay: () => Promise<{
				success: boolean;
				error?: string;
			}>;
		};
	}
}

export const polkaIPC = {
	git: {
		cloneRepo: (remoteUrl: string) => window.electron.cloneRepo(remoteUrl),
		pullRepo: () => window.electron.pullRepo(),
		commitAndPush: (message?: string) => window.electron.commitAndPush(message),
		checkRepoExists: () => window.electron.checkRepoExists(),
		generateCommitMessage: () => window.electron.generateCommitMessage(),
	},

	repo: {
		initRepo: (sk: string, didKey: string) =>
			window.electron.initRepo(sk, didKey),
		createRecord: (rpath: string, data: string) =>
			window.electron.createRecord(rpath, data),
		getRecord: (rpath: string) => window.electron.getRecord(rpath),
		allRecords: () => window.electron.allRecords(),
	},

	relay: {
		publishPost: (
			ad: {
				did: string;
				nsid: string;
				rpath: string;
				ptr: string | null;
				tag: string[];
			},
			sk: string,
		) => window.electron.publishPost(ad, sk),
		connect: () => window.electron.connectRelay(),
	},
};
