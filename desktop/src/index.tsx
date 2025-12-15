/* @refresh reload */
import "./index.css";
import { render } from "solid-js/web";
import "solid-devtools";
import { Route, Router } from "@solidjs/router";
import { CacheProvider, DaemonProvider } from "./contexts";
import InspectorPage from "./pages/InspectorPage";
import TopPage from "./pages/TopPage";
import UserPage from "./pages/UserPage";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

export { daemonContext, feedCache, readerCache } from "./contexts";

render(
	() => (
		<DaemonProvider>
			<CacheProvider>
				<Router>
					<Route path="/" component={TopPage} />
					<Route path="/user" component={UserPage} />
					<Route path="/inspector" component={InspectorPage} />
				</Router>
			</CacheProvider>
		</DaemonProvider>
	),
	root as HTMLElement,
);
