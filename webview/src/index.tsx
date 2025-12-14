/* @refresh reload */
import "./index.css";
import { render } from "solid-js/web";
import "solid-devtools";
import { Route, Router } from "@solidjs/router";
import { createContext, createResource, Show } from "solid-js";
import { DaemonClient } from "../lib/daemon";
import TopPage from "./Top";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const fetchDaemon = async () => {
	const daemon = await DaemonClient.init();
	if (!daemon) return null;
	const did = await daemon?.getDid();
	return { did, daemon };
};

const [daemon] = createResource(fetchDaemon);
export const daemonContext = createContext<{
	did: string;
	daemon: DaemonClient;
} | null>(null);

render(
	() => (
		<Show when={daemon()}>
			{(d) => (
				<daemonContext.Provider value={d()}>
					<Router>
						<Route path="/" component={TopPage} />
					</Router>
				</daemonContext.Provider>
			)}
		</Show>
	),
	root as HTMLElement,
);
