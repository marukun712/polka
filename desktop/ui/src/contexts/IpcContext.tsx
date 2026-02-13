import {
	createContext,
	createResource,
	type ParentComponent,
	Show,
} from "solid-js";
import { IPCClient } from "../lib/ipc";

type IPCContextType = {
	did: string;
	client: IPCClient;
};

export const ipcContext = createContext<IPCContextType | null>(null);

const fetchClient = async () => {
	const client = new IPCClient();
	const did = await client.getDid();
	return { did, client };
};

export const IPCProvider: ParentComponent = (props) => {
	const [cli] = createResource(fetchClient);

	return (
		<Show when={cli()}>
			{(d) => (
				<ipcContext.Provider value={d()}>{props.children}</ipcContext.Provider>
			)}
		</Show>
	);
};
