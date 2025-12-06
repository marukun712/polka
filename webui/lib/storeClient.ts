export interface PostMetadata {
	id: string;
	did: string;
	nsid: string;
	rpath: string;
	sig: string;
	ptr: string | null;
	tag: { name: string }[];
	createdAt: string;
	updatedAt: string;
}

const STORE_SERVER_URL = "http://localhost:8000";

export async function fetchPosts(): Promise<PostMetadata[]> {
	const response = await fetch(
		`${STORE_SERVER_URL}/metadata/filter?nsid=polka.post`,
	);
	if (!response.ok) {
		throw new Error(`Failed to fetch posts: ${response.statusText}`);
	}
	return response.json();
}

export function connectToRelay(
	onConnect: () => void,
	onMessage: (post: PostMetadata) => void,
	onError: (error: Error) => void,
) {
	const wsUrl = STORE_SERVER_URL.replace(/^http/, "ws");
	const ws = new WebSocket(`${wsUrl}/ws/relay`);

	ws.onopen = () => {
		onConnect();
	};

	ws.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);
			const post: Partial<PostMetadata> = {
				did: data.did,
				nsid: data.nsid,
				rpath: data.rpath,
				sig: data.sig,
				ptr: data.ptr,
				tag: data.tag?.map((name: string) => ({ name })) || [],
			};
			onMessage(post as PostMetadata);
		} catch (error) {
			onError(error instanceof Error ? error : new Error(String(error)));
		}
	};

	ws.onerror = (event) => {
		console.error("WebSocket error:", event);
		onError(new Error("WebSocket connection error"));
	};

	ws.onclose = () => {
		console.log("WebSocket connection closed");
	};
}
