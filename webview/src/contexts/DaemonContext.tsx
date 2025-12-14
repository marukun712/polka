import {
	createContext,
	createResource,
	type ParentComponent,
	Show,
} from "solid-js";
import { DaemonClient } from "../lib/daemon";

type DaemonContextType = {
	did: string;
	daemon: DaemonClient;
} | null;

export const daemonContext = createContext<DaemonContextType>(null);

const fetchDaemon = async () => {
	const daemon = await DaemonClient.init();
	if (!daemon) return null;
	const did = await daemon.getDid();
	return { did, daemon };
};

export const DaemonProvider: ParentComponent = (props) => {
	const [daemon] = createResource(fetchDaemon);

	return (
		<Show when={daemon()}>
			{(d) => (
				<daemonContext.Provider value={d()}>
					{props.children}
				</daemonContext.Provider>
			)}
		</Show>
	);
};
